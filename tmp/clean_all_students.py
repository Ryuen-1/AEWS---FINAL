"""One-time cleanup explicitly requested by the administrator in this chat."""
import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parents[1] / 'backend' / '.env')
client = MongoClient(os.getenv('MONGODB_URI'), serverSelectionTimeoutMS=8000, connectTimeoutMS=8000, socketTimeoutMS=15000)
db_name = os.getenv('MONGODB_DB', 'capstonesystem')
if db_name != 'capstonesystem':
    raise RuntimeError('Unexpected database; cleanup stopped.')
db = client[db_name]
preserved = {name: db[name].count_documents({}) for name in ['admin', 'instructor', 'amustaff', 'classes']}
student_ids = [row['_id'] for row in db.students.find({}, {'_id': 1})]
enrollment_ids = [row['_id'] for row in db.enrollments.find({}, {'_id': 1})]
log_ids = [row['_id'] for row in db.activity_logs.find({'target_type': {'$in': ['student', 'referral']}}, {'_id': 1})]
token_ids = [row['_id'] for row in db.refresh_tokens.find({'collection': 'students'}, {'_id': 1})]
notification_ids = [row['_id'] for row in db.notifications.find({'$or': [
    {'role': 'student'},
    {'title': {'$in': ['Student auto-referred by system', 'Student auto-referred to AMU', 'Student referral updated', 'AMU reached out to a referred student']}},
]}, {'_id': 1})]
deleted = {}
for name, identifiers in [('activity_logs', log_ids), ('refresh_tokens', token_ids),
                           ('notifications', notification_ids), ('enrollments', enrollment_ids), ('students', student_ids)]:
    deleted[name] = db[name].delete_many({'_id': {'$in': identifiers}}).deleted_count if identifiers else 0
remaining = {'students': db.students.count_documents({}), 'enrollments': db.enrollments.count_documents({})}
after = {name: db[name].count_documents({}) for name in preserved}
print({'deleted': deleted, 'remaining': remaining, 'preserved_counts_unchanged': after == preserved})
if remaining['students'] or remaining['enrollments'] or after != preserved:
    raise RuntimeError('Cleanup verification needs attention.')
