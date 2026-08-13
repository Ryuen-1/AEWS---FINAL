import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

# Load .env
_backend_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_backend_dir, ".env"))

# Connect to MongoDB
mongo_uri = os.getenv("MONGODB_URI")
db_name = os.getenv("MONGODB_DB", "capstonesystem")

client = MongoClient(mongo_uri)
db = client[db_name]

print("=" * 80)
print("CHECKING STUDENT DOCUMENT")
print("=" * 80)

student_id = "6a7bbdc550a8a4bb702af8bb"

doc = db.students.find_one({"_id": ObjectId(student_id)})

if doc:
    print(f"\nStudent found:")
    print(f"  _id: {doc.get('_id')}")
    print(f"  name: {doc.get('name')}")
    print(f"  email: {doc.get('email')}")
    print(f"  id_number: {doc.get('id_number')}")
    print(f"  college: {doc.get('college')}")
    print(f"  course: {doc.get('course')}")
    print(f"  instructor: {doc.get('instructor')}")
    print(f"  auto_created: {doc.get('auto_created')}")
    print(f"\nAll fields:")
    for key, value in doc.items():
        print(f"  {key}: {value}")
else:
    print("Student not found")

client.close()
