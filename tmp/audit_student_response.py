import sys
import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from pydantic import ValidationError
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from app.schemas import StudentResponse
from app.routers.students import _doc_to_response

load_dotenv(Path(__file__).resolve().parents[1] / 'backend' / '.env')
client = MongoClient(os.getenv('MONGODB_URI'), serverSelectionTimeoutMS=8000, connectTimeoutMS=8000, socketTimeoutMS=8000)
db = client[os.getenv('MONGODB_DB', 'capstonesystem')]
issues = []
count = 0
for row in db.students.find({}):
    count += 1
    try:
        StudentResponse.model_validate(_doc_to_response(row))
    except ValidationError as error:
        issues.append({'id': str(row['_id']), 'fields': [{'field': '.'.join(map(str, e['loc'])), 'type': e['type']} for e in error.errors()]})
print({'records_checked': count, 'response_validation_errors': issues})
