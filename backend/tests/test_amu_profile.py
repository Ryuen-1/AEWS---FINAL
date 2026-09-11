"""Profile persistence and email-change API tests using an isolated MongoDB double."""
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import mongomock
import pytest
from bson import ObjectId
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routers import users
from app.authz import create_access_token


@pytest.fixture(params=["amu-staff", "instructor", "admin"])
def account(monkeypatch, request):
    monkeypatch.setenv("AUTH_TOKEN_SECRET", "isolated-test-secret-for-email-change")
    db = mongomock.MongoClient().test
    oid = ObjectId()
    role = request.param
    db[users.get_collection_for_role(role)].insert_one({"_id": oid, "name": "Raul Lecaros", "email": "old@example.com", "role": role, "college": "College of Technology", "status": "active", "email_verified": True, "password_hash": "unchanged"})
    monkeypatch.setattr(users, "get_db", lambda: db)
    messages = []
    def send(email, code, name):
        messages.append((email, code))
        return True, None
    monkeypatch.setattr(users, "send_email_change_code", send)
    app = FastAPI()
    app.include_router(users.router, prefix="/api/users")
    client = TestClient(app)
    client.headers["Authorization"] = "Bearer " + create_access_token(user_id=str(oid), role=role)
    return client, db, oid, messages


def _collection(db, oid):
    _, name = users._find_user_by_id(db, str(oid))
    return db[name]


def test_profile_persists_separate_names_phone_and_photo(account):
    client, db, oid, _ = account
    photo = "data:image/png;base64,iVBORw0KGgo="
    response = client.patch(f"/api/users/{oid}", json={"first_name": "  Maria Ana ", "last_name": " De la Cruz ", "contact_number": "+639123456789", "profile_image": photo})
    assert response.status_code == 200
    fresh = client.get(f"/api/users/{oid}").json()
    assert fresh["name"] == "Maria Ana De la Cruz"
    assert fresh["first_name"] == "Maria Ana"
    assert fresh["last_name"] == "De la Cruz"
    assert fresh["contact_number"] == "+639123456789"
    assert fresh["profile_image"] == photo
    assert _collection(db, oid).find_one({"_id": oid})["password_hash"] == "unchanged"


@pytest.mark.parametrize("payload", [{"college": "Other"}, {"role": "admin"}, {"status": "inactive"}, {"email": "new@example.com"}, {"email": None}, {"first_name": " ", "last_name": "Name"}, {"profile_image": "data:image/svg+xml;base64,abc"}])
def test_protected_or_invalid_changes_are_rejected(account, payload):
    client, db, oid, _ = account
    assert client.patch(f"/api/users/{oid}", json=payload).status_code in (400, 403, 409)
    assert _collection(db, oid).find_one({"_id": oid})["email"] == "old@example.com"


def test_email_changes_only_after_valid_code_and_cannot_be_reused(account):
    client, db, oid, messages = account
    base = f"/api/users/{oid}/email-change"
    response = client.post(base, json={"email": "NEW@example.com"})
    assert response.status_code == 200
    assert messages[0][0] == "new@example.com"
    assert len(messages[0][1]) == 6
    stored = _collection(db, oid).find_one({"_id": oid})
    assert stored["email"] == "old@example.com" and stored["email_verified"] is True
    assert stored["email_change"]["code_hash"] != messages[0][1]
    assert "code_hash" not in client.get(base).text
    assert "email_change" not in client.get(f"/api/users/{oid}").json()
    wrong = "000000" if messages[0][1] != "000000" else "111111"
    assert client.post(base + "/verify", json={"email": "new@example.com", "code": wrong}).status_code == 400
    assert _collection(db, oid).find_one({"_id": oid})["email"] == "old@example.com"
    verified = client.post(base + "/verify", json={"email": "new@example.com", "code": messages[0][1]})
    assert verified.status_code == 200
    assert verified.json()["email"] == "new@example.com"
    assert verified.json()["email_verified"] is True
    assert "email_change" not in _collection(db, oid).find_one({"_id": oid})
    assert client.post(base + "/verify", json={"email": "new@example.com", "code": messages[0][1]}).status_code == 400


def test_expiry_attempt_limit_resend_and_cancel(account):
    client, db, oid, messages = account
    base = f"/api/users/{oid}/email-change"
    client.post(base, json={"email": "new@example.com"})
    assert client.post(base, json={"email": "new@example.com"}).status_code == 429
    wrong = "000000" if messages[-1][1] != "000000" else "111111"
    for _ in range(5):
        assert client.post(base + "/verify", json={"email": "new@example.com", "code": wrong}).status_code == 400
    assert client.post(base + "/verify", json={"email": "new@example.com", "code": messages[-1][1]}).status_code == 400
    _collection(db, oid).update_one({"_id": oid}, {"$set": {"email_change_last_requested": datetime.now(timezone.utc) - timedelta(minutes=2)}})
    assert client.post(base, json={"email": "other@example.com"}).status_code == 200
    assert client.post(base + "/verify", json={"email": "new@example.com", "code": messages[0][1]}).status_code == 400
    _collection(db, oid).update_one({"_id": oid}, {"$set": {"email_change.expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)}})
    assert client.get(base).json()["expires_in"] == 0
    assert client.post(base + "/verify", json={"email": "other@example.com", "code": messages[-1][1]}).status_code == 400
    assert client.delete(base).status_code == 204
    assert client.get(base).json()["email"] is None
    assert _collection(db, oid).find_one({"_id": oid})["email"] == "old@example.com"


def test_delivery_failure_leaves_email_active(account, monkeypatch):
    client, db, oid, _ = account
    monkeypatch.setattr(users, "send_email_change_code", lambda *args: (False, "SMTP unavailable"))
    assert client.post(f"/api/users/{oid}/email-change", json={"email": "new@example.com"}).status_code == 503
    stored = _collection(db, oid).find_one({"_id": oid})
    assert stored["email"] == "old@example.com" and stored["email_verified"] is True
    assert "email_change" not in stored


def test_duplicate_rechecked_at_confirmation(account):
    client, db, oid, messages = account
    base = f"/api/users/{oid}/email-change"
    db.admin.insert_one({"email": "TAKEN@example.com"})
    assert client.post(base, json={"email": "taken@example.com"}).status_code == 409
    client.post(base, json={"email": "new@example.com"})
    db.instructor.insert_one({"email": "NEW@example.com"})
    assert client.post(base + "/verify", json={"email": "new@example.com", "code": messages[-1][1]}).status_code == 409
    assert _collection(db, oid).find_one({"_id": oid})["email"] == "old@example.com"


def test_email_changes_require_signed_self_amu_session(account):
    client, db, oid, _ = account
    own_role = _collection(db, oid).find_one({"_id": oid})["role"]
    wrong_role = "admin" if own_role != "admin" else "instructor"
    base = f"/api/users/{oid}/email-change"
    client.headers.pop("Authorization")
    assert client.post(base, json={"email": "new@example.com"}, headers={"X-User-Id": str(oid), "X-User-Role": "amu-staff"}).status_code == 401
    for role, user_id in [(wrong_role, str(oid)), (own_role, str(ObjectId()))]:
        client.headers["Authorization"] = "Bearer " + create_access_token(user_id=user_id, role=role)
        assert client.post(base, json={"email": "new@example.com"}).status_code == 403
