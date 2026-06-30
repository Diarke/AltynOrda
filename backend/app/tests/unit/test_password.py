"""Unit tests for password hashing."""

from app.auth.password import hash_password, verify_password


class TestPasswordHashing:
    def test_hash_password_returns_argon2_hash(self) -> None:
        hashed = hash_password("securepassword123")
        assert hashed.startswith("$argon2")
        assert "securepassword123" not in hashed

    def test_verify_password_correct(self) -> None:
        plain = "mysecretpassword"
        hashed = hash_password(plain)
        assert verify_password(plain, hashed) is True

    def test_verify_password_incorrect(self) -> None:
        hashed = hash_password("correctpassword")
        assert verify_password("wrongpassword", hashed) is False

    def test_different_hashes_for_same_password(self) -> None:
        plain = "samepassword123"
        hash1 = hash_password(plain)
        hash2 = hash_password(plain)
        assert hash1 != hash2
        assert verify_password(plain, hash1)
        assert verify_password(plain, hash2)
