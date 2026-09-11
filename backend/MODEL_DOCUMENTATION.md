# Student Risk Model Documentation

This document explains the student risk prediction model used by the backend.

## Overview

The system looks at a student's grades, attendance, previous academic history, and needs-assessment answers, then predicts one of two risk levels:

- `0 = Low Risk`
- `1 = High Risk`

The backend runs predictions through `backend/app/ai_model.py`. Those predictions are triggered by class routes in `backend/app/routers/classes.py`.

## Current Saved Model

The runtime loader currently looks for:

- `backend/xgboost_student_risk_with_components.pkl`
- `backend/xgboost_student_risk_with_components.json`
- `backend/xgboost_student_risk_with_components_metrics.json`

The current default model file is the `.pkl` bundle. It contains trained models for:

- `midterm_attendance_needs`
- `midterm_attendance_needs_with_components`

Runtime prediction now uses `midterm_attendance_needs_with_components` when grade component data exists.

## Training Data

Training dataset details are documented in `backend/DATASET_SOURCES.md`.

Default training files:

- `backend/data/Attendance_XGBoost_Dataset_1000.xlsx`
- `backend/data/Gradesheet_XGBoost_Dataset_1000.xlsx`
- `backend/data/Needs_Assessment_XGBoost_Dataset_1000.xlsx`

The files are joined by `Student_ID`.

## Risk Label Rule

The model is supervised. It learns from labels derived from `Final_Grade`.

BukSU grade scale:

- `1.00` is the highest grade.
- `5.00` is the lowest/failing grade.
- Grades from `2.50` down to `5.00` are subject for AMU referral.

Training label mapping:

- final grade `1.00` to `2.25` -> `Low Risk` (`0`)
- final grade `2.50` down to `5.00` -> `High Risk` (`1`)

The model is therefore predicting likely Low Risk or High Risk academic outcome.

## Current Feature Profile

The main profile is `midterm_attendance_needs_with_components`.

Features:

- `previous_gpa`
- `failed_subject_count`
- `attendance_rate`
- `academic_challenge_score`
- `external_factor_score`
- `midterm_grade`
- `class_standing`
- `lab_grade`
- `major_output_grade`

Feature-building happens in `backend/app/ai_features.py`.

## Candidate Models

The training script evaluates:

- `xgboost`
- `xgboost_tuned`
- `ensemble` for evaluation only

The saved runtime model must be `xgboost` or `xgboost_tuned`. The ensemble is not saved as the runtime model.

## Training And Evaluation Flow

The training script:

1. loads the attendance, gradesheet, and needs-assessment datasets
2. merges them by `Student_ID`
3. creates binary risk labels from final grades
4. builds model features
5. splits data using `train_test_split(..., test_size=0.2, stratify=y, random_state=42)`
6. runs 5-fold stratified cross-validation
7. evaluates holdout accuracy, weighted precision/recall/F1, macro precision/recall/F1, and cross-validation accuracy
8. saves the selected model and metrics

Script:

```bash
python backend/scripts/train_student_risk_model.py
```

## Dataset Validation

Before retraining, run:

```bash
python backend/scripts/validate_training_datasets.py
```

The validation script checks:

- required dataset files
- required training columns
- missing values after preprocessing
- attendance range
- BukSU grade range
- binary risk labels
- Low Risk and High Risk class presence

The current validation result is stored in `backend/xgboost_student_risk_with_components_metrics.json`.

## Metrics Traceability

Future training runs now store these audit fields in the metrics JSON:

- `trained_at`
- `validated_at`
- `dataset_sources`
- `training_rows`
- `training_columns`
- `missing_values`
- `class_distribution`
- `risk_label_mapping`
- `label_rule`

This makes each trained model easier to verify and defend.

## Runtime Prediction

At runtime, `predict_student_risk(enrollment)`:

1. builds the feature dictionary
2. checks whether enough data exists
3. selects the correct feature profile
4. loads the saved model and feature order
5. calls `model.predict(...)`
6. calls `model.predict_proba(...)` when available
7. maps the prediction to `Low Risk` or `High Risk`
8. returns probability, features, drivers, and grade analysis

If no trained model exists, the backend uses a deterministic fallback scorer. The fallback also returns only Low Risk or High Risk.

## Short Description

The system uses a supervised binary student risk prediction model trained from attendance, grades, previous academic history, and needs-assessment indicators. It classifies students as Low Risk or High Risk and stores both the prediction and supporting risk drivers on each enrollment record to support early warning and AMU referral workflows.

