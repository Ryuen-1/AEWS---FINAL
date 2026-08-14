import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from fastapi.testclient import TestClient
from app.main import app  # noqa: E402


class AuthEndpointTests(unittest.TestCase):
    def setUp(self):
        """Set up test client."""
        self.client = TestClient(app)

    @patch('app.database.get_db')
    @patch('app.routers.auth._check_password')
    def test_login_endpoint_success(self, mock_check_password, mock_get_db):
        """Test successful login endpoint."""
        # Mock database
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_collection.find_one.return_value = {
            "_id": "user123",
            "email": "test@example.com",
            "name": "Test User",
            "role": "instructor",
            "password_hash": "hashed_password",
            "email_verified": True,
            "archived": False,
        }
        mock_db.instructors = mock_collection
        mock_get_db.return_value = mock_db
        
        # Mock password check
        mock_check_password.return_value = True
        
        response = self.client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
        self.assertEqual(data["user"]["email"], "test@example.com")

    @patch('app.database.get_db')
    def test_login_endpoint_invalid_credentials(self, mock_get_db):
        """Test login with invalid credentials."""
        # Mock database
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_collection.find_one.return_value = None
        mock_db.instructors = mock_collection
        mock_get_db.return_value = mock_db
        
        response = self.client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"}
        )
        
        self.assertEqual(response.status_code, 401)

    @patch('app.database.get_db')
    def test_login_endpoint_unverified_email(self, mock_get_db):
        """Test login with unverified email."""
        # Mock database
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_collection.find_one.return_value = {
            "_id": "user123",
            "email": "test@example.com",
            "name": "Test User",
            "role": "instructor",
            "password_hash": "hashed_password",
            "email_verified": False,
            "archived": False,
        }
        mock_db.instructors = mock_collection
        mock_get_db.return_value = mock_db
        
        response = self.client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        
        self.assertEqual(response.status_code, 403)

    @patch('app.database.get_db')
    def test_login_endpoint_archived_account(self, mock_get_db):
        """Test login with archived account."""
        # Mock database
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_collection.find_one.return_value = {
            "_id": "user123",
            "email": "test@example.com",
            "name": "Test User",
            "role": "instructor",
            "password_hash": "hashed_password",
            "email_verified": True,
            "archived": True,
        }
        mock_db.instructors = mock_collection
        mock_get_db.return_value = mock_db
        
        response = self.client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "password123"}
        )
        
        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
