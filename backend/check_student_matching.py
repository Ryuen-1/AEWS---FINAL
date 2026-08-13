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
print("CHECKING STUDENT MATCHING ISSUE")
print("=" * 80)

# Find the class with the issue (DA 14123 - Animation Design and Production)
class_doc = db.classes.find_one({"subject_code": "DA 14123"})
if not class_doc:
    print("Class not found")
    client.close()
    exit()

class_id = str(class_doc["_id"])
print(f"\nClass: {class_doc.get('subject_code')} - {class_doc.get('subject_name')}")
print(f"Class ID: {class_id}")

# Check enrollments for these specific students
student_ids = ["2301102644", "2301100000"]
target_students = ["Albarracin, Donna Igar", "Añonuevo, Thomas Franz"]

print(f"\nChecking enrollments for target students:")
print("-" * 80)

for i, student_id in enumerate(student_ids):
    print(f"\nStudent ID: {student_id}")
    
    # Find enrollments with this student_id
    enrollments = list(db.enrollments.find({
        "class_id": class_id,
        "$or": [
            {"student_id": student_id},
            {"id_number": student_id}
        ]
    }))
    
    print(f"  Enrollments found: {len(enrollments)}")
    
    for enrollment in enrollments:
        print(f"\n  Enrollment ID: {enrollment.get('_id')}")
        print(f"  Student Name: {enrollment.get('student_name')}")
        print(f"  Student ID field: {enrollment.get('student_id')}")
        print(f"  ID Number field: {enrollment.get('id_number')}")
        print(f"  Student Email: {enrollment.get('student_email')}")
        print(f"  Midterm Grade: {enrollment.get('midterm_grade')}")
        print(f"  CS (30%) Midterm: {enrollment.get('midterm_class_standing')}")
        print(f"  LAB (30%) Midterm: {enrollment.get('midterm_laboratory')}")
        print(f"  MO (40%) Midterm: {enrollment.get('midterm_major_output')}")

# Check for duplicate enrollments by name
print(f"\n\nChecking for duplicate enrollments by name:")
print("-" * 80)

for target_name in target_students:
    enrollments = list(db.enrollments.find({
        "class_id": class_id,
        "student_name": target_name
    }))
    
    print(f"\nName: {target_name}")
    print(f"  Enrollments found: {len(enrollments)}")
    
    for enrollment in enrollments:
        print(f"    ID: {enrollment.get('_id')}, Student ID: {enrollment.get('student_id')}, ID Number: {enrollment.get('id_number')}")

# Check all enrollments in the class
print(f"\n\nAll enrollments in this class:")
print("-" * 80)

all_enrollments = list(db.enrollments.find({"class_id": class_id}))
print(f"Total enrollments: {len(all_enrollments)}")

for enrollment in all_enrollments:
    print(f"  {enrollment.get('student_id') or enrollment.get('id_number') or 'N/A'} - {enrollment.get('student_name')} - MTG: {enrollment.get('midterm_grade')}")

client.close()
print("\n" + "=" * 80)
