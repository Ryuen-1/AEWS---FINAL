"""AMU must reject incomplete source records before invoking inference."""
import sys
from pathlib import Path
from unittest.mock import Mock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.routers import amu_staff


@pytest.mark.parametrize("field", ["midterm_grade", "attendance", "needs_assessment"])
def test_incomplete_referral_never_runs_model(monkeypatch, field):
    doc = {"midterm_grade": 2.5, "attendance": 85, "needs_assessment": {"financial_difficulties": False}}
    doc.pop(field)
    monkeypatch.setattr(amu_staff, "get_db", Mock())
    monkeypatch.setattr(amu_staff, "_find_referral_doc", lambda *args: doc)
    model = Mock(side_effect=AssertionError("Inference must not run"))
    monkeypatch.setattr(amu_staff, "predict_student_risk", model)
    result = amu_staff.predict_referral("class::student", actor={})
    assert result["prediction_status"] == "insufficient_data"
    assert result["prediction"] is None
    assert result["missing_requirements"]
    assert "first" in result["reason"]
    model.assert_not_called()


@pytest.mark.parametrize("value", [None, "", "   ", "NaN", "inf", "not uploaded"])
def test_invalid_numeric_inputs_are_missing(value):
    missing = amu_staff._missing_prediction_requirements({"midterm_grade": value, "attendance": value})
    assert "midterm grades" in missing
    assert "attendance" in missing


def test_zero_attendance_and_negative_assessment_answers_are_valid():
    assert amu_staff._missing_prediction_requirements({
        "midterm_grade": 2.5, "attendance_overall": 0,
        "needs_assessment": {"financial_difficulties": False},
    }) == []


def test_generated_assessment_scores_alone_are_not_a_completed_assessment():
    assert "completed needs assessment" in amu_staff._missing_prediction_requirements({
        "needs_assessment": {"academic_challenge_score": 0, "external_factor_score": 0},
    })
