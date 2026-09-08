# Installation Guide for Academic Early Warning System

## Prerequisites
- Python 3.12 or higher
- Node.js 18 or higher
- MongoDB Atlas account (or local MongoDB)
- Gmail account (for email functionality)

## Backend Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment (recommended):**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment:**
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - Linux/Mac:
     ```bash
     source venv/bin/activate
     ```

4. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Update the following variables:
     ```
     MONGODB_URI=mongodb://your_connection_string
     MONGODB_DB=your_database_name
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your_email@gmail.com
     SMTP_PASSWORD=your_gmail_app_password
     FROM_EMAIL=your_email@gmail.com
     AUTH_TOKEN_SECRET=generate_a_secret_key
     ```

6. **Start backend server:**
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

## Frontend Installation

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies:**
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

## Gmail SMTP Setup (for email functionality)

1. Enable 2-Factor Authentication on your Google Account
2. Go to Google Account → Security → App Passwords
3. Create a new App Password named "AEWS Backend"
4. Copy the 16-character App Password
5. Use this password in your `.env` file as `SMTP_PASSWORD`

## MongoDB Setup

### Option 1: MongoDB Atlas (Cloud)
1. Create a free MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Get your connection string
5. Update `MONGODB_URI` in `.env`

### Option 2: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Update `MONGODB_URI` to: `mongodb://localhost:27017`

## Running the System

1. **Start MongoDB** (if using local)
2. **Start Backend:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --port 8000
   ```

3. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Troubleshooting

### Backend Issues
- **Port 8000 already in use:** Change the port using `--port 8001`
- **MongoDB connection error:** Check your `MONGODB_URI` in `.env`
- **Email sending fails:** Verify Gmail App Password and SMTP settings

### Frontend Issues
- **Port 5173 already in use:** Kill the process or use a different port
- **Module not found:** Run `npm install` again
- **Build errors:** Clear node_modules and reinstall: `rm -rf node_modules && npm install`

## Additional Setup

### Training the AI Model
```bash
cd backend
python scripts/train_student_risk_model.py --combine-all
```

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## Production Deployment

For production deployment, consider:
- Use a production ASGI server (e.g., Gunicorn with Uvicorn workers)
- Set up environment variables properly
- Use a production MongoDB instance
- Configure proper CORS settings
- Enable HTTPS
- Set up Redis for background jobs and rate limiting
