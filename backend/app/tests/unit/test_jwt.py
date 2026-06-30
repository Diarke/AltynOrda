"""Unit tests for JWT token management."""

import uuid

import pytest

from app.auth.jwt import create_access_token, create_refresh_token, decode_token, extract_user_id
from app.exceptions import AuthenticationException


class TestJWT:
    def test_create_and_decode_access_token(self) -> None:
        user_id = uuid.uuid4()
        token = create_access_token(user_id, role="user")
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["role"] == "user"
        assert payload["type"] == "access"

    def test_create_and_decode_refresh_token(self) -> None:
        user_id = uuid.uuid4()
        token = create_refresh_token(user_id)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "refresh"

    def test_extract_user_id(self) -> None:
        user_id = uuid.uuid4()
        token = create_access_token(user_id, role="user")
        payload = decode_token(token)
        assert extract_user_id(payload) == user_id

    def test_invalid_token_raises(self) -> None:
        with pytest.raises(AuthenticationException):
            decode_token("invalid.token.here")

    def test_extract_user_id_missing_sub(self) -> None:
        with pytest.raises(AuthenticationException):
            extract_user_id({})
