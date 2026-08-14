# Email Queue Worker

This directory contains the background email worker for the Academic Early Warning System.

## Overview

The email queue uses RQ (Redis Queue) to send emails asynchronously with automatic retry logic. This prevents the API from blocking while waiting for email delivery and improves reliability.

## Features

- **Async email sending**: Emails are queued and sent by background workers
- **Retry logic**: Failed emails are automatically retried with exponential backoff
- **Priority queues**: High, normal, and low priority queues for different email types
- **Failure tracking**: Failed emails are logged for manual review

## Setup

### 1. Install Redis

**Windows:**
```bash
# Download Redis for Windows from https://github.com/microsoftarchive/redis/releases
# Or use Docker:
docker run -d -p 6379:6379 redis
```

**Linux/Mac:**
```bash
# Using Homebrew (Mac)
brew install redis
brew services start redis

# Using apt (Ubuntu/Debian)
sudo apt-get install redis-server
sudo systemctl start redis
```

### 2. Install Python Dependencies

```bash
cd backend
pip install rq redis
```

### 3. Configure Redis

Add to your `.env` file:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
# REDIS_PASSWORD=your-redis-password (if required)
```

### 4. Start the Redis Server

```bash
redis-server
```

### 5. Start the Email Worker

```bash
cd backend
python -m rq worker email email-high email-low --url redis://localhost:6379/0
```

Or with a configuration file:
```bash
python -m rq worker -c worker_settings email email-high email-low
```

## Email Queues

- **email**: Normal priority emails (verification, account decisions, needs assessment)
- **email-high**: High priority emails (password resets)
- **email-low**: Low priority emails (bulk notifications, newsletters)

## Usage in Code

Instead of calling email functions directly, use the queue functions:

```python
from app.email_worker import queue_verification_email, queue_password_reset_email

# Queue a verification email (normal priority)
queue_verification_email(
    to_email="user@example.com",
    verification_link="http://example.com/verify?token=abc123",
    user_name="John Doe",
    priority="normal"
)

# Queue a password reset email (high priority - default)
queue_password_reset_email(
    to_email="user@example.com",
    reset_link="http://example.com/reset?token=xyz789",
    user_name="John Doe",
    priority="high"
)
```

## Monitoring

### RQ Dashboard

Install the RQ dashboard:
```bash
pip install rq-dashboard
```

Start the dashboard:
```bash
rq-dashboard --port 9181
```

Visit http://localhost:9181 to view:
- Queue status
- Job history
- Failed jobs
- Worker status

### Check Queue Status

```python
from app.email_queue import email_queue, high_priority_email_queue, low_priority_email_queue

# Check queue length
print(f"Normal queue: {email_queue.count}")
print(f"High priority queue: {high_priority_email_queue.count}")
print(f"Low priority queue: {low_priority_email_queue.count}")

# Check failed jobs
from rq import FailedJobRegistry
failed_registry = FailedJobRegistry(queue=email_queue)
print(f"Failed jobs: {len(failed_registry)}")
```

## Retry Logic

Emails are retried with the following configuration:
- **Max retries**: 3 attempts
- **Initial delay**: 1 second
- **Backoff factor**: 2x (exponential)
- **Total max wait time**: 1 + 2 + 4 = 7 seconds

## Production Deployment

### Using Supervisor (Linux)

Create `/etc/supervisor/conf.d/email-worker.conf`:
```ini
[program:email-worker]
command=/path/to/python -m rq worker email email-high email-low --url redis://localhost:6379/0
directory=/path/to/backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/email-worker.err.log
stdout_logfile=/var/log/email-worker.out.log
```

### Using systemd (Linux)

Create `/etc/systemd/system/email-worker.service`:
```ini
[Unit]
Description=Email Queue Worker
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
ExecStart=/path/to/python -m rq worker email email-high email-low --url redis://localhost:6379/0
Restart=always

[Install]
WantedBy=multi-user.target
```

Start the service:
```bash
sudo systemctl start email-worker
sudo systemctl enable email-worker
```

## Troubleshooting

### Worker not processing jobs

1. Check Redis is running: `redis-cli ping`
2. Check worker is running: `ps aux | grep rq`
3. Check worker logs
4. Check queue length in RQ dashboard

### Emails not sending

1. Check SMTP configuration in `.env`
2. Check SMTP credentials are correct
3. Check firewall allows SMTP traffic
4. Check worker logs for error messages

### Redis connection refused

1. Ensure Redis server is running
2. Check Redis host/port in `.env`
3. Check Redis password if required

## Migration from Sync to Async

To migrate existing synchronous email calls to async:

**Before:**
```python
from app.email_sender import send_verification_email

success, error = send_verification_email(email, link, name)
```

**After:**
```python
from app.email_worker import queue_verification_email

queue_verification_email(email, link, name, priority="normal")
# Email is sent asynchronously by background worker
```

## Security Notes

- Redis should be secured with a password in production
- Use Redis ACLs to restrict access
- Run Redis on a non-standard port if possible
- Use TLS for Redis connections in production
- Keep SMTP credentials secure in `.env`
