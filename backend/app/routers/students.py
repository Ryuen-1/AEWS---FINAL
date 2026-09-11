from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Body
from pymongo import ReturnDocument
from pymongo.errors import ServerSelectionTimeoutError
import bcrypt
import secrets
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel

from app.authz import get_current_actor
from app.database import get_db
from app.email_sender import send_password_change_code
from app.schemas import StudentCreate, StudentResponse, StudentUpdate

router = APIRouter()
public_router = APIRouter()


class StudentLoginRequest(BaseModel):
    student_id: str
    password: str


class StudentPasswordCodeRequest(BaseModel):
    student_id: str


class StudentChangePasswordRequest(BaseModel):
    student_id: str
    current_password: str
    new_password: str
    verification_code: str


def _doc_to_response(doc) -> dict:
    try:
        out = {k: v for k, v in doc.items() if k != "_id"}
        out["id"] = str(doc["_id"])
        return out
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error converting document to response: {str(e)}")


def _student_name_sort_key(row: dict) -> tuple[str, str]:
    name = str(row.get("name") or row.get("student_name") or row.get("email") or row.get("id_number") or "").strip().lower()
    identifier = str(row.get("id_number") or row.get("student_id") or row.get("id") or "").strip().lower()
    return (name, identifier)


def _normalize_student_identifier(value: str | None) -> str:
    raw = str(value or "").strip()
    if raw.endswith(".0") and raw[:-2].isdigit():
        return raw[:-2]
    return raw


def _find_student_by_identifier(db, student_id: str):
    student_ident = _normalize_student_identifier(student_id)
    if not student_ident:
        return None
    return db.students.find_one(
        {
            "$or": [
                {"id_number": student_ident},
                {"student_id": student_ident},
                {"email": student_ident.lower()},
            ]
        }
    )


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _check_password(password: str, password_hash) -> bool:
    try:
        if isinstance(password_hash, str):
            password_hash = password_hash.encode("utf-8")
        return bcrypt.checkpw(password.encode("utf-8"), password_hash)
    except Exception:
        return False


def _to_iso(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


@public_router.post("/students/login")
def student_login(body: StudentLoginRequest):
    """Student login - accepts both student ID and email."""
    db = get_db()
    student_ident = _normalize_student_identifier(body.student_id)
    if not student_ident:
        raise HTTPException(status_code=400, detail="Student ID or email is required")
    
    # Try to find student by student ID or email
    student_doc = db.students.find_one(
        {
            "$or": [
                {"id_number": student_ident},
                {"email": student_ident.lower()},
            ]
        }
    )
    
    if not student_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    password_hash = student_doc.get("password_hash")
    if not password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    try:
        # Handle both string and bytes password hashes
        if isinstance(password_hash, str):
            password_hash = password_hash.encode("utf-8")
        if not bcrypt.checkpw(body.password.encode("utf-8"), password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Return student data
    return {
        "id": str(student_doc.get("_id")),
        "name": student_doc.get("name") or "",
        "email": student_doc.get("email") or "",
        "id_number": student_doc.get("id_number") or "",
        "student_id": student_doc.get("id_number") or student_ident,
    }


@public_router.get("/students/profile")
def get_public_student_profile(student_id: str):
    """Return profile data for the public student portal view."""
    db = get_db()
    student_ident = _normalize_student_identifier(student_id)
    if not student_ident:
        raise HTTPException(status_code=400, detail="student_id is required")

    student_doc = db.students.find_one(
        {
            "$or": [
                {"id_number": student_ident},
                {"student_id": student_ident},
            ]
        }
    )
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")

    return {
        "id": str(student_doc.get("_id")),
        "name": student_doc.get("name") or "",
        "email": student_doc.get("email") or "",
        "id_number": student_doc.get("id_number") or student_ident,
        "created_at": student_doc.get("created_at"),
        "password_changed_at": student_doc.get("password_changed_at"),
    }


@public_router.patch("/students/profile")
def update_public_student_profile(body: dict):
    """Update profile data for the public student portal view."""
    db = get_db()
    student_id = _normalize_student_identifier(body.get("student_id"))
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id is required")

    student_doc = db.students.find_one(
        {
            "$or": [
                {"id_number": student_id},
                {"student_id": student_id},
            ]
        }
    )
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")

    # Update allowed fields
    update_data = {}
    if body.get("name"):
        update_data["name"] = body["name"].strip()
    if body.get("email"):
        update_data["email"] = body["email"].strip().lower()
    if body.get("id_number"):
        update_data["id_number"] = body["id_number"].strip()

    if update_data:
        db.students.update_one(
            {"_id": student_doc["_id"]},
            {"$set": update_data}
        )

    # Return updated profile
    updated_doc = db.students.find_one({"_id": student_doc["_id"]})
    return {
        "id": str(updated_doc.get("_id")),
        "name": updated_doc.get("name") or "",
        "email": updated_doc.get("email") or "",
        "id_number": updated_doc.get("id_number") or student_id,
        "created_at": updated_doc.get("created_at"),
        "password_changed_at": updated_doc.get("password_changed_at"),
    }


@public_router.post("/students/password-change-code")
def request_student_password_change_code(body: StudentPasswordCodeRequest):
    """Send a short-lived verification code to the student's registered email before password change."""
    db = get_db()
    student_doc = _find_student_by_identifier(db, body.student_id)
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")
    if student_doc.get("email_verified") is not True:
        raise HTTPException(status_code=403, detail="Your student email must be verified before changing your password.")
    email = (student_doc.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="No email address is connected to this student account.")

    code = f"{secrets.randbelow(1_000_000):06d}"
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.students.update_one(
        {"_id": student_doc["_id"]},
        {
            "$set": {
                "password_change": {
                    "code": code,
                    "expires": expires,
                    "requested_at": datetime.now(timezone.utc),
                }
            }
        },
    )
    sent, error = send_password_change_code(email, code, student_doc.get("name") or "Student")
    if not sent:
        raise HTTPException(status_code=503, detail=error or "Unable to send verification code.")
    return {"message": "Verification code sent to your registered email."}


@public_router.post("/students/change-password")
def change_public_student_password(body: StudentChangePasswordRequest):
    """Change student password after current-password and email-code verification."""
    db = get_db()
    student_doc = _find_student_by_identifier(db, body.student_id)
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")
    if student_doc.get("email_verified") is not True:
        raise HTTPException(status_code=403, detail="Your student email must be verified before changing your password.")

    password_hash = student_doc.get("password_hash")
    if not password_hash or not _check_password(body.current_password, password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    new_password = (body.new_password or "").strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
    if body.current_password == new_password:
        raise HTTPException(status_code=400, detail="New password must be different from the current password.")

    password_change = student_doc.get("password_change") or {}
    saved_code = str(password_change.get("code") or "").strip()
    submitted_code = str(body.verification_code or "").strip()
    expires = password_change.get("expires")
    now = datetime.now(timezone.utc)
    if not saved_code or not submitted_code or saved_code != submitted_code:
        raise HTTPException(status_code=400, detail="Verification code is incorrect.")
    if expires:
        if getattr(expires, "tzinfo", None) is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < now:
            raise HTTPException(status_code=400, detail="Verification code has expired. Request a new code.")

    db.students.update_one(
        {"_id": student_doc["_id"]},
        {
            "$set": {
                "password_hash": _hash_password(new_password),
                "password_changed_at": now,
            },
            "$unset": {"password_change": ""},
        },
    )
    return {"message": "Password changed successfully."}


@public_router.get("/students/dashboard")
def get_public_student_dashboard(student_id: str):
    """Return dashboard data for the public student portal view."""
    db = get_db()
    student_ident = _normalize_student_identifier(student_id)
    if not student_ident:
        raise HTTPException(status_code=400, detail="student_id is required")

    student_doc = db.students.find_one(
        {
            "$or": [
                {"id_number": student_ident},
                {"student_id": student_ident},
            ]
        }
    )
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")

    enrollments = list(
        db.enrollments.find(
            {
                "$or": [
                    {"student_id": student_ident},
                    {"id_number": student_ident},
                ]
            }
        )
    )

    classes_out = []
    referrals_out = []

    for enrollment in enrollments:
        class_doc = None
        class_id = str(enrollment.get("class_id") or "").strip()
        if ObjectId.is_valid(class_id):
            class_doc = db.classes.find_one({"_id": ObjectId(class_id)})
        
        # Skip archived classes entirely - don't show in classes or referrals
        if class_doc and class_doc.get("status") == "archived":
            continue

        class_item = {
            "id": class_id or str(enrollment.get("_id")),
            "subject_code": (class_doc or {}).get("subject_code") or enrollment.get("subject_code") or "",
            "subject_name": (class_doc or {}).get("subject_name") or enrollment.get("subject_name") or "",
            "section_code": (class_doc or {}).get("section_code") or enrollment.get("section_code") or "",
        }
        classes_out.append(class_item)

        # Only include referrals from non-archived classes
        if enrollment.get("flagged_for_mentoring") is True:
            invitation = enrollment.get("needs_assessment_invitation") or {}
            verdict = enrollment.get("amu_final_verdict") or {}
            
            # Build support routing display text
            support_routing_display = None
            if verdict and verdict.get("action"):
                action = verdict.get("action")
                action_labels = {
                    "mentoring": "You are referred to Mentoring",
                    "counselling": "You are referred to Counselling",
                    "both_mentoring_and_counselling": "You are referred to both Mentoring and Counselling",
                    "monitoring_only": "You are under Monitoring Only",
                    "other_support": "You are referred to Other Support",
                }
                support_routing_display = action_labels.get(action, action.replace("_", " ").title())
            
            referrals_out.append(
                {
                    "id": str(enrollment.get("_id")),
                    "subject_code": class_item["subject_code"],
                    "subject_name": class_item["subject_name"],
                    "section_code": class_item["section_code"],
                    "referred_at": _to_iso(enrollment.get("referred_at")),
                    "assigned_amu_staff_name": enrollment.get("assigned_amu_staff_name"),
                    "assigned_amu_staff_college": enrollment.get("assigned_amu_staff_college"),
                    "referring_instructors": enrollment.get("referring_instructors", []),
                    "referring_classes": enrollment.get("referring_classes", []),
                    "referral_history": enrollment.get("referral_history", []),
                    # Backward compatibility - keep single fields for existing records
                    "referring_instructor_id": enrollment.get("referring_instructor_id"),
                    "referring_class_id": enrollment.get("referring_class_id"),
                    "referring_class_code": enrollment.get("referring_class_code"),
                    "referring_class_name": enrollment.get("referring_class_name"),
                    "needs_assessment_token": invitation.get("token"),
                    "has_needs_assessment": bool(enrollment.get("needs_assessment")),
                    "needs_assessment": enrollment.get("needs_assessment") or {},
                    "support_routing": support_routing_display,
                    "support_routing_action": verdict.get("action") if verdict else None,
                    "support_routing_saved_at": _to_iso(verdict.get("saved_at")) if verdict else None,
                    "support_routing_saved_by": verdict.get("saved_by_name") if verdict else None,
                }
            )

    pending = sum(1 for r in referrals_out if not r.get("has_needs_assessment"))
    completed = sum(1 for r in referrals_out if r.get("has_needs_assessment"))

    return {
        "student": {
            "id": str(student_doc.get("_id")),
            "name": student_doc.get("name") or "",
            "email": student_doc.get("email") or "",
            "id_number": student_doc.get("id_number") or student_ident,
        },
        "stats": {
            "total_classes": len(classes_out),
            "total_referrals": len(referrals_out),
            "pending_needs_assessments": pending,
            "completed_needs_assessments": completed,
        },
        "classes": classes_out,
        "referrals": referrals_out,
    }


@router.get("", response_model=list[StudentResponse])
def list_students(search: str | None = None, actor: dict = Depends(get_current_actor)):
    if actor["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    q = {}
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    cursor = db.students.find(q)
    return sorted([_doc_to_response(d) for d in cursor], key=_student_name_sort_key)


@router.get("/referred")
def list_referred_students(search: str | None = None, actor: dict = Depends(get_current_actor)):
    """List verified student accounts with login credentials for admin view."""
    if actor["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    q = {
        "email_verified": True,
        "password_hash": {"$exists": True, "$nin": ["", None]},
    }
    if search:
        q["$and"] = [
            {
                "$or": [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"email": {"$regex": search, "$options": "i"}},
                    {"id_number": {"$regex": search, "$options": "i"}},
                ]
            }
        ]
    cursor = db.students.find(q)
    return sorted([_doc_to_response(d) for d in cursor], key=_student_name_sort_key)


@router.get("/{student_id}")
def get_student(student_id: str, actor: dict = Depends(get_current_actor)):
    try:
        if actor["role"] != "admin":
            raise HTTPException(status_code=403, detail="Forbidden")
        db = get_db()
        
        # Try to find by ObjectId first
        if ObjectId.is_valid(student_id):
            doc = db.students.find_one({"_id": ObjectId(student_id)})
            if doc:
                return _doc_to_response(doc)
        
        # If not found by ObjectId, try to find by other fields
        doc = db.students.find_one({
            "$or": [
                {"id_number": student_id},
                {"email": student_id},
                {"_id": student_id}
            ]
        })
        
        if not doc:
            raise HTTPException(status_code=404, detail="Student not found")
        return _doc_to_response(doc)
    except HTTPException:
        raise
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", status_code=201)
def create_student(body: StudentCreate, actor: dict = Depends(get_current_actor)):
    try:
        if actor["role"] != "admin":
            raise HTTPException(status_code=403, detail="Forbidden")
        db = get_db()
        doc = body.model_dump()
        result = db.students.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _doc_to_response(doc)
    except HTTPException:
        raise
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.patch("/{student_id}")
def update_student(student_id: str, body: StudentUpdate, actor: dict = Depends(get_current_actor)):
    try:
        if actor["role"] != "admin":
            raise HTTPException(status_code=403, detail="Forbidden")
        db = get_db()
        if not ObjectId.is_valid(student_id):
            raise HTTPException(status_code=404, detail="Student not found")
        payload = body.model_dump(exclude_unset=True)
        result = db.students.find_one_and_update(
            {"_id": ObjectId(student_id)},
            {"$set": payload},
            return_document=ReturnDocument.AFTER,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Student not found")
        return _doc_to_response(result)
    except HTTPException:
        raise
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: str, actor: dict = Depends(get_current_actor)):
    if actor["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    db = get_db()
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=404, detail="Student not found")
    result = db.students.delete_one({"_id": ObjectId(student_id)})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Student not found")
