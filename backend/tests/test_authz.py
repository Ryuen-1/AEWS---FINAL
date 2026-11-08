import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi import HTTPException

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.authz import create_access_token, decode_access_token, normalize_role, VALID_ROLES  # noqa: E402


class AuthzTests(unittest.TestCase):
    def setUp(self):
        secret_patch = patch.dict("os.environ", {"AUTH_TOKEN_SECRET": "isolated-token-test-secret"})
        secret_patch.start()
        self.addCleanup(secret_patch.stop)

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
        self.assertEqual(normalize_role(None), "")
        self.assertEqual(normalize_role(""), "")
        self.assertEqual(normalize_role("   "), "")

    def test_normalize_role_invalid(self):
        """Normalization preserves values; authorization validates membership."""
        self.assertNotIn(normalize_role("invalid"), VALID_ROLES)
        self.assertNotIn(normalize_role("student"), VALID_ROLES)
        self.assertNotIn(normalize_role("teacher"), VALID_ROLES)

    def test_create_and_decode_token(self):
        """Test token creation and decoding."""
        user_id = "test_user_123"
        role = "instructor"
        
        token = create_access_token(user_id=user_id, role=role)
        self.assertIsInstance(token, str)
        self.assertTrue(len(token) > 0)
        
        decoded = decode_access_token(token)
        self.assertEqual(decoded["id"], user_id)
        self.assertEqual(decoded["role"], role)
        self.assertEqual(set(decoded), {"id", "role"})

    def test_decode_invalid_token(self):
        """Test that invalid tokens are rejected."""
        for token in ("invalid_token", "", None, "a.b", "a.!", "nonascii.\u2713"):
            with self.subTest(token=token), self.assertRaises(HTTPException) as caught:
                decode_access_token(token)
            self.assertEqual(caught.exception.status_code, 401)

    def test_expired_and_tampered_tokens_are_rejected(self):
        expired = create_access_token(user_id="user", role="instructor", ttl_seconds=-1)
        token = create_access_token(user_id="user", role="instructor")
        payload, signature = token.split(".")
        for invalid in (expired, payload + "." + ("A" if signature[0] != "A" else "B") + signature[1:]):
            with self.subTest(token=invalid), self.assertRaises(HTTPException) as caught:
                decode_access_token(invalid)
            self.assertEqual(caught.exception.status_code, 401)

    def test_signed_malformed_payloads_return_unauthorized(self):
        import base64
        import hashlib
        import hmac
        import json

        for payload in ([], None, {"sub": "user", "role": "instructor", "exp": "invalid"}, {"sub": "user", "role": [], "exp": 9999999999}):
            encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=")
            signature = hmac.new(b"isolated-token-test-secret", encoded, hashlib.sha256).digest()
            token = encoded.decode() + "." + base64.urlsafe_b64encode(signature).rstrip(b"=").decode()
            with self.subTest(payload=payload), self.assertRaises(HTTPException) as caught:
                decode_access_token(token)
            self.assertEqual(caught.exception.status_code, 401)

    def test_valid_roles_set(self):
        """Test that VALID_ROLES contains expected roles."""
        self.assertIn("instructor", VALID_ROLES)
        self.assertIn("admin", VALID_ROLES)
        self.assertIn("amu-staff", VALID_ROLES)
        self.assertEqual(len(VALID_ROLES), 3)


if __name__ == "__main__":
    unittest.main()
