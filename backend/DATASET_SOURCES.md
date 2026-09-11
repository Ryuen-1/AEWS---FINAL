# Student Risk Training Dataset Sources

This file documents the local datasets used to train the Academic Early Warning System student-risk model.

## Current Training Files

The training script uses these default source files:

| Dataset | File | Purpose |
| --- | --- | --- |
| Attendance | `backend/data/Attendance_XGBoost_Dataset_1000.xlsx` | Provides each student's attendance rate. |
| Gradesheet | `backend/data/Gradesheet_XGBoost_Dataset_1000.xlsx` | Provides midterm grade, final grade, and midterm component equivalents for class standing, laboratory, and major output. |
| Needs assessment | `backend/data/Needs_Assessment_XGBoost_Dataset_1000.xlsx` | Provides previous GPA, failed-subject count, academic challenge indicators, and external-factor indicators. |

The files are joined by `Student_ID`.

## Risk Label Rule

The model uses supervised labels derived from `Final_Grade`.

BukSU grade scale:

- `1.00` is the highest grade.
- `5.00` is the lowest/failing grade.
- Grades from `2.50` down to `5.00` are subject for AMU referral.

Training label mapping:

| Numeric label | Risk label | Rule |
| --- | --- | --- |
| `0` | Low Risk | Final grade from `1.00` to `2.25` |
| `1` | High Risk | Final grade from `2.50` down to `5.00`, plus invalid/unusable final grades |

The model is therefore trained as a binary classifier: Low Risk or High Risk.

## Feature Columns

The current runtime model uses the `midterm_attendance_needs_with_components` profile:

- `previous_gpa`
- `failed_subject_count`
- `attendance_rate`
- `academic_challenge_score`
- `external_factor_score`
- `midterm_grade`
- `class_standing`
- `lab_grade`
- `major_output_grade`

## Validation

Run this before retraining:

```bash
python backend/scripts/validate_training_datasets.py
```

The validator checks:

- required files exist
- required training columns are produced
- missing values after preprocessing
- attendance is within `0` to `100`
- grade-based fields are within BukSU's `1.00` to `5.00` scale
- risk labels contain only `0` and `1`
- both Low Risk and High Risk rows are present

Current validation summary:

- Status: passed
- Training rows: `1000`
- Low Risk rows: `410`
- High Risk rows: `590`
- Missing values after preprocessing: `0`

## Metrics Traceability

Each future training run writes dataset audit details into the metrics JSON:

- `dataset_sources`
- `training_rows`
- `training_columns`
- `missing_values`
- `class_distribution`
- `risk_label_mapping`
- `label_rule`
- `trained_at`
- `validated_at`

The current runtime metrics file is:

```text
backend/xgboost_student_risk_with_components_metrics.json
```

