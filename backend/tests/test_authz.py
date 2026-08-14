import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.authz import create_access_token, decode_access_token, normalize_role, VALID_ROLES  # noqa: E402


class AuthzTests(unittest.TestCase):
    def test_normalize_role_variations(self):
        """Test role normalization handles various formats."""
        self.assertEqual(normalize_role("instructor"), "instructor")
        self.assertEqual(normalize_role("Instructor"), "instructor")
        self.assertEqual(normalize_role("INSTRUCTOR"), "instructor")
        self.assertEqual(normalize_role("  instructor  "), "instructor")
        self.assertEqual(normalize_role("amustaff"), "amu-staff")
        self.assertEqual(normalize_role("AMUStaff"), "amu-staff")
        self.assertEqual(normalize_role("amu-staff"), "amu-staff")
        self.assertEqual(normalize_role("admin"), "admin")
        self.assertEqual(normalize_role(None), None)
        self.assertEqual(normalize_role(""), None)
        self.assertEqual(normalize_role("   "), None)

    def test_normalize_role_invalid(self):
        """Test that invalid roles return None."""
        self.assertEqual(normalize_role("invalid"), None)
        self.assertEqual(normalize_role("student"), None)
        self.assertEqual(normalize_role("teacher"), None)

    def test_create_and_decode_token(self):
        """Test token creation and decoding."""
        user_id = "test_user_123"
        role = "instructor"
        
        token = create_access_token(user_id=user_id, role=role)
        self.assertIsInstance(token, str)
        self.assertTrue(len(token) > 0)
        
        decoded = decode_access_token(token)
        self.assertEqual(decoded["sub"], user_id)
        self.assertEqual(decoded["role"], role)
        self.assertIn("exp", decoded)
        self.assertIn("jti", decoded)

    def test_decode_invalid_token(self):
        """Test that invalid tokens are rejected."""
        self.assertIsNone(decode_access_token("invalid_token"))
        self.assertIsNone(decode_access_token(""))
        self.assertIsNone(decode_access_token(None))

    def test_valid_roles_set(self):
        """Test that VALID_ROLES contains expected roles."""
        self.assertIn("instructor", VALID_ROLES)
        self.assertIn("admin", VALID_ROLES)
        self.assertIn("amu-staff", VALID_ROLES)
        self.assertEqual(len(VALID_ROLES), 3)


if __name__ == "__main__":
    unittest.main()
