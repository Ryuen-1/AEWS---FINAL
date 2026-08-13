import sys
import unittest
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.routers.admin import _student_identifier  # noqa: E402
from app.routers.classes import (
    _extract_student_identity,
    _normalize_cell,
    _row_identifier_label,
    _normalize_student_id,
    _validate_student_id,
    _find_column,
    _find_student_id_column,
    _validate_parsed_data,
    _parse_daily_attendance,
)  # noqa: E402
from app.ai_features import _bool_to_int  # noqa: E402
from app.ai_model import _can_make_prediction  # noqa: E402


class ClassesHelperTests(unittest.TestCase):
    def test_normalize_cell_handles_numeric_excel_values(self):
        self.assertEqual(_normalize_cell(2201103564.0), "2201103564")
        self.assertEqual(_normalize_cell(2.5), "2.5")
        self.assertEqual(_normalize_cell(None), "")

    def test_extract_student_identity_prefers_available_fields(self):
        row = {
            "email": " Student@Example.com ",
            "id number": 2201103564.0,
            "name of students": "Donna Igar Albarracin",
        }
        keys = list(row.keys())
        email, name, student_id = _extract_student_identity(row, keys)
        self.assertEqual(email, "student@example.com")
        self.assertEqual(name, "Donna Igar Albarracin")
        self.assertEqual(student_id, "2201103564")

    def test_row_identifier_label_falls_back_id_then_name_then_email(self):
        self.assertEqual(
            _row_identifier_label({"id number": "2201103564", "name": "Donna", "email": "d@example.com"}, ["id number", "name", "email"]),
            "2201103564",
        )
        self.assertEqual(
            _row_identifier_label({"name": "Donna", "email": "d@example.com"}, ["name", "email"]),
            "Donna",
        )
        self.assertEqual(
            _row_identifier_label({"email": "d@example.com"}, ["email"]),
            "d@example.com",
        )


class AdminHelperTests(unittest.TestCase):
    def test_student_identifier_prefers_email_then_id_then_name(self):
        self.assertEqual(_student_identifier({"student_email": "Student@Example.com", "student_id": "2201103564", "student_name": "Donna"}), "student@example.com")
        self.assertEqual(_student_identifier({"student_id": 2201103564.0, "student_name": "Donna"}), "2201103564")
        self.assertEqual(_student_identifier({"student_name": "Donna"}), "Donna")


class Phase1StudentIDTests(unittest.TestCase):
    def test_normalize_student_id_removes_prefixes(self):
        self.assertEqual(_normalize_student_id("ID-12345"), "12345")
        self.assertEqual(_normalize_student_id("student-67890"), "67890")
        self.assertEqual(_normalize_student_id("no.11111"), "11111")
        self.assertEqual(_normalize_student_id("#22222"), "22222")

    def test_normalize_student_id_removes_suffixes(self):
        self.assertEqual(_normalize_student_id("12345-x"), "12345")
        self.assertEqual(_normalize_student_id("67890_X"), "67890")
        self.assertEqual(_normalize_student_id("11111-2x"), "11111")

    def test_normalize_student_id_removes_spaces_and_hyphens(self):
        self.assertEqual(_normalize_student_id("123 45"), "12345")
        self.assertEqual(_normalize_student_id("123-45"), "12345")
        self.assertEqual(_normalize_student_id("123_45"), "12345")

    def test_normalize_student_id_removes_leading_zeros(self):
        self.assertEqual(_normalize_student_id("00123"), "123")
        self.assertEqual(_normalize_student_id("000456"), "456")
        self.assertEqual(_normalize_student_id("0"), "0")  # Single zero preserved

    def test_validate_student_id_valid_ids(self):
        self.assertEqual(_validate_student_id("12345"), (True, "12345"))
        self.assertEqual(_validate_student_id("00123"), (True, "123"))
        self.assertEqual(_validate_student_id("ID-67890"), (True, "67890"))

    def test_validate_student_id_invalid_ids(self):
        self.assertEqual(_validate_student_id(""), (False, "Student ID is empty"))
        self.assertEqual(_validate_student_id(None), (False, "Student ID is empty"))
        self.assertEqual(_validate_student_id("   "), (False, "Student ID is invalid"))


class Phase1ColumnMatchingTests(unittest.TestCase):
    def test_find_column_exact_match(self):
        keys = ["student_id", "student_name", "email"]
        self.assertEqual(_find_column(keys, ["student_id"]), "student_id")

    def test_find_column_word_boundary_match(self):
        keys = ["student_id", "student_name", "hidden_id"]
        self.assertEqual(_find_column(keys, ["id"]), "student_id")  # Should match student_id, not hidden_id

    def test_find_column_fallback_substring_match(self):
        keys = ["student_id_number", "student_name"]
        self.assertEqual(_find_column(keys, ["id"]), "student_id_number")


class Phase3ValidationTests(unittest.TestCase):
    def test_validate_parsed_data_empty_rows(self):
        self.assertEqual(_validate_parsed_data([], "classlist"), (False, "No data found in file"))

    def test_validate_parsed_data_no_identity_columns(self):
        rows = [{"course": "MATH101", "section": "A"}]
        self.assertEqual(
            _validate_parsed_data(rows, "classlist"),
            (False, "No student identity columns found (name, ID, or email). Please ensure your file has at least one of these columns: student name, student ID, or student email.")
        )

    def test_validate_parsed_data_has_identity_columns(self):
        rows = [{"student_id": "123", "name": "John", "email": "john@example.com"}]
        self.assertEqual(_validate_parsed_data(rows, "classlist"), (True, ""))

    def test_validate_parsed_data_empty_data_rows(self):
        rows = [{"student_id": "", "name": "", "email": ""}]
        self.assertEqual(_validate_parsed_data(rows, "classlist"), (False, "File contains only empty rows"))


class AttendanceParsingTests(unittest.TestCase):
    def test_parse_daily_attendance_blanks_as_absent(self):
        keys = ["student_id", "student_name", "Jan 15", "Jan 16", "Jan 17"]
        row = {"student_id": "123", "student_name": "John", "Jan 15": "✓", "Jan 16": "", "Jan 17": "✓"}
        present, absent, pct, cols = _parse_daily_attendance(row, keys, None, None)
        self.assertEqual(present, 2)  # 2 present marks
        self.assertEqual(absent, 1)  # 1 blank = absent
        self.assertEqual(pct, 66.67)  # 2/3 = 66.67%

    def test_parse_daily_attendance_x_marks_as_absent(self):
        keys = ["student_id", "student_name", "Jan 15", "Jan 16", "Jan 17"]
        row = {"student_id": "123", "student_name": "John", "Jan 15": "✓", "Jan 16": "X", "Jan 17": "✓"}
        present, absent, pct, cols = _parse_daily_attendance(row, keys, None, None)
        self.assertEqual(present, 2)  # 2 present marks
        self.assertEqual(absent, 1)  # 1 X = absent
        self.assertEqual(pct, 66.67)  # 2/3 = 66.67%

    def test_parse_daily_attendance_all_absent(self):
        keys = ["student_id", "student_name", "Jan 15", "Jan 16"]
        row = {"student_id": "123", "student_name": "John", "Jan 15": "", "Jan 16": "X"}
        present, absent, pct, cols = _parse_daily_attendance(row, keys, None, None)
        self.assertEqual(present, 0)  # 0 present
        self.assertEqual(absent, 2)  # 2 absent (blank + X)
        self.assertEqual(pct, 0.0)  # 0/2 = 0%


class BooleanConversionTests(unittest.TestCase):
    def test_bool_to_int_checkmarks_present(self):
        self.assertEqual(_bool_to_int("✓"), 1)
        self.assertEqual(_bool_to_int("☑"), 1)
        self.assertEqual(_bool_to_int("✔"), 1)

    def test_bool_to_int_checkmarks_absent(self):
        self.assertEqual(_bool_to_int("✗"), 0)
        self.assertEqual(_bool_to_int("☒"), 0)
        self.assertEqual(_bool_to_int("✘"), 0)
        self.assertEqual(_bool_to_int("x"), 0)

    def test_bool_to_int_traditional_formats(self):
        self.assertEqual(_bool_to_int(True), 1)
        self.assertEqual(_bool_to_int(False), 0)
        self.assertEqual(_bool_to_int("yes"), 1)
        self.assertEqual(_bool_to_int("no"), 0)
        self.assertEqual(_bool_to_int("1"), 1)
        self.assertEqual(_bool_to_int("0"), 0)


class PredictionDataAvailabilityTests(unittest.TestCase):
    def test_can_predict_with_sufficient_data(self):
        """Test that prediction is allowed when at least 2 indicators are available."""
        # Has midterm + attendance
        features = {
            "midterm_grade": 2.5,
            "attendance_rate": 80.0,
            "previous_gpa": 0.0,  # Missing
            "academic_challenge_score": 0,  # Missing
            "external_factor_score": 0,  # Missing
        }
        can_predict, reason = _can_make_prediction(features)
        self.assertTrue(can_predict)
        self.assertIn("Sufficient data", reason)
        
        # Has GPA + needs assessment
        features = {
            "midterm_grade": None,  # Missing
            "attendance_rate": None,  # Missing
            "previous_gpa": 3.0,
            "academic_challenge_score": 2,
            "external_factor_score": 1,
        }
        can_predict, reason = _can_make_prediction(features)
        self.assertTrue(can_predict)
        self.assertIn("Sufficient data", reason)
    
    def test_cannot_predict_with_insufficient_data(self):
        """Test that prediction is blocked when fewer than 2 indicators are available."""
        # Only has attendance
        features = {
            "midterm_grade": None,  # Missing
            "attendance_rate": 80.0,
            "previous_gpa": 0.0,  # Missing
            "academic_challenge_score": 0,  # Missing
            "external_factor_score": 0,  # Missing
        }
        can_predict, reason = _can_make_prediction(features)
        self.assertFalse(can_predict)
        self.assertIn("Need more data", reason)
        self.assertIn("1/4", reason)
        
        # Only has GPA
        features = {
            "midterm_grade": None,  # Missing
            "attendance_rate": None,  # Missing
            "previous_gpa": 3.0,
            "academic_challenge_score": 0,  # Missing
            "external_factor_score": 0,  # Missing
        }
        can_predict, reason = _can_make_prediction(features)
        self.assertFalse(can_predict)
        self.assertIn("Need more data", reason)
        self.assertIn("1/4", reason)
    
    def test_gpa_zero_treated_as_missing(self):
        """Test that GPA 0.0 is treated as missing data for BukSU system."""
        features = {
            "midterm_grade": None,  # Missing
            "attendance_rate": 80.0,
            "previous_gpa": 0.0,  # Should be treated as missing
            "academic_challenge_score": 0,  # Missing
            "external_factor_score": 0,  # Missing
        }
        can_predict, reason = _can_make_prediction(features)
        self.assertFalse(can_predict)
        self.assertIn("1/4", reason)  # Only attendance counts
    
    def test_gpa_five_treated_as_actual(self):
        """Test that GPA 5.0 is treated as actual failing grade, not missing."""
        features = {
            "midterm_grade": None,  # Missing
            "attendance_rate": 80.0,
            "previous_gpa": 5.0,  # Failing grade, should count as available
            "academic_challenge_score": 0,  # Missing
            "external_factor_score": 0,  # Missing
        }
        can_predict, reason = _can_make_prediction(features)
        self.assertTrue(can_predict)  # Has attendance + GPA (5.0)
        self.assertIn("Sufficient data", reason)
    
    def test_attendance_zero_treated_as_actual(self):
        """Test that attendance 0.0% is treated as actual zero, not missing."""
        features = {
            "midterm_grade": 2.5,
            "attendance_rate": 0.0,  # Never attended, should count as available
            "previous_gpa": 0.0,  # Missing
            "academic_challenge_score": 0,  # Missing
            "external_factor_score": 0,  # Missing
        }
        can_predict, reason = _can_make_prediction(features)
        self.assertTrue(can_predict)  # Has midterm + attendance (0.0)
        self.assertIn("Sufficient data", reason)
    
    def test_reason_includes_missing_data(self):
        """Test that the reason message includes which data is missing."""
        features = {
            "midterm_grade": None,
            "attendance_rate": None,
            "previous_gpa": 0.0,  # Missing
            "academic_challenge_score": 0,  # Missing
            "external_factor_score": 0,  # Missing
        }
        can_predict, reason = _can_make_prediction(features)
        self.assertFalse(can_predict)
        self.assertIn("midterm grade", reason)
        self.assertIn("attendance", reason)
        self.assertIn("overall GPA", reason)


if __name__ == "__main__":
    unittest.main()
