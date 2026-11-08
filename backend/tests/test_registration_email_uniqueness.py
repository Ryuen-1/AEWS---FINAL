import sys
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import mongomock
import pytest
from fastapi import HTTPException
from starlette.requests import Request
from app.routers import auth, users
from app.schemas import SignUpRequest, UserCreate, REGISTRATION_COLLEGES


@pytest.mark.parametrize('collection', ['instructor', 'amustaff', 'admin', 'students'])
@pytest.mark.parametrize('role', ['instructor', 'amu-staff', 'admin'])
@pytest.mark.parametrize('state', [
    {'email_verified': True, 'status': 'active'},
    {'email_verified': False, 'status': 'pending'},
    {'email_verified': False, 'status': 'inactive', 'archived': True},
])
def test_signup_rejects_used_email_across_all_roles(monkeypatch, collection, role, state):
    db = mongomock.MongoClient().test
    identifier = db[collection].insert_one({
        'email': ' Already.Used@Example.com ', 'name': 'Existing Person',
        'password_hash': 'original-password', **state,
    }).inserted_id
    original = db[collection].find_one({'_id': identifier})
    monkeypatch.setattr(auth, 'get_db', lambda: db)
    hash_password = Mock()
    monkeypatch.setattr(auth, '_hash_password', hash_password)
    body = SignUpRequest(name='New Person', email='already.used@example.com',
                         password='new-password', role=role, college=REGISTRATION_COLLEGES[0])
    request = Request({'type': 'http', 'method': 'POST', 'path': '/', 'headers': []})
    with pytest.raises(HTTPException) as error:
        auth.signup.__wrapped__(request=request, body=body)
    assert error.value.status_code == 400
    assert error.value.detail == 'this email is already used'
    assert db[collection].find_one({'_id': identifier}) == original
    assert sum(db[name].count_documents({}) for name in ['instructor', 'amustaff', 'admin', 'students']) == 1
    hash_password.assert_not_called()


def test_unused_email_registers_normally(monkeypatch):
    db = mongomock.MongoClient().test
    monkeypatch.setattr(auth, 'get_db', lambda: db)
    monkeypatch.setattr(auth, '_hash_password', lambda password: 'hashed')
    body = SignUpRequest(name='New Person', email='New.Person@example.com',
                         password='password', role='instructor', college=REGISTRATION_COLLEGES[0])
    request = Request({'type': 'http', 'method': 'POST', 'path': '/', 'headers': []})
    response = auth.signup.__wrapped__(request=request, body=body)
    assert response['pending_approval'] is True
    assert db.instructor.find_one({})['email'] == 'new.person@example.com'


@pytest.mark.parametrize('collection', ['instructor', 'amustaff', 'admin', 'students'])
def test_admin_account_creation_also_rejects_used_email(monkeypatch, collection):
    db = mongomock.MongoClient().test
    db[collection].insert_one({'email': 'USED@example.com'})
    monkeypatch.setattr(users, 'get_db', lambda: db)
    body = UserCreate(name='New Person', email='used@example.com', password='password',
                      role='instructor', college=REGISTRATION_COLLEGES[0])
    with pytest.raises(HTTPException) as error:
        users.create_user(body, actor={'role': 'admin'})
    assert error.value.detail == 'this email is already used'
