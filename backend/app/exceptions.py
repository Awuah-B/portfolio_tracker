"""Project-wide custom exceptions."""

class ValidationError(Exception):
    """Raised when validation of input or state fails."""
    pass

class ConfigurationError(Exception):
    """Raised when configuration is invalid or missing."""
    pass

class DatabaseError(Exception):
    """Raised when database operations fail."""
    pass