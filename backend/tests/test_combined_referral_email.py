import sys
import re
import smtplib
from email import message_from_string
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import mongomock
import bcrypt
import pytest
from app import email_sender
from app.routers import classes


@pytest.mark.parametrize('password', ['temporary<&password', None])
def test_one_message_contains_referral_assessment_and_account_access(monkeypatch, password):
    monkeypatch.setattr(email_sender, '_get_gmail_config', lambda: ('smtp.example.com', 587, 'sender', 'smtp-secret', 'sender@example.com'))
    smtp = MagicMock()
    monkeypatch.setattr(email_sender.smtplib, 'SMTP', smtp)
    assert email_sender.send_combined_referral_email(
        'student@example.com', 'Student <Name>', 'CS101', 'Programming', 'Staff Member',
        'https://example.com/needs-assessment/token', 'https://example.com/student-login', password,
    ) == (True, None)
    server = smtp.return_value.__enter__.return_value
    server.sendmail.assert_called_once()
    message = message_from_string(server.sendmail.call_args.args[2])
    plain, html = [part.get_payload(decode=True).decode('utf-8') for part in message.get_payload()]
    for content in [plain, html]:
        for expected in ['CS101', 'Programming', 'Staff Member', '/needs-assessment/token', '/student-login', 'student@example.com']:
            assert expected in content
        assert 'smtp-secret' not in content
    assert 'Student &lt;Name&gt;' in html
    if password:
        assert password in plain
        assert 'temporary&lt;&amp;password' in html
    else:
        assert 'existing student account password' in plain
        assert 'Password:' not in plain


@pytest.mark.parametrize('is_new', [True, False])
def test_referral_sends_once_and_keeps_assessment_link_valid(monkeypatch, is_new):
    db = mongomock.MongoClient().test
    identifier = db.enrollments.insert_one({'student_name': 'Student'}).inserted_id
    send = MagicMock(return_value=(True, None))
    monkeypatch.setattr(classes, 'send_combined_referral_email', send)
    doc = db.enrollments.find_one({'_id': identifier})
    for _ in range(2):
        classes._send_referral_emails(db, doc, {'subject_code': 'CS101'}, 'Staff', 'student@example.com', 'generated-password', is_new)
    send.assert_called_once()
    saved = db.enrollments.find_one({'_id': identifier})
    invitation = saved['needs_assessment_invitation']
    assert invitation['status'] == 'sent'
    assert send.call_args.kwargs['form_link'].endswith('/' + invitation['token'])
    assert send.call_args.kwargs['password'] == ('generated-password' if is_new else None)
    assert saved['referral_emails_sent']['combined_referral']
    assert 'password' not in invitation


def test_failed_delivery_is_not_marked_sent_and_reuses_link_on_retry(monkeypatch):
    db = mongomock.MongoClient().test
    identifier = db.enrollments.insert_one({'student_name': 'Student'}).inserted_id
    send = MagicMock(side_effect=[(False, 'SMTP unavailable'), (True, None)])
    monkeypatch.setattr(classes, 'send_combined_referral_email', send)
    doc = db.enrollments.find_one({'_id': identifier})
    args = (db, doc, {}, 'Staff', 'student@example.com', 'temporary', True)
    classes._send_referral_emails(*args)
    failed = db.enrollments.find_one({'_id': identifier})
    assert not failed.get('referral_emails_sent')
    assert failed['needs_assessment_invitation']['status'] == 'pending'
    assert failed['needs_assessment_invitation']['last_error'] == 'SMTP unavailable'
    classes._send_referral_emails(*args)
    assert send.call_args_list[0].kwargs['form_link'] == send.call_args_list[1].kwargs['form_link']
    assert db.enrollments.find_one({'_id': identifier})['needs_assessment_invitation']['last_error'] is None


def test_completed_legacy_emails_are_not_resent(monkeypatch):
    db = mongomock.MongoClient().test
    identifier = db.enrollments.insert_one({'referral_emails_sent': {
        'referral_notice': 'sent', 'needs_assessment': 'sent', 'credentials': 'sent',
    }}).inserted_id
    send = MagicMock()
    monkeypatch.setattr(classes, 'send_combined_referral_email', send)
    classes._send_referral_emails(db, db.enrollments.find_one({'_id': identifier}), {}, 'Staff', 'student@example.com', None, False)
    send.assert_not_called()


def test_retry_after_account_creation_includes_working_credentials(monkeypatch):
    db = mongomock.MongoClient().test
    identifier = db.enrollments.insert_one({
        'student_name': 'Student', 'student_id': '123', 'student_email': 'student@example.com',
    }).inserted_id
    send = MagicMock(side_effect=[(False, 'SMTP unavailable'), (True, None)])
    monkeypatch.setattr(classes, 'send_combined_referral_email', send)
    monkeypatch.setattr(classes, '_hash_password', lambda value: 'hashed-' + value)
    passwords = iter(['first-password', 'retry-password'])
    monkeypatch.setattr(classes, '_generate_password', lambda: next(passwords))
    for expected in ['first-password', 'retry-password']:
        doc = db.enrollments.find_one({'_id': identifier})
        email, password, is_new = classes._ensure_student_account(db, doc)
        assert password == expected
        assert is_new is True
        classes._send_referral_emails(db, doc, {}, 'Staff', email, password, is_new)
    assert send.call_args.kwargs['password'] == 'retry-password'
    student = db.students.find_one({'email': 'student@example.com'})
    assert student['password_hash'] == 'hashed-retry-password'
    assert 'credentials_delivery_pending' not in student
    assert classes._ensure_student_account(db, doc) == ('student@example.com', '', False)
    assert db.students.find_one({'_id': student['_id']})['password_hash'] == 'hashed-retry-password'


def test_smtp_failure_and_completed_assessment_are_handled(monkeypatch):
    monkeypatch.setattr(email_sender, '_get_gmail_config', lambda: (None, 587, '', '', ''))
    assert email_sender.send_combined_referral_email('student@example.com', 'Student', '', '', 'Staff', 'form', 'login') == (False, 'Gmail not configured')
    db = mongomock.MongoClient().test
    identifier = db.enrollments.insert_one({'needs_assessment_invitation': {
        'token': 'existing-token', 'status': 'completed', 'submitted_at': 'already-submitted',
    }}).inserted_id
    send = MagicMock(return_value=(True, None))
    monkeypatch.setattr(classes, 'send_combined_referral_email', send)
    classes._send_referral_emails(db, db.enrollments.find_one({'_id': identifier}), {}, 'Staff', 'student@example.com', '', False)
    invitation = db.enrollments.find_one({'_id': identifier})['needs_assessment_invitation']
    assert invitation['status'] == 'completed'
    assert invitation['token'] == 'existing-token'
    assert invitation['submitted_at'] == 'already-submitted'


def test_full_referral_retries_failed_email_even_when_referral_is_unchanged(monkeypatch):
    db = mongomock.MongoClient().test
    staff_id = db.amustaff.insert_one({'name': 'Staff', 'college': 'College'}).inserted_id
    class_id = db.classes.insert_one({'subject_code': 'CS101', 'subject_name': 'Programming'}).inserted_id
    enrollment_id = db.enrollments.insert_one({
        'class_id': str(class_id), 'student_id': '123', 'student_email': 'student@example.com',
        'student_name': 'Student', 'midterm_grade': 3.0,
    }).inserted_id
    monkeypatch.setattr(classes, '_find_amu_staff_for_college', lambda *args: db.amustaff.find_one({'_id': staff_id}))
    monkeypatch.setattr(classes, 'create_notification', lambda *args, **kwargs: None)
    send = MagicMock(side_effect=[(False, 'SMTP unavailable'), (True, None)])
    monkeypatch.setattr(classes, 'send_combined_referral_email', send)
    course = db.classes.find_one({'_id': class_id})
    for _ in range(3):
        classes._apply_automatic_referral(db, course, db.enrollments.find_one({'_id': enrollment_id}))
    # First attempt fails, second retries despite unchanged referral, third skips.
    assert send.call_count == 2
    password = send.call_args.kwargs['password']
    assert password
    student = db.students.find_one({'email': 'student@example.com'})
    assert bcrypt.checkpw(password.encode(), student['password_hash'].encode())
    assert not student.get('credentials_delivery_pending')
    assert send.call_args_list[0].kwargs['form_link'] == send.call_args_list[1].kwargs['form_link']


def test_deleted_2201102063_gets_a_new_password_in_combined_email(monkeypatch):
    from app.routers import students
    db = mongomock.MongoClient().test
    old_id = db.students.insert_one({'email': '2201102063@student.buksu.edu.ph', 'id_number': '2201102063', 'password_hash': 'old'}).inserted_id
    db.enrollments.insert_one({'class_id': 'old-class', 'student_id': '2201102063', 'referral_emails_sent': {'credentials': 'old'}})
    monkeypatch.setattr(students, 'get_db', lambda: db)
    students.delete_student(str(old_id), {'role': 'admin'})
    doc = {'student_id': '2201102063', 'student_name': 'Student'}
    doc['_id'] = db.enrollments.insert_one(doc).inserted_id
    send = MagicMock(return_value=(True, None))
    monkeypatch.setattr(classes, 'send_combined_referral_email', send)
    classes._deliver_student_referral_email(db, doc, {}, 'Staff')
    password = send.call_args.kwargs['password']
    assert password
    account = db.students.find_one({'id_number': '2201102063'})
    assert account['_id'] != old_id
    assert bcrypt.checkpw(password.encode(), account['password_hash'].encode())
    assert account['credentials_delivered_at']


def test_email_only_student_does_not_match_someone_elses_empty_number(monkeypatch):
    db = mongomock.MongoClient().test
    other_id = db.students.insert_one({'email': 'other@example.com', 'id_number': '', 'password_hash': 'unrelated'}).inserted_id
    monkeypatch.setattr(classes, '_hash_password', lambda value: 'hashed')
    email, password, is_new = classes._ensure_student_account(db, {'student_email': 'new@example.com'})
    assert is_new and password and email == 'new@example.com'
    assert db.students.find_one({'_id': other_id})['password_hash'] == 'unrelated'


@pytest.mark.parametrize('delivered', [False, True])
def test_legacy_auto_created_accounts_receive_credentials_only_if_never_delivered(monkeypatch, delivered):
    db = mongomock.MongoClient().test
    db.students.insert_one({'email': 'student@example.com', 'id_number': '123', 'password_hash': 'legacy-hash', 'auto_created': True})
    doc = {'student_email': 'student@example.com', 'student_id': '123'}
    if delivered:
        doc['referral_emails_sent'] = {'credentials': 'previous-delivery'}
    doc['_id'] = db.enrollments.insert_one(doc).inserted_id
    monkeypatch.setattr(classes, '_hash_password', lambda value: 'new-hash')
    _, password, is_new = classes._ensure_student_account(db, doc)
    assert is_new is (not delivered)
    assert bool(password) is (not delivered)
    assert db.students.find_one({})['password_hash'] == ('legacy-hash' if delivered else 'new-hash')


def test_previous_email_only_delivery_does_not_block_missing_credentials(monkeypatch):
    db = mongomock.MongoClient().test
    db.students.insert_one({'email': '2201102063@student.buksu.edu.ph', 'id_number': '2201102063',
                            'auto_created': True, 'password_hash': 'undelivered-hash'})
    doc = {'student_id': '2201102063', 'student_email': '2201102063@student.buksu.edu.ph',
           'referral_emails_sent': {'combined_referral': 'old', 'welcome_existing_account': 'old'}}
    doc['_id'] = db.enrollments.insert_one(doc).inserted_id
    send = MagicMock(return_value=(True, None))
    monkeypatch.setattr(classes, 'send_combined_referral_email', send)
    classes._deliver_student_referral_email(db, doc, {}, 'Staff')
    assert send.call_args.kwargs['password']
    assert db.enrollments.find_one({'_id': doc['_id']})['referral_emails_sent']['credentials']
    classes._deliver_student_referral_email(db, doc, {}, 'Staff')
    send.assert_called_once()


def test_fresh_account_cannot_be_sent_email_only_credentials(monkeypatch):
    db = mongomock.MongoClient().test
    identifier = db.enrollments.insert_one({'student_id': '2201102063'}).inserted_id
    send = MagicMock()
    monkeypatch.setattr(classes, 'send_combined_referral_email', send)
    classes._send_referral_emails(db, {'_id': identifier}, {}, 'Staff', 'student@example.com', '', True)
    send.assert_not_called()
    saved = db.enrollments.find_one({'_id': identifier})
    assert not saved.get('referral_emails_sent')
    assert 'generated password' in saved['needs_assessment_invitation']['last_error']


@pytest.mark.parametrize('fail_first_delivery', [False, True])
def test_complete_delete_rerefer_email_and_login_flow(monkeypatch, fail_first_delivery):
    from app.routers import students
    db = mongomock.MongoClient().test
    monkeypatch.setattr(students, 'get_db', lambda: db)
    monkeypatch.setattr(classes, 'create_notification', lambda *args, **kwargs: None)
    staff_id = db.amustaff.insert_one({'name': 'Staff', 'college': 'College of Technologies', 'status': 'active'}).inserted_id
    instructor_id = db.instructor.insert_one({'college': 'College of Technology'}).inserted_id
    class_id = db.classes.insert_one({'instructor_id': str(instructor_id), 'subject_code': 'CS101'}).inserted_id
    course = db.classes.find_one({'_id': class_id})
    monkeypatch.setattr(email_sender, '_get_gmail_config', lambda: ('smtp.example.com', 587, 'sender', 'smtp-secret', 'sender@example.com'))
    smtp = MagicMock()
    monkeypatch.setattr(email_sender.smtplib, 'SMTP', smtp)
    sendmail = smtp.return_value.__enter__.return_value.sendmail
    if fail_first_delivery:
        sendmail.side_effect = [smtplib.SMTPException('Delivery unavailable'), None, None]

    def refer_new_enrollment():
        identifier = db.enrollments.insert_one({
            'class_id': str(class_id), 'student_id': '2201102063',
            'student_name': 'Sample Student', 'midterm_grade': 3.0,
        }).inserted_id
        classes._apply_automatic_referral(db, course, db.enrollments.find_one({'_id': identifier}))
        return identifier

    def email_password():
        message = message_from_string(sendmail.call_args.args[2])
        plain, html = [part.get_payload(decode=True).decode('utf-8') for part in message.get_payload()]
        password = re.search(r'^Password: (.+)$', plain, re.MULTILINE).group(1)
        assert password in html
        assert '/needs-assessment/' in plain and '/student-login' in plain
        assert plain.index('Step 1: Student account access') < plain.index('Step 2: Needs assessment')
        return password

    enrollment_id = refer_new_enrollment()
    if fail_first_delivery:
        assert not db.enrollments.find_one({'_id': enrollment_id}).get('referral_emails_sent')
        classes._apply_automatic_referral(db, course, db.enrollments.find_one({'_id': enrollment_id}))
    original_password = email_password()
    original = students.student_login(students.StudentLoginRequest(student_id='2201102063', password=original_password))
    assert db.enrollments.find_one({'_id': enrollment_id})['assigned_amu_staff_id'] == str(staff_id)
    count = sendmail.call_count
    classes._apply_automatic_referral(db, course, db.enrollments.find_one({'_id': enrollment_id}))
    assert sendmail.call_count == count

    students.delete_student(original['id'], {'role': 'admin'})
    assert not db.students.find_one({'id_number': '2201102063'})
    assert db.enrollments.count_documents({}) == 0
    refer_new_enrollment()
    replacement_password = email_password()
    replacement = students.student_login(students.StudentLoginRequest(
        student_id='2201102063@student.buksu.edu.ph', password=replacement_password,
    ))
    assert replacement['id'] != original['id']
    assert sendmail.call_count == count + 1


@pytest.mark.parametrize('stored_email', ['student@example.com', 'STUDENT@EXAMPLE.COM'])
def test_classlist_profile_without_password_receives_working_credentials(monkeypatch, stored_email):
    from app.routers import students
    db = mongomock.MongoClient().test
    monkeypatch.setattr(students, 'get_db', lambda: db)
    profile_id = db.students.insert_one({'name': 'Student', 'email': stored_email, 'id_number': '2201102063'}).inserted_id
    doc = {'student_id': '2201102063', 'student_email': 'student@example.com'}
    doc['_id'] = db.enrollments.insert_one(doc).inserted_id
    send = MagicMock(return_value=(True, None))
    monkeypatch.setattr(classes, 'send_combined_referral_email', send)
    classes._deliver_student_referral_email(db, doc, {}, 'Staff')
    password = send.call_args.kwargs['password']
    assert password
    login = students.student_login(students.StudentLoginRequest(student_id='student@example.com', password=password))
    assert login['id'] == str(profile_id)


def test_second_class_referral_preserves_already_delivered_password(monkeypatch):
    db = mongomock.MongoClient().test
    send = MagicMock(return_value=(True, None))
    monkeypatch.setattr(classes, 'send_combined_referral_email', send)
    for course in ['first', 'second']:
        doc = {'class_id': course, 'student_id': '2201102063', 'student_email': 'student@example.com'}
        doc['_id'] = db.enrollments.insert_one(doc).inserted_id
        classes._deliver_student_referral_email(db, doc, {}, 'Staff')
    first_password = send.call_args_list[0].kwargs['password']
    assert first_password
    assert send.call_args_list[1].kwargs['password'] is None
    assert bcrypt.checkpw(first_password.encode(), db.students.find_one({})['password_hash'].encode())
