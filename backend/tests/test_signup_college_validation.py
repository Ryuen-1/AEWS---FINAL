import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.schemas import REGISTRATION_COLLEGES, SignUpRequest  # noqa: E402


def signup_payload(**overrides):
    return {
        "name": "Jane Smith",
        "email": "jane@example.edu",
        "password": "password123",
        "contact_number": "+639123456789",
        "college": REGISTRATION_COLLEGES[0],
        "role": "instructor",
        **overrides,
    }


@pytest.mark.parametrize("college", REGISTRATION_COLLEGES)
def test_signup_accepts_each_configured_college(college):
    request = SignUpRequest(**signup_payload(college=college))
    assert request.college == college


@pytest.mark.parametrize("college", ["CIT", "College of Technology", ""])
def test_signup_rejects_unlisted_colleges(college):
    with pytest.raises(ValidationError, match="available registration options|College is required"):
        SignUpRequest(**signup_payload(college=college))
