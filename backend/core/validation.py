"""Validation states.

Tracks the lifecycle of an agent execution through validation:
pending -> validating -> valid / invalid / needs_revision.
"""

from __future__ import annotations

from enum import Enum


class ValidationState(str, Enum):
    PENDING = "pending"
    VALIDATING = "validating"
    VALID = "valid"
    INVALID = "invalid"
    NEEDS_REVISION = "needs_revision"
