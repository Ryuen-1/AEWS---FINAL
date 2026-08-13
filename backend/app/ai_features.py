"""Helpers for building model-ready student-risk features from enrollment data."""

from __future__ import annotations

from typing import Any
import numpy as np


DEFAULT_MODEL_FEATURE_ORDER = [
    "previous_gpa",
    "failed_subject_count",
    "attendance_rate",
    "academic_challenge_score",
    "external_factor_score",
    "midterm_grade",
    "class_standing",
    "lab_grade",
    "major_output_grade",
]

ACADEMIC_CHALLENGE_FIELDS = [
    "difficulty_understanding_lectures",
    "struggles_specific_subjects",
    "weak_study_habits_time_management",
    "low_motivation_engagement",
    "poor_comprehension_writing_skills",
]

EXTERNAL_FACTOR_FIELDS = [
    "financial_difficulties",
    "physical_health_concerns",
    "family_issues",
    "part_time_work_affecting_studies",
    "mental_health_concerns",
    "internet_issues",
]

def _to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    numeric = _to_float(value)
    if numeric is None:
        return None
    return int(numeric)


def _bool_to_int(value: Any) -> int:
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        return 0 if float(value) == 0 else 1
    text = str(value or "").strip().lower()
    if text in {"", "0", "false", "no", "n", "✗", "☒", "✘", "x"}:
        return 0
    if text in {"1", "true", "yes", "y", "checked", "present", "✓", "☑", "✔"}:
        return 1
    return 0


def _sum_boolean_fields(doc: dict[str, Any], field_names: list[str]) -> int:
    return sum(_bool_to_int(doc.get(field)) for field in field_names)


def build_model_feature_dict(enrollment: dict[str, Any]) -> dict[str, float | int]:
    """Build the exact feature set expected by the XGBoost student-risk model.

    Fallback rules are intentionally conservative:
    - ``previous_gpa`` falls back to the existing ``gpa`` field.
    - ``attendance_rate`` falls back to the existing ``attendance`` field.
    - aggregate challenge scores are derived from stored boolean source fields
      when explicit aggregate scores are not present.
    - ``received_academic_support`` is inferred from support workflow flags when
      no explicit field has been stored yet.
    """

    needs_assessment = enrollment.get("needs_assessment") or {}
    if not isinstance(needs_assessment, dict):
        needs_assessment = {}

    previous_gpa = _to_float(needs_assessment.get("previous_gpa"))
    if previous_gpa is None:
        previous_gpa = _to_float(enrollment.get("previous_gpa"))
    if previous_gpa is None:
        previous_gpa = _to_float(enrollment.get("gpa")) or 0.0

    failed_subject_count = _to_int(needs_assessment.get("failed_subject_count"))
    if failed_subject_count is None:
        failed_subject_count = _to_int(enrollment.get("failed_subject_count"))
    if failed_subject_count is None:
        failed_subject_count = 0

    # Use instructor-provided attendance first. Self-reported needs-assessment attendance
    # should only be a last resort and must not override the attendance sheet.
    attendance_rate = _to_float(enrollment.get("attendance_overall"))
    if attendance_rate is None:
        attendance_rate = _to_float(enrollment.get("attendance"))
    if attendance_rate is None:
        attendance_rate = _to_float(enrollment.get("attendance_rate"))
    if attendance_rate is None:
        attendance_rate = _to_float(enrollment.get("self_reported_attendance")) or 0.0

    academic_challenge_score = _to_float(enrollment.get("academic_challenge_score"))
    if academic_challenge_score is None:
        academic_challenge_score = float(
            _sum_boolean_fields(needs_assessment, ACADEMIC_CHALLENGE_FIELDS)
        )

    external_factor_score = _to_float(enrollment.get("external_factor_score"))
    if external_factor_score is None:
        external_factor_score = float(
            _sum_boolean_fields(needs_assessment, EXTERNAL_FACTOR_FIELDS)
        )

    midterm_grade = _to_float(enrollment.get("midterm_grade")) or 0.0
    
    # Grade components for detailed analysis
    class_standing = _to_float(enrollment.get("class_standing"))
    if class_standing is None:
        class_standing = _to_float(enrollment.get("midterm_class_standing_"))
    if class_standing is None:
        class_standing = _to_float(enrollment.get("finals_class_standing_"))
    if class_standing is None:
        class_standing = 0.0
    
    lab_grade = _to_float(enrollment.get("laboratory"))
    if lab_grade is None:
        lab_grade = _to_float(enrollment.get("lab"))
    if lab_grade is None:
        lab_grade = 0.0
    
    major_output_grade = _to_float(enrollment.get("major_output"))
    if major_output_grade is None:
        major_output_grade = _to_float(enrollment.get("mo"))
    if major_output_grade is None:
        major_output_grade = 0.0

    features = {
        "previous_gpa": float(previous_gpa),
        "failed_subject_count": int(failed_subject_count),
        "attendance_rate": float(attendance_rate),
        "academic_challenge_score": float(academic_challenge_score),
        "external_factor_score": float(external_factor_score),
        "midterm_grade": float(midterm_grade),
        "class_standing": float(class_standing),
        "lab_grade": float(lab_grade),
        "major_output_grade": float(major_output_grade),
    }

    return features


def analyze_grade_components(enrollment: dict[str, Any]) -> dict[str, Any]:
    """Analyze grade components to identify specific weaknesses.
    
    Returns a dict with:
    - weakness_areas: list of areas where student is struggling
    - strongest_area: the area with best performance
    - analysis_summary: text description of the analysis
    """
    class_standing = _to_float(enrollment.get("class_standing"))
    if class_standing is None:
        class_standing = _to_float(enrollment.get("midterm_class_standing_"))
    if class_standing is None:
        class_standing = _to_float(enrollment.get("finals_class_standing_"))
    
    lab_grade = _to_float(enrollment.get("laboratory"))
    if lab_grade is None:
        lab_grade = _to_float(enrollment.get("lab"))
    
    major_output_grade = _to_float(enrollment.get("major_output"))
    if major_output_grade is None:
        major_output_grade = _to_float(enrollment.get("mo"))
    
    # For BukSU grading: 1.0 = best, 5.0 = worst
    # But percentage grades might also be used (0-100 scale)
    # We'll handle both cases
    # Weakness threshold: 2.5 and above (matches referral system)
    def normalize_grade(grade):
        if grade is None:
            return None
        if grade > 5.0:  # Assume percentage scale
            # Convert percentage to 1-5 scale
            return 5.0 - (grade / 100.0 * 4.0)
        return grade  # Already in 1-5 scale
    
    cs_normalized = normalize_grade(class_standing)
    lab_normalized = normalize_grade(lab_grade)
    mo_normalized = normalize_grade(major_output_grade)
    
    # Analyze weaknesses (higher = worse in 1-5 scale)
    # Use 2.5 threshold to match referral system (2.5 and above = weak/failing)
    weakness_areas = []
    grade_analysis = {}
    
    if cs_normalized is not None and cs_normalized >= 2.5:
        weakness_areas.append("class_standing")
        grade_analysis["class_standing"] = {
            "value": class_standing,
            "normalized": cs_normalized,
            "status": "weak"
        }
    elif cs_normalized is not None:
        grade_analysis["class_standing"] = {
            "value": class_standing,
            "normalized": cs_normalized,
            "status": "acceptable"
        }
    
    if lab_normalized is not None and lab_normalized >= 2.5:
        weakness_areas.append("laboratory")
        grade_analysis["laboratory"] = {
            "value": lab_grade,
            "normalized": lab_normalized,
            "status": "weak"
        }
    elif lab_normalized is not None:
        grade_analysis["laboratory"] = {
            "value": lab_grade,
            "normalized": lab_normalized,
            "status": "acceptable"
        }
    
    if mo_normalized is not None and mo_normalized >= 2.5:
        weakness_areas.append("major_output")
        grade_analysis["major_output"] = {
            "value": major_output_grade,
            "normalized": mo_normalized,
            "status": "weak"
        }
    elif mo_normalized is not None:
        grade_analysis["major_output"] = {
            "value": major_output_grade,
            "normalized": mo_normalized,
            "status": "acceptable"
        }
    
    # Find strongest area
    valid_grades = {
        "class_standing": cs_normalized,
        "laboratory": lab_normalized,
        "major_output": mo_normalized
    }
    valid_grades = {k: v for k, v in valid_grades.items() if v is not None}
    
    strongest_area = None
    if valid_grades:
        strongest_area = min(valid_grades, key=valid_grades.get)  # Lowest = best
    
    # Generate analysis summary
    summary_parts = []
    if weakness_areas:
        area_names = {
            "class_standing": "class standing",
            "laboratory": "laboratory work", 
            "major_output": "major outputs/projects"
        }
        weakness_names = [area_names.get(area, area) for area in weakness_areas]
        summary_parts.append(f"Student shows weakness in: {', '.join(weakness_names)}")
    
    if strongest_area:
        area_names = {
            "class_standing": "class standing",
            "laboratory": "laboratory work",
            "major_output": "major outputs/projects"
        }
        summary_parts.append(f"Strongest performance in: {area_names.get(strongest_area, strongest_area)}")
    
    if not summary_parts:
        summary_parts.append("Grade component analysis: No significant weaknesses detected")
    
    return {
        "weakness_areas": weakness_areas,
        "strongest_area": strongest_area,
        "grade_analysis": grade_analysis,
        "analysis_summary": ". ".join(summary_parts)
    }


def build_model_feature_row(enrollment: dict[str, Any]) -> list[float | int]:
    """Return model features in the exact order expected by the .pkl model."""

    features = build_model_feature_dict(enrollment)
    
    # Handle missing data appropriately for BukSU system
    # GPA: 0.0 means no data yet (missing), 5.0 is actual failing grade
    result = []
    for name in DEFAULT_MODEL_FEATURE_ORDER:
        value = features.get(name, 0.0)
        
        # For GPA, 0.0 means missing data - use None instead
        if name == "previous_gpa" and value == 0.0:
            result.append(None)
        else:
            result.append(value)
    
    return result


def build_model_feature_row_for_order(
    enrollment: dict[str, Any],
    feature_order: list[str],
) -> list[float | int]:
    """Return model features in the provided saved-model feature order."""
    
    features = build_model_feature_dict(enrollment)
    
    # Handle missing data appropriately for BukSU system
    # GPA: 0.0 means no data yet (missing), 5.0 is actual failing grade
    # Attendance: 0.0% means never attended (actual zero)
    # Failed subjects: 0 means no failures (actual zero)
    # Grade components: 0.0 might mean missing data or actual zero - treat as None if missing
    result = []
    for name in feature_order:
        value = features.get(name, 0.0)
        
        # For GPA, 0.0 means missing data - use None instead
        if name == "previous_gpa" and value == 0.0:
            result.append(None)
        # For grade components, 0.0 might mean missing data - use None
        elif name in ("class_standing", "lab_grade", "major_output_grade") and value == 0.0:
            result.append(None)
        else:
            result.append(value)
    
    return result
