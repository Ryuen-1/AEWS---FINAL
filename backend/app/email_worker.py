"""
Email worker functions for RQ (Redis Queue).
These functions are executed by background workers to send emails asynchronously.
"""
import logging
import time
from typing import Callable

from app.email_sender import (
    send_verification_email,
    send_password_reset_email,
    send_account_decision_email,
    send_student_support_email,
    send_needs_assessment_email,
)

logger = logging.getLogger(__name__)


def send_email_with_retry(
    email_func: Callable,
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    *args,
    **kwargs
) -> tuple[bool, str | None]:
    """
    Send email with retry logic and exponential backoff.
    
    Args:
        email_func: The email sending function to call
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay between retries in seconds
        backoff_factor: Multiplier for exponential backoff
        *args, **kwargs: Arguments to pass to email_func
    
    Returns:
        tuple[bool, str | None]: (success, error_message)
    """
    last_error = None
    
    for attempt in range(max_retries + 1):
        try:
            success, error = email_func(*args, **kwargs)
            if success:
                logger.info(f"Email sent successfully on attempt {attempt + 1}")
                return True, None
            else:
                last_error = error
                logger.warning(f"Email send failed on attempt {attempt + 1}: {error}")
        except Exception as e:
            last_error = str(e)
            logger.exception(f"Email send exception on attempt {attempt + 1}: {e}")
        
        # Don't sleep after the last attempt
        if attempt < max_retries:
            delay = initial_delay * (backoff_factor ** attempt)
            logger.info(f"Retrying in {delay} seconds...")
            time.sleep(delay)
    
    logger.error(f"Email failed after {max_retries + 1} attempts. Last error: {last_error}")
    return False, last_error


def queue_verification_email(to_email: str, verification_link: str, user_name: str, priority: str = "normal"):
    """
    Queue a verification email to be sent asynchronously.
    
    Args:
        to_email: Recipient email address
        verification_link: Verification link
        user_name: Recipient name
        priority: Queue priority ("high", "normal", "low")
    """
    from app.email_queue import email_queue, high_priority_email_queue, low_priority_email_queue
    
    queue_map = {
        "high": high_priority_email_queue,
        "normal": email_queue,
        "low": low_priority_email_queue,
    }
    
    queue = queue_map.get(priority, email_queue)
    
    queue.enqueue(
        send_email_with_retry,
        send_verification_email,
        to_email,
        verification_link,
        user_name,
        job_timeout=300,
    )
    
    logger.info(f"Queued verification email to {to_email} with priority {priority}")


def queue_password_reset_email(to_email: str, reset_link: str, user_name: str, priority: str = "high"):
    """
    Queue a password reset email to be sent asynchronously.
    
    Args:
        to_email: Recipient email address
        reset_link: Password reset link
        user_name: Recipient name
        priority: Queue priority (default "high" for password resets)
    """
    from app.email_queue import email_queue, high_priority_email_queue, low_priority_email_queue
    
    queue_map = {
        "high": high_priority_email_queue,
        "normal": email_queue,
        "low": low_priority_email_queue,
    }
    
    queue = queue_map.get(priority, high_priority_email_queue)
    
    queue.enqueue(
        send_email_with_retry,
        send_password_reset_email,
        to_email,
        reset_link,
        user_name,
        job_timeout=300,
    )
    
    logger.info(f"Queued password reset email to {to_email} with priority {priority}")


def queue_account_decision_email(to_email: str, user_name: str, approved: bool, priority: str = "normal"):
    """
    Queue an account decision email to be sent asynchronously.
    
    Args:
        to_email: Recipient email address
        user_name: Recipient name
        approved: Whether account was approved
        priority: Queue priority
    """
    from app.email_queue import email_queue, high_priority_email_queue, low_priority_email_queue
    
    queue_map = {
        "high": high_priority_email_queue,
        "normal": email_queue,
        "low": low_priority_email_queue,
    }
    
    queue = queue_map.get(priority, email_queue)
    
    queue.enqueue(
        send_email_with_retry,
        send_account_decision_email,
        to_email,
        user_name,
        approved,
        job_timeout=300,
    )
    
    logger.info(f"Queued account decision email to {to_email} with priority {priority}")


def queue_student_support_email(to_email: str, user_name: str, subject: str, message: str, priority: str = "normal"):
    """
    Queue a student support email to be sent asynchronously.
    
    Args:
        to_email: Recipient email address
        user_name: Recipient name
        subject: Email subject
        message: Email message
        priority: Queue priority
    """
    from app.email_queue import email_queue, high_priority_email_queue, low_priority_email_queue
    
    queue_map = {
        "high": high_priority_email_queue,
        "normal": email_queue,
        "low": low_priority_email_queue,
    }
    
    queue = queue_map.get(priority, email_queue)
    
    queue.enqueue(
        send_email_with_retry,
        send_student_support_email,
        to_email,
        user_name,
        subject,
        message,
        job_timeout=300,
    )
    
    logger.info(f"Queued student support email to {to_email} with priority {priority}")


def queue_needs_assessment_email(
    to_email: str,
    user_name: str,
    form_link: str,
    custom_message: str | None = None,
    priority: str = "normal",
):
    """
    Queue a needs assessment email to be sent asynchronously.
    
    Args:
        to_email: Recipient email address
        user_name: Recipient name
        form_link: Form link
        custom_message: Optional custom message
        priority: Queue priority
    """
    from app.email_queue import email_queue, high_priority_email_queue, low_priority_email_queue
    
    queue_map = {
        "high": high_priority_email_queue,
        "normal": email_queue,
        "low": low_priority_email_queue,
    }
    
    queue = queue_map.get(priority, email_queue)
    
    queue.enqueue(
        send_email_with_retry,
        send_needs_assessment_email,
        to_email,
        user_name,
        form_link,
        custom_message,
        job_timeout=300,
    )
    
    logger.info(f"Queued needs assessment email to {to_email} with priority {priority}")
