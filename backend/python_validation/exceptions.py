"""Pipeline 2 exception types."""


class ValidationError(Exception):
    """Base class for Pipeline 2 validation errors."""


class SchemaValidationError(ValidationError):
    """Raised when the generated plan fails structural schema validation."""


class MissingGroundTruthError(ValidationError):
    """Raised when no Role Requirement Matrix rows are available for the role."""


class ContextBuildError(ValidationError):
    """Raised when the trusted validation context cannot be assembled."""
