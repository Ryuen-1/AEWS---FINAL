"""
Email queue worker configuration.
This module sets up RQ (Redis Queue) for async email processing.
"""
import os
from redis import Redis
from rq import Queue
from dotenv import load_dotenv

load_dotenv()

# Redis connection
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

# Create Redis connection
redis_conn = Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=REDIS_DB,
    password=REDIS_PASSWORD,
    decode_responses=True
)

# Create email queue
email_queue = Queue('email', connection=redis_conn, default_timeout=3600)

# Create high-priority email queue
high_priority_email_queue = Queue('email-high', connection=redis_conn, default_timeout=3600)

# Create low-priority email queue
low_priority_email_queue = Queue('email-low', connection=redis_conn, default_timeout=3600)
