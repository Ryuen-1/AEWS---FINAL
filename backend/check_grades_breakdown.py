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
print("CHECKING GRADES BREAKDOWN DATA")
print("=" * 80)

# Find the class
class_doc = db.classes.find_one({"subject_code": "DA 14123"})
class_id = str(class_doc["_id"])

# Check the specific students
student_ids = ["2301102644", "2301100000"]

for student_id in student_ids:
    print(f"\n{'='*80}")
    print(f"Student ID: {student_id}")
    print('='*80)
    
    enrollment = db.enrollments.find_one({
        "class_id": class_id,
        "$or": [
            {"student_id": student_id},
            {"id_number": student_id}
        ]
    })
    
    if enrollment:
        print(f"Student Name: {enrollment.get('student_name')}")
        print(f"Enrollment ID: {enrollment.get('_id')}")
        print(f"\nScalar Grade Fields:")
        print(f"  Midterm Grade: {enrollment.get('midterm_grade')}")
        print(f"  Class Standing: {enrollment.get('class_standing')}")
        print(f"  Laboratory: {enrollment.get('laboratory')}")
        print(f"  Major Output: {enrollment.get('major_output')}")
        
        print(f"\nGrades Breakdown:")
        grades_breakdown = enrollment.get("grades_breakdown", {})
        if grades_breakdown:
            for key, value in grades_breakdown.items():
                print(f"  {key}: {value}")
        else:
            print("  No grades breakdown data")
        
        print(f"\nGrades Column Order:")
        column_order = enrollment.get("grades_column_order", [])
        if column_order:
            for col in column_order:
                print(f"  {col}")
        else:
            print("  No column order data")
    else:
        print("No enrollment found")

client.close()
