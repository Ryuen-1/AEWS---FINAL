from __future__ import annotations

import json
from pathlib import Path
import sys


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from scripts.train_student_risk_model import (  # noqa: E402
    ATTENDANCE_PATH,
    GRADES_PATH,
    NEEDS_PATH,
    build_dataset_audit_payload,
    load_training_frame,
)


REQUIRED_TRAINING_COLUMNS = {
    "previous_gpa",
    "failed_subject_count",
    "attendance_rate",
    "academic_challenge_score",
    "external_factor_score",
    "midterm_grade",
    "class_standing",
    "lab_grade",
    "major_output_grade",
    "risk_label",
}


def validate_training_datasets(
    attendance_path: Path = ATTENDANCE_PATH,
    grades_path: Path = GRADES_PATH,
    needs_path: Path = NEEDS_PATH,
) -> tuple[dict, list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    for label, path in {
        "attendance": attendance_path,
        "grades": grades_path,
        "needs assessment": needs_path,
    }.items():
        if not path.exists():
            errors.append(f"Missing {label} dataset: {path}")

    if errors:
        return {"status": "failed", "errors": errors, "warnings": warnings}, errors

    training_df, _ = load_training_frame(attendance_path, grades_path, needs_path, combine_all=False)
    missing_columns = sorted(REQUIRED_TRAINING_COLUMNS - set(training_df.columns))
    if missing_columns:
        errors.append(f"Missing required training columns: {', '.join(missing_columns)}")

    missing_values = training_df.isna().sum()
    columns_with_missing = {column: int(count) for column, count in missing_values.items() if count}
    if columns_with_missing:
        errors.append(f"Training frame contains missing values: {columns_with_missing}")

    if training_df.empty:
        errors.append("Training frame has no usable rows.")

    duplicated_rows = int(training_df.duplicated().sum())
    if duplicated_rows:
        warnings.append(f"Training frame contains {duplicated_rows} fully duplicated rows.")

    if "attendance_rate" in training_df:
        invalid_attendance = training_df[~training_df["attendance_rate"].between(0, 100)]
        if not invalid_attendance.empty:
            errors.append(f"Attendance values outside 0-100 range: {len(invalid_attendance)} rows")

    for column in ["previous_gpa", "midterm_grade", "class_standing", "lab_grade", "major_output_grade"]:
        if column not in training_df:
            continue
        numeric = training_df[column].dropna().astype(float)
        invalid = ~numeric.between(1.0, 5.0)
        invalid_count = int(invalid.sum())
        if invalid_count:
            warnings.append(
                f"{column} has {invalid_count} values outside the BukSU grade scale range of 1.00 to 5.00."
            )

    if "risk_label" in training_df:
        labels = set(int(value) for value in training_df["risk_label"].dropna().unique())
        if not labels.issubset({0, 1}):
            errors.append(f"Unexpected risk labels found: {sorted(labels)}. Expected only 0 and 1.")
        if labels != {0, 1}:
            errors.append(f"Training data must contain both Low Risk and High Risk rows. Found: {sorted(labels)}")

    audit = build_dataset_audit_payload(
        training_df,
        attendance_path=attendance_path,
        grades_path=grades_path,
        needs_path=needs_path,
    )
    audit["status"] = "passed" if not errors else "failed"
    audit["errors"] = errors
    audit["warnings"] = warnings
    return audit, errors


def main() -> int:
    audit, errors = validate_training_datasets()
    print(json.dumps(audit, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
