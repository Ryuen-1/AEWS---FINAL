import sys
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
