# Academic Early Warning System (AEWS)

A comprehensive web-based system for monitoring student academic performance and providing early intervention support for Bukidnon State University (BukSU).

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### For Instructors
- **Class Management**: Create and manage classes with student enrollment
- **File Uploads**: Upload classlists, gradesheets, and attendance records
- **Grade Analysis**: Analyze student performance with AI-powered predictions
- **Attendance Tracking**: Monitor student attendance patterns
- **Referral System**: Refer at-risk students to AMU staff for support
- **Reports**: Generate comprehensive reports on class performance

### For AMU Staff
- **Student Monitoring**: View all referred students and their academic status
- **Risk Prediction**: AI-powered risk assessment for each student
- **Support Routing**: Route students to appropriate support services
- **Needs Assessment**: Create and manage needs assessment forms
- **Communication**: Send support messages to students
- **Reports**: Generate institutional reports

### For Administrators
- **User Management**: Manage all user accounts (instructors, AMU staff, admins)
- **Approval Workflow**: Approve or reject account requests
- **System Configuration**: Configure system-wide settings
- **Activity Logs**: Monitor system activity and audit trails
- **Institutional Reports**: Generate comprehensive institutional reports

### For Students
- **Public Dashboard**: View academic performance and risk status
- **Needs Assessment**: Complete needs assessment forms
- **Support Resources**: Access support information and resources

## 🛠 Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: Custom HMAC-signed tokens with refresh token support
- **Email**: Gmail SMTP with async queue (RQ + Redis)
- **AI/ML**: XGBoost, scikit-learn, NumPy, pandas
- **Rate Limiting**: slowapi
- **Testing**: pytest, pytest-cov, pytest-asyncio

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS
- **State Management**: React Query (@tanstack/react-query)
- **Routing**: React Router
- **Charts**: jsPDF, html2canvas
- **Icons**: Lucide React
- **Testing**: Vitest, React Testing Library
- **PWA**: Service Worker with offline support

## 🏗 Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Instructor   │  │  AMU Staff   │  │   Admin      │    │
│  │   Dashboard  │  │   Dashboard  │  │   Dashboard  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Auth Router  │  │ Classes Router│  │ AMU Router   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ AI Features  │  │ AI Model     │  │ Email Queue  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Database                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Instructors  │  │   Classes    │  │   Students   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ AMU Staff    │  │ Refresh Tokens│  │ Email Queue  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Redis (Email Queue)                      │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

**Instructors Collection:**
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password_hash: String,
  role: "instructor",
  college: String,
  contact_number: String,
  status: "active" | "archived",
  email_verified: Boolean,
  profile_image: String,
  created_at: Date
}
```

**Classes Collection:**
```javascript
{
  _id: ObjectId,
  instructor_id: ObjectId,
  subject_code: String,
  subject_name: String,
  section_code: String,
  course_code: String,
  semester: String,
  academic_year: String,
  student_count: Number,
  students: [{
    student_id: String,
    student_name: String,
    email: String,
    grades: Object,
    attendance: Object,
    risk_level: String
  }],
  created_at: Date
}
```

**Students Collection:**
```javascript
{
  _id: ObjectId,
  student_id: String,
  student_name: String,
  email: String,
  referring_instructors: [ObjectId],
  referring_classes: [ObjectId],
  referral_history: [{
    instructor_id: ObjectId,
    class_id: ObjectId,
    timestamp: Date,
    reasons: [String],
    source: String
  }],
  referral_reasons: [String],
  referred: Boolean,
  created_at: Date
}
```

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- MongoDB (local or Atlas)
- Redis (for email queue)
- Gmail account with App Password

### Backend Setup

1. **Clone the repository:**
```bash
git clone https://github.com/Ryuen-1/AEWS---FINAL.git
cd stone/backend
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Generate AUTH_TOKEN_SECRET:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

6. **Start MongoDB** (if using local):
```bash
mongod
```

7. **Start Redis** (for email queue):
```bash
redis-server
```

8. **Start email worker** (optional, for async email):
```bash
python -m rq worker email email-high email-low --url redis://localhost:6379/0
```

9. **Run the server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. **Navigate to frontend:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start development server:**
```bash
npm run dev
```

4. **Build for production:**
```bash
npm run build
```

## ⚙️ Configuration

### Backend Environment Variables

Create `backend/.env` with:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/?appName=Cluster0
MONGODB_DB=capstonesystem

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
FROM_EMAIL=your-email@gmail.com

# reCAPTCHA (optional)
RECAPTCHA_SECRET_KEY=your_reCAPTCHA_v2_secret_key

# Auth Token Secret (required)
AUTH_TOKEN_SECRET=your-generated-secret-here-min-32-characters

# Redis (for email queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

### Frontend Configuration

Frontend configuration is in `frontend/src/api.js`:

```javascript
export const API_BASE = 'http://localhost:8000'
```

Update this for production deployment.

## 🧪 Testing

### Backend Tests

```bash
cd backend
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_authz.py
```

### Frontend Tests

```bash
cd frontend
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Linting

```bash
# Frontend lint
cd frontend
npm run lint

# Backend lint (if using flake8)
cd backend
flake8 app/
```

## 🚀 Deployment

### Backend Deployment

1. **Build Docker image:**
```bash
docker build -t aews-backend ./backend
```

2. **Run with Docker Compose:**
```bash
docker-compose up -d
```

### Frontend Deployment

1. **Build production bundle:**
```bash
cd frontend
npm run build
```

2. **Deploy to static hosting:**
- Vercel
- Netlify
- AWS S3 + CloudFront
- Nginx

### Production Checklist

- [ ] Set strong `AUTH_TOKEN_SECRET`
- [ ] Configure production MongoDB URI
- [ ] Set up Redis for email queue
- [ ] Configure SMTP credentials
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure CORS for production domain
- [ ] Enable gzip compression
- [ ] Set up error tracking (Sentry)
- [ ] Configure backup strategy

## 📚 Documentation

- [API Documentation](./docs/API.md) - Backend API endpoints
- [Component Documentation](./docs/COMPONENTS.md) - React components
- [Deployment Guide](./docs/DEPLOYMENT.md) - Deployment instructions
- [Email Queue Guide](./backend/EMAIL_QUEUE_README.md) - Email queue setup
- [Security Improvements](./SECURITY_IMPROVEMENTS.md) - Security features
- [Medium Priority Improvements](./MEDIUM_PRIORITY_IMPROVEMENTS.md) - Reliability features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **Backend**: Follow PEP 8
- **Frontend**: Follow ESLint rules
- **Commit messages**: Use conventional commits

### Testing

- Write tests for new features
- Ensure all tests pass before PR
- Maintain test coverage > 80%

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Bukidnon State University (BukSU)
- Academic Mentoring Unit (AMU)
- Open source community

## 📞 Support

For support, please contact:
- Email: support@buksu.edu.ph
- GitHub Issues: https://github.com/Ryuen-1/AEWS---FINAL/issues
