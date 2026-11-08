"""Exercise real file parsing and roster replacement without a live database."""
import json
import sys
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import mongomock
import pytest
from fastapi import UploadFile
from openpyxl import Workbook
from starlette.datastructures import Headers
from starlette.requests import Request
from app.routers import classes


@pytest.fixture(autouse=True)
def isolate_uploads(monkeypatch):
    directory = Path(__file__).resolve().parents[2] / 'tmp' / 'classlist-update-tests'
    directory.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(classes, 'UPLOAD_DIR', directory)
    yield
    for file in directory.iterdir():
        file.unlink()
    directory.rmdir()


def make_file(extension, rows):
    if extension == 'csv':
        content = ('Student ID,Student Name,Email,Section\n' + '\n'.join(','.join(row) for row in rows)).encode()
        mime = 'text/csv'
    else:
        book = Workbook()
        book.active.append(['Student ID', 'Student Name', 'Email', 'Section'])
        for row in rows:
            book.active.append(row)
        stream = BytesIO()
        book.save(stream)
        book.close()
        content = stream.getvalue()
        mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    return UploadFile(filename=f'classlist.{extension}', file=BytesIO(content), headers=Headers({'content-type': mime}))


@pytest.mark.parametrize('extension', ['csv', 'xlsx'])
def test_edited_file_updates_roster_and_preserves_student_records(monkeypatch, extension):
    db = mongomock.MongoClient().test
    class_id = str(db.classes.insert_one({'section_code': 'T205'}).inserted_id)
    monkeypatch.setattr(classes, 'get_db', lambda: db)
    monkeypatch.setattr(classes, 'create_activity_log', lambda *args, **kwargs: None)
    request = Request({'type': 'http', 'method': 'POST', 'path': '/', 'headers': []})

    def upload(rows):
        response = classes.upload_class_files.__wrapped__(
            request=request, class_id=class_id, actor={'id': 'instructor', 'role': 'instructor'},
            files=[make_file(extension, rows)], type='classlist',
        )
        return json.loads(response.body)

    upload([['1001', 'Original Name', 'student@example.com', 'T205'], ['1002', 'Removed Student', '', 'T205']])
    original = db.enrollments.find_one({'student_id': '1001'})
    db.enrollments.update_one({'_id': original['_id']}, {'$set': {'midterm_grade': 1.5, 'attendance': 95}})
    result = upload([['1001', 'Corrected Name', 'updated@example.com', 'T205'], ['1003', 'New Student', '', 'T205']])
    updated = db.enrollments.find_one({'student_id': '1001'})
    assert updated['_id'] == original['_id']
    assert updated['student_name'] == 'Corrected Name'
    assert updated['student_email'] == 'updated@example.com'
    assert updated['midterm_grade'] == 1.5
    assert updated['attendance'] == 95
    assert db.enrollments.count_documents({'class_id': class_id}) == 2
    assert db.enrollments.find_one({'student_id': '1002'}) is None
    assert db.enrollments.find_one({'student_id': '1003'})['student_name'] == 'New Student'
    assert result['added'] == 1 and result['removed'] == 1
    assert result['updated'] == 1

    # A corrected student number should retain the record when email still matches.
    upload([['1004', 'Corrected Name', 'updated@example.com', 'T205'], ['1003', 'New Student', '', 'T205']])
    corrected = db.enrollments.find_one({'student_id': '1004'})
    assert corrected['_id'] == original['_id']
    assert corrected['id_number'] == '1004'
    assert corrected['midterm_grade'] == 1.5
