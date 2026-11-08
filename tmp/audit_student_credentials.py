import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parents[1] / 'backend' / '.env')
try:
    client = MongoClient(os.getenv('MONGODB_URI'), serverSelectionTimeoutMS=8000, connectTimeoutMS=8000, socketTimeoutMS=8000)
    db = client[os.getenv('MONGODB_DB', 'capstonesystem')]
    identity = {'$or': [{'id_number': {'$in': ['2201102063', 2201102063]}}, {'email': {'$regex': '^2201102063@', '$options': 'i'}}]}
    accounts = list(db.students.find(identity, {'email': 1, 'password_hash': 1, 'auto_created': 1, 'credentials_delivery_pending': 1, 'credentials_delivered_at': 1, 'profile_completed': 1, 'password_changed_at': 1, 'created_at': 1, 'email_verified': 1}))
    print({'accounts': [{'id': str(row['_id']), 'email_verified': row.get('email_verified'), 'has_password': bool(row.get('password_hash')), 'auto_created': row.get('auto_created'), 'credentials_pending': row.get('credentials_delivery_pending'), 'credentials_delivered_at': str(row.get('credentials_delivered_at')), 'profile_completed': row.get('profile_completed'), 'password_changed_at': str(row.get('password_changed_at')), 'created_at': str(row.get('created_at'))} for row in accounts]})
    rows = db.enrollments.find({'$or': [{'student_id': {'$in': ['2201102063', 2201102063]}}, {'id_number': {'$in': ['2201102063', 2201102063]}}, {'student_email': {'$regex': '^2201102063@', '$options': 'i'}}]}, {'class_id': 1, 'flagged_for_mentoring': 1, 'referral_emails_sent': 1, 'needs_assessment_invitation.status': 1, 'needs_assessment_invitation.last_error': 1})
    print({'enrollments': [{'id': str(row['_id']), 'class_id': row.get('class_id'), 'referred': row.get('flagged_for_mentoring'), 'sent': row.get('referral_emails_sent'), 'invitation': row.get('needs_assessment_invitation')} for row in rows]})
except Exception as error:
    print({'audit_error': type(error).__name__})
