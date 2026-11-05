import os
from pymongo import MongoClient
from pymongo.database import Database

_client: MongoClient | None = None

# Role -> collection name under capstonesystem
ROLE_TO_COLLECTION = {
    "instructor": "instructor",
    "admin": "admin",
    "amu-staff": "amustaff",
    "student": "students",
}
ROLE_COLLECTIONS = [collection for role, collection in ROLE_TO_COLLECTION.items() if role != "student"]


def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        _client = MongoClient(uri)
    return _client


def get_db() -> Database:
    name = os.getenv("MONGODB_DB", "capstonesystem")
    return get_client()[name]


def get_collection_for_role(role: str) -> str:
    """Return the collection name for a given role (instructor, admin, amu-staff, student)."""
    if role not in ROLE_TO_COLLECTION:
        raise ValueError(f"Invalid role: {role}")
    return ROLE_TO_COLLECTION[role]


def ensure_query_indexes(db: Database) -> None:
    """Non-unique indexes for frequently used dashboard and upload filters."""
    db.classes.create_index([("instructor_id", 1), ("subject_code", 1)])
    db.enrollments.create_index([("class_id", 1), ("flagged_for_mentoring", 1)])
    db.enrollments.create_index([("class_id", 1), ("student_email", 1)])
    db.enrollments.create_index([("assigned_amu_staff_id", 1), ("flagged_for_mentoring", 1)])
    db.students.create_index("email")
