"""Keep dashboard summaries accurate while avoiding per-class queries."""
import sys
from pathlib import Path
from unittest.mock import Mock
import mongomock
from bson import ObjectId
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.routers import classes
from app.database import ensure_query_indexes


def test_class_summary_uses_one_enrollment_query(monkeypatch):
    db = mongomock.MongoClient().test
    first, second, archived = ObjectId(), ObjectId(), ObjectId()
    db.classes.insert_many([
        {"_id": first, "instructor_id": "teacher", "subject_code": "A", "subject_name": "Alpha"},
        {"_id": second, "instructor_id": "teacher", "subject_code": "B", "subject_name": "Beta"},
        {"_id": archived, "instructor_id": "teacher", "status": "archived", "subject_code": "C"},
    ])
    db.enrollments.insert_many([
        {"class_id": str(first), "flagged_for_mentoring": True, "section_code": "IT1"},
        {"class_id": str(first), "flagged_for_mentoring": False},
        {"class_id": str(archived), "flagged_for_mentoring": True},
    ])
    find = Mock(wraps=db.enrollments.find)
    monkeypatch.setattr(db.enrollments, "find", find)
    monkeypatch.setattr(db.enrollments, "count_documents", Mock(side_effect=AssertionError("Per-class count")))
    monkeypatch.setattr(classes, "get_db", lambda: db)
    result = classes.list_classes("teacher", actor={})
    assert len(result) == 2
    assert result[0]["student_count"] == 2
    assert result[0]["at_risk_count"] == 1
    assert result[0]["section_code"] == "IT1"
    assert result[1]["student_count"] == 0
    find.assert_called_once()


def test_query_indexes_can_be_initialized_repeatedly():
    db = mongomock.MongoClient().test
    ensure_query_indexes(db)
    ensure_query_indexes(db)
    assert any(index["key"] == [("class_id", 1), ("flagged_for_mentoring", 1)]
               for index in db.enrollments.index_information().values())
