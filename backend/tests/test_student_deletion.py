import sys
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import mongomock
import pytest
from bson import ObjectId
from fastapi import HTTPException
from app.routers import students, classes


def test_deleting_student_removes_related_records_across_classes(monkeypatch):
    db = mongomock.MongoClient().test
    student_id = db.students.insert_one({'name': 'Student', 'email': 'student@example.com', 'id_number': '00123'}).inserted_id
    other_id = db.students.insert_one({'name': 'Student', 'email': 'other@example.com', 'id_number': '124'}).inserted_id
    db.enrollments.insert_many([
        {'class_id': 'class1', 'student_email': 'STUDENT@example.com', 'flagged_for_mentoring': True,
         'needs_assessment': {'financial_difficulties': True}, 'needs_assessment_invitation': {'token': 'old-token'},
         'referral_emails_sent': {'combined_referral': 'sent'}, 'amu_final_verdict': {'action': 'support'}},
        {'class_id': 'class2', 'student_id': '00-123', 'midterm_grade': 3.0, 'attendance': 70},
        {'class_id': 'class3', 'id_number': 123, 'referral_history': [{'source': 'automatic_academic'}]},
        {'class_id': 'class4', 'needs_assessment_invitation': {'email': 'student@example.com', 'token': 'other-old-token'}},
        {'class_id': 'class1', 'student_name': 'Student', 'student_id': '124', 'student_email': 'other@example.com'},
        {'class_id': 'class1', 'student_name': 'Student'},
    ])
    db.classes.insert_one({'subject_code': 'SHARED'})
    db.activity_logs.insert_many([
        {'target_type': 'referral', 'target_id': 'class1::STUDENT@example.com'},
        {'target_type': 'referral', 'target_id': 'class2::00-123'},
        {'target_type': 'referral', 'target_id': 'class1::other@example.com'},
    ])
    db.refresh_tokens.insert_many([
        {'collection': 'students', 'user_id': str(student_id)},
        {'collection': 'students', 'user_id': str(other_id)},
    ])
    monkeypatch.setattr(students, 'get_db', lambda: db)
    students.delete_student(str(student_id), actor={'role': 'admin'})
    assert db.students.find_one({'_id': student_id}) is None
    assert db.students.find_one({'_id': other_id}) is not None
    assert db.enrollments.count_documents({}) == 2
    assert db.enrollments.count_documents({'needs_assessment_invitation.token': 'old-token'}) == 0
    assert db.enrollments.count_documents({'needs_assessment_invitation.token': 'other-old-token'}) == 0
    assert db.activity_logs.count_documents({}) == 1
    assert db.refresh_tokens.count_documents({}) == 1
    assert db.classes.count_documents({}) == 1

    # Reintroducing this student creates a fresh account with no old referral state.
    monkeypatch.setattr(classes, '_hash_password', lambda value: 'hashed')
    new_enrollment = {'class_id': 'class1', 'student_id': '123', 'student_name': 'Student', 'student_email': 'student@example.com'}
    new_enrollment['_id'] = db.enrollments.insert_one(new_enrollment).inserted_id
    email, password, is_new = classes._ensure_student_account(db, new_enrollment)
    assert is_new and password
    assert db.students.find_one({'email': email})['_id'] != student_id
    assert not db.enrollments.find_one({'_id': new_enrollment['_id']}).get('referral_emails_sent')


@pytest.mark.parametrize('profile', [{}, {'name': 'Same Name'}, {'email': '', 'id_number': ''}])
def test_empty_identifiers_never_delete_other_students(monkeypatch, profile):
    db = mongomock.MongoClient().test
    student_id = db.students.insert_one(profile).inserted_id
    db.enrollments.insert_many([{'student_name': 'Same Name'}, {'student_email': ''}, {'student_id': None}])
    monkeypatch.setattr(students, 'get_db', lambda: db)
    students.delete_student(str(student_id), actor={'role': 'admin'})
    assert db.enrollments.count_documents({}) == 3


@pytest.mark.parametrize('role', ['instructor', 'amu-staff', 'student'])
def test_only_admin_can_delete_student(monkeypatch, role):
    get_db = Mock()
    monkeypatch.setattr(students, 'get_db', get_db)
    with pytest.raises(HTTPException) as error:
        students.delete_student(str(ObjectId()), actor={'role': role})
    assert error.value.status_code == 403
    get_db.assert_not_called()


def test_missing_student_does_not_delete_any_enrollment(monkeypatch):
    db = mongomock.MongoClient().test
    db.enrollments.insert_one({'student_id': '123'})
    monkeypatch.setattr(students, 'get_db', lambda: db)
    with pytest.raises(HTTPException) as error:
        students.delete_student(str(ObjectId()), actor={'role': 'admin'})
    assert error.value.status_code == 404
    assert db.enrollments.count_documents({}) == 1


def test_deletion_follows_old_email_and_id_aliases_across_classes(monkeypatch):
    db = mongomock.MongoClient().test
    student_id = db.students.insert_one({'id_number': '123', 'email': 'current@example.com'}).inserted_id
    db.enrollments.insert_many([
        {'class_id': 'one', 'student_id': '123', 'student_email': 'old@example.com'},
        {'class_id': 'two', 'student_email': 'old@example.com', 'id_number': '456'},
        {'class_id': 'three', 'student_id': '456'},
        {'class_id': 'four', 'student_email': 'unrelated@example.com', 'student_id': '789'},
    ])
    monkeypatch.setattr(students, 'get_db', lambda: db)
    students.delete_student(str(student_id), actor={'role': 'admin'})
    assert db.enrollments.count_documents({}) == 1
    assert db.enrollments.find_one({})['student_id'] == '789'


def test_failed_cleanup_leaves_enrollments_and_account_available_for_retry(monkeypatch):
    db = mongomock.MongoClient().test
    student_id = db.students.insert_one({'email': 'student@example.com'}).inserted_id
    db.enrollments.insert_one({'class_id': 'one', 'student_email': 'student@example.com'})
    monkeypatch.setattr(students, 'get_db', lambda: db)
    delete_logs = db.activity_logs.delete_many
    monkeypatch.setattr(db.activity_logs, 'delete_many', Mock(side_effect=RuntimeError('Database interrupted')))
    with pytest.raises(RuntimeError):
        students.delete_student(str(student_id), actor={'role': 'admin'})
    assert db.students.find_one({'_id': student_id}) is not None
    assert db.enrollments.count_documents({}) == 1
    monkeypatch.setattr(db.activity_logs, 'delete_many', delete_logs)
    students.delete_student(str(student_id), actor={'role': 'admin'})
    assert db.students.count_documents({}) == 0
    assert db.enrollments.count_documents({}) == 0
