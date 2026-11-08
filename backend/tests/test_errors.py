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
        self.assertIsInstance(error, AppError)
        self.assertEqual(error.status_code, 500)

    def test_validation_error(self):
        """Test ValidationError."""
        error = ValidationError("Invalid input")
        self.assertEqual(error.message, "Invalid input")
        self.assertIsInstance(error, AppError)
        self.assertEqual(error.status_code, 400)

    def test_not_found_error(self):
        """Test NotFoundError."""
        error = NotFoundError("Resource")
        self.assertEqual(error.message, "Resource not found")
        self.assertIsInstance(error, AppError)
        self.assertEqual(error.status_code, 404)

    def test_authentication_error(self):
        """Test AuthenticationError."""
        error = AuthenticationError("Unauthorized")
        self.assertEqual(error.message, "Unauthorized")
        self.assertIsInstance(error, AppError)
        self.assertEqual(error.status_code, 401)

    def test_authorization_error(self):
        """Test AuthorizationError."""
        error = AuthorizationError("Forbidden")
        self.assertEqual(error.message, "Forbidden")
        self.assertIsInstance(error, AppError)
        self.assertEqual(error.status_code, 403)

    def test_file_upload_error(self):
        """Test FileUploadError."""
        error = FileUploadError("Upload failed")
        self.assertEqual(error.message, "Upload failed")
        self.assertIsInstance(error, AppError)
        self.assertEqual(error.status_code, 415)

    def test_conflict_error(self):
        """Test ConflictError."""
        error = ConflictError("Resource already exists")
        self.assertEqual(error.message, "Resource already exists")
        self.assertIsInstance(error, AppError)
        self.assertEqual(error.status_code, 409)

    def test_rate_limit_error(self):
        """Test RateLimitError."""
        error = RateLimitError("Too many requests")
        self.assertEqual(error.message, "Too many requests")
        self.assertIsInstance(error, AppError)
        self.assertEqual(error.status_code, 429)

    def test_error_http_response(self):
        """Application errors serialize through the registered HTTP handler."""
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from app.main import app_error_handler

        app = FastAPI()
        app.add_exception_handler(AppError, app_error_handler)

        @app.get("/error")
        def error_route():
            raise ValidationError("Test")

        response = TestClient(app).get("/error")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"detail": "Test", "error_type": "ValidationError"})


if __name__ == "__main__":
    unittest.main()
