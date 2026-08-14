# Deployment Guide

This guide covers deploying the Academic Early Warning System to production.

## Prerequisites

- Domain name
- Server (VPS, AWS, Azure, etc.)
- MongoDB Atlas account
- Redis server (or Redis Cloud)
- Gmail account for SMTP
- SSL certificate

## Deployment Options

### Option 1: Vercel + MongoDB Atlas + Redis Cloud (Recommended)

#### Frontend (Vercel)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy frontend:**
```bash
cd frontend
vercel
```

3. **Configure environment variables in Vercel:**
```
VITE_API_BASE_URL=https://your-backend-url.com
```

#### Backend (Railway/Render/AWS)

1. **Deploy backend to Railway:**
```bash
railway up
```

2. **Configure environment variables:**
```
MONGODB_URI=mongodb+srv://...
MONGODB_DB=capstonesystem
FRONTEND_URL=https://your-frontend-url.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
AUTH_TOKEN_SECRET=your-generated-secret
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_DB=0
```

3. **Start email worker:**
```bash
python -m rq worker email email-high email-low --url redis://your-redis-host:6379/0
```

#### MongoDB Atlas

1. **Create cluster:** https://www.mongodb.com/cloud/atlas
2. **Whitelist IP:** Add server IP to IP whitelist
3. **Get connection string:** Use in environment variables

#### Redis Cloud

1. **Create Redis database:** https://redis.com
2. **Get connection details:** Use in environment variables

---

### Option 2: Docker Compose (Self-hosted)

#### Dockerfile (Backend)

Create `backend/Dockerfile`:
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Dockerfile (Frontend)

Create `frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### docker-compose.yml

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: capstonesystem

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/capstonesystem
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - mongodb
      - redis

  email-worker:
    build: ./backend
    command: python -m rq worker email email-high email-low --url redis://redis:6379/0
    depends_on:
      - redis
      - backend

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

#### Deploy:

```bash
docker-compose up -d
```

---

### Option 3: AWS (EC2 + RDS + ElastiCache)

#### 1. EC2 Instance

- Launch Ubuntu 22.04 instance
- Security groups: Allow HTTP (80), HTTPS (443), SSH (22)

#### 2. MongoDB (DocumentDB or Atlas)

- Use MongoDB Atlas for simplicity
- Configure VPC peering if using DocumentDB

#### 3. Redis (ElastiCache)

- Create Redis cluster
- Configure security groups

#### 4. Deploy Application

```bash
# SSH into EC2
ssh ubuntu@your-instance

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone repository
git clone https://github.com/Ryuen-1/AEWS---FINAL.git
cd AEWS---FINAL

# Deploy with Docker Compose
docker-compose up -d
```

#### 5. Configure SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Environment Configuration

### Production Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/?appName=Cluster0
MONGODB_DB=capstonesystem

# Frontend
FRONTEND_URL=https://your-domain.com

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com

# Auth
AUTH_TOKEN_SECRET=<strong-random-secret-min-32-chars>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=<redis-password>
```

### Generate Secrets

```bash
# Generate AUTH_TOKEN_SECRET
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate SMTP App Password
# Go to https://myaccount.google.com/apppasswords
```

---

## Post-Deployment Checklist

- [ ] Verify frontend loads
- [ ] Verify backend API is accessible
- [ ] Test login/signup flow
- [ ] Test file uploads
- [ ] Test predictions
- [ ] Test email sending
- [ ] Verify email worker is running
- [ ] Check MongoDB connection
- [ ] Check Redis connection
- [ ] Test rate limiting
- [ ] Verify SSL certificate
- [ ] Test PWA installability
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Set up error tracking (Sentry)

---

## Monitoring

### Health Check Endpoint

Backend provides `/api/health` endpoint for monitoring:

```bash
curl https://your-domain.com/api/health
```

### Log Monitoring

- Backend logs: Check application logs
- Email worker logs: Monitor RQ dashboard
- Error tracking: Set up Sentry

### Performance Monitoring

- Use Lighthouse for frontend performance
- Use APM tools (DataDog, New Relic) for backend

---

## Backup Strategy

### MongoDB Backup

- Use Atlas automated backups
- Or schedule daily backups with mongodump

### Redis Backup

- Enable Redis persistence (AOF)
- Or use Redis Cloud backups

---

## Scaling

### Horizontal Scaling

- Deploy multiple backend instances behind load balancer
- Use Redis for shared state
- Use MongoDB replica set

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Add caching

---

## Troubleshooting

### Backend won't start

- Check MongoDB connection
- Check Redis connection
- Verify environment variables
- Check port availability

### Email not sending

- Verify SMTP credentials
- Check email worker is running
- Check Redis connection
- Check RQ dashboard for failed jobs

### Frontend build fails

- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version (18+)
- Check for conflicting dependencies

### 502 Bad Gateway

- Check if backend is running
- Check Nginx configuration
- Check firewall rules

---

## Rollback

### Quick Rollback

```bash
# Git rollback
git revert HEAD
docker-compose up -d --build
```

### Database Rollback

- Use MongoDB Atlas point-in-time recovery
- Or restore from backup

---

## Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Enable CORS for production domain only
- [ ] Set strong AUTH_TOKEN_SECRET
- [ ] Rotate credentials regularly
- [ ] Enable firewall rules
- [ ] Use managed services (Atlas, Redis Cloud)
- [ ] Enable audit logging
- [ ] Regular security updates
