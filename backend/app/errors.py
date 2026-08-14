"""Custom error classes for consistent error handling across the application."""


class AppError(Exception):
    """Base application error with status code and message."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ValidationError(AppError):
    """Invalid input or request data."""

    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class NotFoundError(AppError):
    """Resource not found."""

    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", status_code=404)


class AuthenticationError(AppError):
    """Authentication failed."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class AuthorizationError(AppError):
    """Access denied/forbidden."""

    def __init__(self, message: str = "Access denied"):
        super().__init__(message, status_code=403)


class FileUploadError(AppError):
    """File upload failed due to validation or processing error."""

    def __init__(self, message: str):
        super().__init__(message, status_code=415)


class ConflictError(AppError):
    """Resource conflict (e.g., duplicate entry)."""

    def __init__(self, message: str):
        super().__init__(message, status_code=409)


class RateLimitError(AppError):
    """Rate limit exceeded."""

    def __init__(self, message: str = "Rate limit exceeded. Please try again later."):
        super().__init__(message, status_code=429)
