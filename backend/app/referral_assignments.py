"""Repair college-based assignments without changing referral or assessment data."""
from bson import ObjectId
from app.colleges import college_for


def reconcile_referral_assignments(db):
    from app.routers.classes import _find_amu_staff_for_college

    changed = 0
    staff_by_college = {}
    for enrollment in db.enrollments.find({'flagged_for_mentoring': True}):
        class_id = enrollment.get('class_id')
        if not ObjectId.is_valid(class_id):
            continue
        course = db.classes.find_one({'_id': ObjectId(class_id), 'status': {'$ne': 'archived'}})
        if not course or not ObjectId.is_valid(course.get('instructor_id')):
            continue
        instructor = db.instructor.find_one({'_id': ObjectId(course['instructor_id'])})
        college = college_for(instructor)
        if not college:
            continue
        # Keep a valid existing assignment instead of unnecessarily moving a case.
        assigned_id = enrollment.get('assigned_amu_staff_id')
        existing = db.amustaff.find_one({'_id': ObjectId(assigned_id)}) if ObjectId.is_valid(assigned_id) else None
        valid = (existing and not existing.get('archived')
                 and existing.get('status') in ('active', None, '') and college_for(existing) == college)
        if valid:
            staff = existing
        else:
            if college not in staff_by_college:
                staff_by_college[college] = _find_amu_staff_for_college(db, college)
            staff = staff_by_college[college]
        fields = {
            'assigned_amu_staff_id': str(staff['_id']) if staff else None,
            'assigned_amu_staff_name': str(staff.get('name') or '').strip() if staff else '',
            'assigned_amu_staff_college': college_for(staff) if staff else None,
        }
        if any(enrollment.get(key) != value for key, value in fields.items()):
            db.enrollments.update_one({'_id': enrollment['_id']}, {'$set': fields})
            changed += 1
    return changed
