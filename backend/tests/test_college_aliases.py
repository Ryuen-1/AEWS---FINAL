import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import mongomock
import pytest
from app.routers import classes, admin, users
from app.schemas import SignUpRequest
from app.colleges import normalize_college
from app.colleges import COLLEGES
from app.referral_assignments import reconcile_referral_assignments


@pytest.mark.parametrize('name', ['College of Technology', 'College of Technologies', ' college OF TECHNOLOGY ', 'College  of  Technologies'])
def test_alias_is_accepted_at_registration(name):
    body = SignUpRequest(name='Instructor', email='user@example.com', password='password', college=name, role='instructor')
    assert body.college == 'College of Technologies'


@pytest.mark.parametrize('stored,requested', [
    ('College of Technology', 'College of Technologies'),
    ('College of Technologies', 'College of Technology'),
])
def test_referral_staff_assignment_matches_both_spellings(stored, requested):
    db = mongomock.MongoClient().test
    staff_id = db.amustaff.insert_one({'name': 'Staff', 'college': stored, 'status': 'active'}).inserted_id
    db.amustaff.insert_one({'name': 'Other Staff', 'college': 'College of Education', 'status': 'active'})
    assert classes._find_amu_staff_for_college(db, requested)['_id'] == staff_id


def test_reports_combine_legacy_and_current_college_records(monkeypatch):
    db = mongomock.MongoClient().test
    instructors = [
        {'college': 'College of Technology'},
        {'college': 'College of Technologies'},
        {'department': 'College of Technology'},
    ]
    ids = db.instructor.insert_many(instructors).inserted_ids
    db.instructor.insert_one({'college': 'College of Education'})
    for identifier in ids:
        class_id = db.classes.insert_one({'instructor_id': str(identifier)}).inserted_id
        db.enrollments.insert_one({'class_id': str(class_id), 'flagged_for_mentoring': True})
    monkeypatch.setattr(admin, 'get_db', lambda: db)
    for alias in ['College of Technology', 'College of Technologies']:
        assert set(admin._instructor_ids_by_department(db, alias)) == {str(identifier) for identifier in ids}
        rows = admin.list_departments_stats(alias)
        assert len(rows) == 1
        assert rows[0]['name'] == 'College of Technologies'
        assert rows[0]['instructors'] == 3
        assert rows[0]['total'] == 3
        assert rows[0]['atRisk'] == 3
    assert admin.list_instructor_departments().count('College of Technologies') == 1


def test_account_display_is_consistent_without_rewriting_legacy_records():
    profile = {'_id': 'sample', 'college': 'College of Technology'}
    assert users._user_doc_to_response(profile, 'instructor')['college'] == 'College of Technologies'
    assert profile['college'] == 'College of Technology'
    assert normalize_college('College of Education') == 'College of Education'


@pytest.mark.parametrize('college', COLLEGES)
def test_every_college_matches_format_variations_and_other_colleges_stay_separate(college):
    db = mongomock.MongoClient().test
    for other in COLLEGES:
        db.amustaff.insert_one({'college': other, 'name': other, 'status': 'active'})
    variant = '  ' + college.upper().replace(' ', '  ') + '  '
    assert normalize_college(variant) == college
    assert classes._find_amu_staff_for_college(db, variant)['college'] == college


def test_arts_ampersand_and_legacy_staff_department_are_supported():
    db = mongomock.MongoClient().test
    staff_id = db.amustaff.insert_one({'department': 'College of Arts & Sciences', 'status': 'active'}).inserted_id
    assert normalize_college('College of Arts & Sciences') == 'College of Arts and Sciences'
    assert classes._find_amu_staff_for_college(db, 'College of Arts and Sciences')['_id'] == staff_id


def test_existing_referrals_are_reassigned_to_the_correct_college_without_resending(monkeypatch):
    db = mongomock.MongoClient().test
    staff = {}
    for college in COLLEGES:
        stored = 'College of Technology' if college == 'College of Technologies' else college.lower()
        staff[college] = db.amustaff.insert_one({'name': college, 'college': stored, 'status': 'active'}).inserted_id
    for college in COLLEGES:
        instructor = db.instructor.insert_one({'college': college}).inserted_id
        course = db.classes.insert_one({'instructor_id': str(instructor)}).inserted_id
        db.enrollments.insert_one({
            'class_id': str(course), 'flagged_for_mentoring': True,
            'assigned_amu_staff_id': str(staff['College of Business']),
            'needs_assessment': {'notes': 'Preserve this'},
            'referral_emails_sent': {'combined_referral': 'already-sent'},
        })
    from unittest.mock import Mock
    send = Mock()
    monkeypatch.setattr(classes, 'send_combined_referral_email', send)
    assert reconcile_referral_assignments(db) == len(COLLEGES)
    for record in db.enrollments.find({}):
        college = record['assigned_amu_staff_college']
        assert record['assigned_amu_staff_id'] == str(staff[college])
        assert record['needs_assessment'] == {'notes': 'Preserve this'}
        assert record['referral_emails_sent']['combined_referral'] == 'already-sent'
    assert reconcile_referral_assignments(db) == 0
    send.assert_not_called()


@pytest.mark.parametrize('college', COLLEGES)
def test_valid_existing_staff_assignment_is_kept_on_later_uploads(college):
    db = mongomock.MongoClient().test
    db.amustaff.insert_one({'name': 'AAA Other Staff', 'college': college, 'status': 'active'})
    assigned = db.amustaff.insert_one({'name': 'ZZZ Assigned Staff', 'college': college.upper(), 'status': 'active'}).inserted_id
    assert classes._find_amu_staff_for_college(db, college, str(assigned))['_id'] == assigned


@pytest.mark.parametrize('state', [{'status': 'inactive'}, {'status': 'pending'}, {'archived': True}, {'college': 'College of Education'}])
def test_invalid_staff_assignment_is_replaced_with_eligible_staff(state):
    db = mongomock.MongoClient().test
    old = db.amustaff.insert_one({'name': 'Old Staff', 'college': 'College of Technology', 'status': 'active', **state}).inserted_id
    correct = db.amustaff.insert_one({'name': 'Active Staff', 'college': 'College of Technologies', 'status': 'active'}).inserted_id
    assert classes._find_amu_staff_for_college(db, 'College of Technology', str(old))['_id'] == correct


def test_no_staff_from_another_college_is_used_when_eligible_staff_is_missing():
    db = mongomock.MongoClient().test
    db.amustaff.insert_one({'name': 'Other Staff', 'college': 'College of Education', 'status': 'active'})
    assert classes._find_amu_staff_for_college(db, 'College of Technologies') is None
