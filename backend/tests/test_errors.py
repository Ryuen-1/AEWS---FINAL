import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.errors import (
    AppError,
    ValidationError,
    NotFoundError,
    AuthenticationError,
    AuthorizationError,
    FileUploadError,
    ConflictError,
    RateLimitError,
)  # noqa: E402


class ErrorTests(unittest.TestCase):
    def test_app_error_message(self):
        """Test AppError with custom message."""
        error = AppError("Test error message")
        self.assertEqual(error.message, "Test error message")
        self.assertEqual(error.error_type, "app_error")
        self.assertEqual(error.status_code, 500)

    def test_validation_error(self):
        """Test ValidationError."""
        error = ValidationError("Invalid input")
        self.assertEqual(error.message, "Invalid input")
        self.assertEqual(error.error_type, "validation_error")
        self.assertEqual(error.status_code, 422)

    def test_not_found_error(self):
        """Test NotFoundError."""
        error = NotFoundError("Resource not found")
        self.assertEqual(error.message, "Resource not found")
        self.assertEqual(error.error_type, "not_found")
        self.assertEqual(error.status_code, 404)

    def test_authentication_error(self):
        """Test AuthenticationError."""
        error = AuthenticationError("Unauthorized")
        self.assertEqual(error.message, "Unauthorized")
        self.assertEqual(error.error_type, "authentication_error")
        self.assertEqual(error.status_code, 401)

    def test_authorization_error(self):
        """Test AuthorizationError."""
        error = AuthorizationError("Forbidden")
        self.assertEqual(error.message, "Forbidden")
        self.assertEqual(error.error_type, "authorization_error")
        self.assertEqual(error.status_code, 403)

    def test_file_upload_error(self):
        """Test FileUploadError."""
        error = FileUploadError("Upload failed")
        self.assertEqual(error.message, "Upload failed")
        self.assertEqual(error.error_type, "file_upload_error")
        self.assertEqual(error.status_code, 400)

    def test_conflict_error(self):
        """Test ConflictError."""
        error = ConflictError("Resource already exists")
        self.assertEqual(error.message, "Resource already exists")
        self.assertEqual(error.error_type, "conflict")
        self.assertEqual(error.status_code, 409)

    def test_rate_limit_error(self):
        """Test RateLimitError."""
        error = RateLimitError("Too many requests")
        self.assertEqual(error.message, "Too many requests")
        self.assertEqual(error.error_type, "rate_limit_error")
        self.assertEqual(error.status_code, 429)

    def test_error_to_dict(self):
        """Test error serialization to dict."""
        error = ValidationError("Test")
        error_dict = error.to_dict()
        self.assertEqual(error_dict["error_type"], "validation_error")
        self.assertEqual(error_dict["message"], "Test")
        self.assertEqual(error_dict["status_code"], 422)


if __name__ == "__main__":
    unittest.main()
