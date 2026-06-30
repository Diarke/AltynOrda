"""Structured logging configuration."""

import logging
import sys
from typing import Any

from app.config import get_settings


class SensitiveDataFilter(logging.Filter):
    """Filter out sensitive fields from log records."""

    SENSITIVE_KEYS = frozenset({"password", "token", "secret", "authorization", "api_key"})

    def filter(self, record: logging.LogRecord) -> bool:
        if hasattr(record, "extra") and isinstance(record.extra, dict):
            record.extra = self._redact(record.extra)
        return True

    def _redact(self, data: dict[str, Any]) -> dict[str, Any]:
        return {
            key: ("***REDACTED***" if key.lower() in self.SENSITIVE_KEYS else value)
            for key, value in data.items()
        }


def setup_logging() -> None:
    """Configure structured logging for the application."""
    settings = get_settings()
    level = logging.DEBUG if settings.debug else logging.INFO

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.addFilter(SensitiveDataFilter())

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)

    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.db_echo else logging.WARNING
    )
