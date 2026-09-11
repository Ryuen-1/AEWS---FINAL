import logging
import os
import re
import secrets
import hashlib
import hmac
import base64
import binascii
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Header
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.activity_log_utils import create_activity_log
from app.authz import ensure_self_or_admin, get_current_actor, _token_secret, decode_access_token
from app.database import get_db, get_collection_for_role, ROLE_COLLECTIONS
from app.email_sender import send_verification_email, send_email_change_code
from app.routers.auth import _hash_password
from app.schemas import UserCreate, UserResponse, UserUpdate, EmailChangeRequest, EmailChangeVerify

router = APIRouter()
log = logging.getLogger(__name__)


def _user_doc_to_response(doc, role: str) -> dict:
    out = {k: v for k, v in doc.items() if k not in {"_id", "password_hash", "email_change", "email_change_last_requested"}}
    out["id"] = str(doc["_id"])
    out["role"] = role
    # Ensure college field is always present
    if "college" not in out or not out.get("college"):
        out["college"] = out.get("department") or ""
    return out


def _find_user_by_id(db, user_id: str):
    """Return (doc, collection_name) if found in any role collection, else (None, None)."""
    if not ObjectId.is_valid(user_id):
        return None, None
    oid = ObjectId(user_id)
    for coll_name in ROLE_COLLECTIONS:
        doc = db[coll_name].find_one({"_id": oid})
        if doc:
            return doc, coll_name
    return None, None


def _profile_self(db, user_id, actor):
    if actor["role"] not in {"amu-staff", "instructor", "admin"} or actor["id"] != user_id:
        raise HTTPException(status_code=403, detail="Only your own account email can be changed here")
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    coll = db[get_collection_for_role(actor["role"])]
    doc = coll.find_one({"_id": ObjectId(user_id), "archived": {"$ne": True}})
    if not doc:
        raise HTTPException(status_code=403, detail="Account does not match the signed-in role")
    return coll, doc


def _email_change_actor(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in again to change your email")
    return decode_access_token(authorization[7:].strip())


@router.get("/{user_id}/email-change")
def email_change_status(user_id: str, actor: dict = Depends(_email_change_actor)):
    _, doc = _profile_self(get_db(), user_id, actor)
    challenge = doc.get("email_change")
    now = datetime.now(timezone.utc)
    if not challenge:
        return {"email": None}
    expires_in = max(0, int((challenge["expires_at"].replace(tzinfo=timezone.utc) - now).total_seconds()))
    resend_after = max(0, 60 - int((now - doc["email_change_last_requested"].replace(tzinfo=timezone.utc)).total_seconds()))
    return {"email": challenge["email"], "expires_in": expires_in, "resend_after": resend_after}


def _ensure_email_available(db, email, user_id):
    for coll_name in ROLE_COLLECTIONS:
        existing = db[coll_name].find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
        if existing and str(existing["_id"]) != user_id:
            raise HTTPException(status_code=409, detail="Email already registered")


def _email_code_hash(user_id, challenge_id, email, code):
    return hmac.new(_token_secret(), f"email-change:{user_id}:{challenge_id}:{email}:{code}".encode(), hashlib.sha256).hexdigest()


@router.post("/{user_id}/email-change")
def request_email_change(user_id: str, body: EmailChangeRequest, actor: dict = Depends(_email_change_actor)):
    db = get_db()
    coll, doc = _profile_self(db, user_id, actor)
    email = str(body.email).strip().lower()
    if email == str(doc.get("email", "")).lower():
        raise HTTPException(status_code=400, detail="Enter a different email address")
    _ensure_email_available(db, email, user_id)
    now = datetime.now(timezone.utc)
    last_request = doc.get("email_change_last_requested")
    if last_request and (now - last_request.replace(tzinfo=timezone.utc)).total_seconds() < 60:
        raise HTTPException(status_code=429, detail="Please wait 60 seconds before requesting another code")
    # MongoDB enforces uniqueness even if two confirmations in the same role race.
    try:
        coll.create_index("email", unique=True, name="amu_email_unique" if actor["role"] == "amu-staff" else "profile_email_unique", collation={"locale": "en", "strength": 2}, partialFilterExpression={"email": {"$type": "string"}})
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email changes are unavailable until duplicate account emails are resolved")
    code = f"{secrets.randbelow(1_000_000):06d}"
    challenge_id = secrets.token_urlsafe(24)
    challenge = {
        "id": challenge_id, "email": email,
        "code_hash": _email_code_hash(user_id, challenge_id, email, code),
        "expires_at": now + timedelta(minutes=10), "attempts": 0,
    }
    result = coll.update_one(
        {"_id": doc["_id"], "email": doc["email"], "email_change_last_requested": doc.get("email_change_last_requested")},
        {"$set": {"email_change": challenge, "email_change_last_requested": now}},
    )
    if not result.modified_count:
        raise HTTPException(status_code=409, detail="Another email request is in progress. Please try again shortly")
    sent, _ = send_email_change_code(email, code, doc.get("name", "User"))
    if not sent:
        coll.update_one({"_id": doc["_id"], "email_change.id": challenge_id}, {"$unset": {"email_change": ""}})
        raise HTTPException(status_code=503, detail="Unable to send the verification code. Your email has not changed. Try again in a minute")
    return {"message": "Verification code sent to your new email", "email": email, "expires_in": 600, "resend_after": 60}


@router.post("/{user_id}/email-change/verify", response_model=UserResponse)
def verify_email_change(user_id: str, body: EmailChangeVerify, actor: dict = Depends(_email_change_actor)):
    db = get_db()
    coll, doc = _profile_self(db, user_id, actor)
    email = str(body.email).strip().lower()
    now = datetime.now(timezone.utc)
    # Claim one attempt atomically; wrong and simultaneous guesses share the same limit.
    claimed = coll.find_one_and_update(
        {"_id": doc["_id"], "email_change.email": email, "email_change.expires_at": {"$gt": now}, "email_change.attempts": {"$lt": 5}},
        {"$inc": {"email_change.attempts": 1}}, return_document=ReturnDocument.AFTER,
    )
    if not claimed:
        raise HTTPException(status_code=400, detail="Code expired, unavailable, or attempt limit reached. Request a new code")
    challenge = claimed["email_change"]
    if not hmac.compare_digest(challenge["code_hash"], _email_code_hash(user_id, challenge["id"], email, body.code)):
        raise HTTPException(status_code=400, detail="Incorrect verification code")
    _ensure_email_available(db, email, user_id)
    try:
        result = coll.find_one_and_update(
            {"_id": doc["_id"], "email": doc["email"], "email_change.id": challenge["id"], "email_change.attempts": challenge["attempts"], "email_change.expires_at": {"$gt": datetime.now(timezone.utc)}},
            {"$set": {"email": email, "email_verified": True}, "$unset": {"email_change": "", "email_verification_token": "", "email_verification_expires": "", "password_reset_token": "", "password_reset_expires": ""}},
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email already registered")
    if not result:
        raise HTTPException(status_code=409, detail="The email request changed or expired. Request a new code")
    create_activity_log(db, actor_id=user_id, actor_name=result.get("name", "User"), role=actor["role"], action="update_profile", description="Verified and updated account email.", target_type="user", target_id=user_id, metadata={"changed_fields": ["email"]})
    return _user_doc_to_response(result, actor["role"])


@router.delete("/{user_id}/email-change", status_code=204)
def cancel_email_change(user_id: str, actor: dict = Depends(_email_change_actor)):
    coll, doc = _profile_self(get_db(), user_id, actor)
    coll.update_one({"_id": doc["_id"]}, {"$unset": {"email_change": ""}})


@router.get("", response_model=list[UserResponse])
def list_users(role: str | None = None, search: str | None = None, actor: dict = Depends(get_current_actor)):
    """List non-archived users. Archived users are excluded from system queries."""
    if actor["role"] != "admin":
        if role != "amu-staff" or search:
            raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    collections_to_query = (
        [get_collection_for_role(role)] if role and role != "all" else ROLE_COLLECTIONS
    )
    role_to_name = {"instructor": "instructor", "admin": "admin", "amustaff": "amu-staff"}
    out = []
    for coll_name in collections_to_query:
        q = {"archived": {"$ne": True}}
        if search and str(search).strip():
            q = {
                "$and": [
                    {"archived": {"$ne": True}},
                    {"$or": [
                        {"name": {"$regex": search.strip(), "$options": "i"}},
                        {"email": {"$regex": search.strip(), "$options": "i"}},
                    ]},
                ]
            }
        for doc in db[coll_name].find(q):
            role_val = doc.get("role") or role_to_name.get(coll_name, coll_name)
            out.append(_user_doc_to_response(doc, role_val))
    return out


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, actor: dict = Depends(get_current_actor)):
    ensure_self_or_admin(actor, user_id)
    db = get_db()
    doc, _ = _find_user_by_id(db, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    role = doc.get("role", "instructor")
    return _user_doc_to_response(doc, role)


@router.post("", response_model=UserResponse, status_code=201)
def create_user(body: UserCreate, actor: dict = Depends(get_current_actor)):
    if actor["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    coll_name = get_collection_for_role(body.role)
    coll = db[coll_name]
    if coll.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = body.model_dump()
    password = doc.pop("password", None)
    if password:
        doc["password_hash"] = _hash_password(password)
    result = coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _user_doc_to_response(doc, body.role)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: str, body: UserUpdate, actor: dict = Depends(get_current_actor)):
    ensure_self_or_admin(actor, user_id)
    db = get_db()
    doc, coll_name = _find_user_by_id(db, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    payload = body.model_dump(exclude_unset=True)
    payload.pop("password", None)
    if actor["id"] == user_id:
        if set(payload) - {"name", "first_name", "last_name", "email", "contact_number", "profile_image"}:
            raise HTTPException(status_code=403, detail="Only name, phone number, photo, and verified email can be changed")
        if "contact_number" in payload:
            payload["contact_number"] = str(payload["contact_number"] or "").strip()
            if len(payload["contact_number"]) > 32:
                raise HTTPException(status_code=400, detail="Phone number must be at most 32 characters")
        image = payload.get("profile_image")
        if image and image != doc.get("profile_image"):
            try:
                if len(image) > 2_800_000:
                    raise ValueError()
                header, encoded = image.split(",", 1)
                if header not in {"data:image/png;base64", "data:image/jpeg;base64", "data:image/webp;base64"}:
                    raise ValueError()
                decoded = base64.b64decode(encoded, validate=True)
                valid_signature = (header == "data:image/png;base64" and decoded.startswith(b"\x89PNG\r\n\x1a\n")) or (header == "data:image/jpeg;base64" and decoded.startswith(b"\xff\xd8\xff")) or (header == "data:image/webp;base64" and decoded.startswith(b"RIFF") and decoded[8:12] == b"WEBP")
                if not valid_signature or len(decoded) > 2 * 1024 * 1024:
                    raise ValueError()
            except (ValueError, binascii.Error):
                raise HTTPException(status_code=400, detail="Choose a JPG, PNG, or WebP photo up to 2 MB")
    if "first_name" in payload or "last_name" in payload:
        first = str(payload.get("first_name") or "").strip()
        last = str(payload.get("last_name") or "").strip()
        if not first or not last:
            raise HTTPException(status_code=400, detail="First name and surname are required")
        payload.update(first_name=first, last_name=last, name=f"{first} {last}")
    elif "name" in payload:
        if not str(payload["name"] or "").strip():
            raise HTTPException(status_code=400, detail="Name is required")
        payload["name"] = payload["name"].strip()
        parts = payload["name"].rsplit(" ", 1)
        payload.update(first_name=parts[0], last_name=parts[1] if len(parts) > 1 else "")
    if actor["role"] != "admin":
        payload.pop("role", None)
        payload.pop("college", None)
        payload.pop("status", None)
    if "email" in payload and payload["email"] is None:
        raise HTTPException(status_code=400, detail="Email is required")
    new_email = payload.get("email")
    email_changed = False
    verification_link = None
    if new_email is not None:
        new_email = new_email.strip().lower()
        if not new_email:
            raise HTTPException(status_code=400, detail="Email is required")
        payload["email"] = new_email
        current_email = str(doc.get("email", "")).strip().lower()
        email_changed = new_email != current_email
        if email_changed and (actor["id"] == user_id or coll_name == get_collection_for_role("amu-staff")):
            raise HTTPException(status_code=409, detail="Verify your new email using a verification code before changing it")
        if email_changed:
            for other_coll_name in ROLE_COLLECTIONS:
                existing = db[other_coll_name].find_one({
                    "email": {"$regex": f"^{re.escape(new_email)}$", "$options": "i"}
                })
                if existing and existing["_id"] != doc["_id"]:
                    raise HTTPException(status_code=400, detail="Email already registered")
            token = secrets.token_urlsafe(32)
            expires = datetime.now(timezone.utc) + timedelta(hours=24)
            payload["email_verified"] = False
            payload["email_verification_token"] = token
            payload["email_verification_expires"] = expires
            payload.pop("status", None)
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
            verification_link = f"{frontend_url}/verify-email?token={token}"
            payload["password_reset_token"] = None
            payload["password_reset_expires"] = None
    result = db[coll_name].find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": payload},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    if email_changed and verification_link:
        sent, send_err = send_verification_email(result["email"], verification_link, result.get("name", "User"))
        if not sent:
            log.warning(
                "Verification email not sent after profile email change: %s. Link (dev): %s",
                send_err or "unknown",
                verification_link,
            )
    role = result.get("role", "instructor")
    response = _user_doc_to_response(result, role)
    if payload:
        create_activity_log(
            db,
            actor_id=actor["id"],
            actor_name=actor.get("name", "User"),
            role=actor["role"],
            action="update_profile" if actor["id"] == user_id else "update_user",
            description="Updated profile information." if actor["id"] == user_id else f"Updated user account for {result.get('name', 'user')}.",
            target_type="user",
            target_id=user_id,
            metadata={"changed_fields": sorted(payload.keys())},
        )
    if email_changed:
        response["requires_email_verification"] = True
        response["message"] = "Email updated. Check your new inbox to confirm it before your next sign in."
        if verification_link:
            response["verification_link"] = verification_link
    return response


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str, actor: dict = Depends(get_current_actor)):
    if actor["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    doc, coll_name = _find_user_by_id(db, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    result = db[coll_name].delete_one({"_id": ObjectId(user_id)})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="User not found")
