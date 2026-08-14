# API Documentation

This document describes the backend API endpoints for the Academic Early Warning System.

## Base URL

```
http://localhost:8000/api
```

## Authentication

Most endpoints require authentication via Bearer token:

```http
Authorization: Bearer <access_token>
```

Refresh tokens are also supported via the `/api/auth/refresh` endpoint.

## Endpoints

### Authentication

#### POST /api/auth/signup
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "contact_number": "09123456789",
  "college": "College of Engineering",
  "role": "instructor"
}
```

**Response:**
```json
{
  "message": "Account created. Please check your email to verify."
}
```

**Rate Limit:** 5/minute

---

#### POST /api/auth/login
Authenticate a user and receive tokens.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "instructor",
    "college": "College of Engineering",
    "contact_number": "09123456789",
    "status": "active",
    "profile_image": null
  },
  "role": "instructor",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "abc123...",
  "token_type": "bearer"
}
```

**Rate Limit:** 10/minute

---

#### POST /api/auth/refresh
Refresh an access token using a refresh token.

**Request Body:**
```
refresh_token=abc123...
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

---

#### POST /api/auth/logout
Revoke a refresh token.

**Request Body:**
```
refresh_token=abc123...
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

### Classes

#### GET /api/classes
Get all classes for the authenticated instructor.

**Query Parameters:**
- `instructor_id` (optional): Filter by instructor ID

**Response:**
```json
[
  {
    "_id": "class_id",
    "instructor_id": "instructor_id",
    "subject_code": "MATH101",
    "subject_name": "Calculus I",
    "section_code": "A",
    "course_code": "BSCE",
    "semester": "1st Semester",
    "academic_year": "2024-2025",
    "student_count": 45,
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

---

#### POST /api/classes
Create a new class.

**Request Body:**
```json
{
  "subject_code": "MATH101",
  "subject_name": "Calculus I",
  "section_code": "A",
  "course_code": "BSCE",
  "semester": "1st Semester",
  "academic_year": "2024-2025"
}
```

**Response:**
```json
{
  "_id": "class_id",
  "instructor_id": "instructor_id",
  "subject_code": "MATH101",
  "subject_name": "Calculus I",
  "section_code": "A",
  "course_code": "BSCE",
  "semester": "1st Semester",
  "academic_year": "2024-2025",
  "student_count": 0,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

#### POST /api/classes/upload-classlist
Upload a classlist and create a class automatically.

**Request Body (multipart/form-data):**
- `files`: CSV/XLSX file
- `instructor_id`: Instructor ID
- `subject_code` (optional): Subject code
- `course_code` (optional): Course code
- `subject_name` (optional): Subject name

**Rate Limit:** 20/hour

---

#### POST /api/classes/{class_id}/upload
Upload files for a class (gradesheet, attendance, classlist).

**Request Body (multipart/form-data):**
- `files`: CSV/XLSX/DOCX files
- `type`: File type (gradesheet, attendance, classlist)

**Rate Limit:** 20/hour

---

#### POST /api/classes/{class_id}/predict-risk
Run AI prediction for a class.

**Response:**
```json
{
  "predictions": [
    {
      "student_id": "2201103564",
      "student_name": "John Doe",
      "risk_level": "high",
      "risk_score": 0.85,
      "factors": ["Low attendance", "Poor grades"]
    }
  ]
}
```

**Rate Limit:** 10/hour

---

#### PATCH /api/classes/{class_id}/archive
Archive a class.

**Response:**
```json
{
  "message": "Class archived successfully"
}
```

---

### Students

#### GET /api/students
Get all students.

**Query Parameters:**
- `search` (optional): Search by name or ID

**Response:**
```json
[
  {
    "_id": "student_id",
    "student_id": "2201103564",
    "student_name": "John Doe",
    "email": "john@example.com",
    "referred": false,
    "referral_reasons": [],
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

---

#### GET /api/students/referred
Get all referred students.

**Query Parameters:**
- `search` (optional): Search by name or ID

**Response:**
```json
[
  {
    "_id": "student_id",
    "student_id": "2201103564",
    "student_name": "John Doe",
    "email": "john@example.com",
    "referred": true,
    "referral_reasons": ["Low attendance", "Poor grades"],
    "referring_instructors": ["instructor_id_1", "instructor_id_2"],
    "referral_history": [...],
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### AMU Staff

#### GET /api/amu-staff/overview
Get AMU staff overview statistics.

**Response:**
```json
{
  "total_students": 1500,
  "referred_students": 125,
  "high_risk_students": 45,
  "medium_risk_students": 80
}
```

---

#### GET /api/amu-staff/referrals
Get all referrals.

**Query Parameters:**
- `search` (optional): Search by name or ID

**Response:**
```json
[
  {
    "_id": "student_id",
    "student_id": "2201103564",
    "student_name": "John Doe",
    "email": "john@example.com",
    "referred": true,
    "referral_reasons": ["Low attendance"],
    "referring_instructors": ["instructor_id"],
    "referral_history": [...]
  }
]
```

---

## Error Responses

All errors return consistent JSON responses:

```json
{
  "error_type": "validation_error",
  "message": "Invalid input data",
  "status_code": 422
}
```

### Common Error Types

- `validation_error` (422): Invalid input
- `not_found` (404): Resource not found
- `authentication_error` (401): Not authenticated
- `authorization_error` (403): Not authorized
- `file_upload_error` (400): File upload failed
- `conflict` (409): Resource conflict
- `rate_limit_error` (429): Too many requests

## Rate Limits

- Login: 10/minute
- Signup: 5/minute
- File uploads: 20/hour
- Predictions: 10/hour (individual), 30/hour (class-wide)

## File Upload Limits

- Max file size: 10MB per file
- Max total size: 50MB per session
- Allowed types: CSV, XLSX, XLS, DOCX, DOC
