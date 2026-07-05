"""Storage service for MinIO-backed image uploads."""

from __future__ import annotations

import uuid

from fastapi import UploadFile

from app.config import get_settings
from app.schemas.admin import AdminUploadResponse


class StorageService:
    """Upload images to object storage and return public URLs."""

    def __init__(self) -> None:
        self._settings = get_settings()

    async def upload_image(self, file: UploadFile) -> AdminUploadResponse:
        content = await file.read()
        if not content:
            raise ValueError("Image content is empty")

        key = f"uploads/{uuid.uuid4()}-{file.filename or 'image'}"
        url = self._build_public_url(key)
        if self._settings.minio_endpoint and self._settings.minio_access_key:
            self._upload_to_minio(content, key, file.content_type or "application/octet-stream")
        return AdminUploadResponse(url=url, bucket=self._settings.minio_bucket_name, key=key)

    def _build_public_url(self, key: str) -> str:
        if self._settings.minio_public_url:
            return f"{self._settings.minio_public_url.rstrip('/')}/{key}"
        return f"/uploads/{key}"

    def _upload_to_minio(self, content: bytes, key: str, content_type: str) -> None:
        try:
            from minio import Minio
        except ImportError as exc:  # pragma: no cover - optional dependency path
            raise RuntimeError("MinIO client is not installed") from exc

        client = Minio(
            self._settings.minio_endpoint,
            access_key=self._settings.minio_access_key,
            secret_key=self._settings.minio_secret_key,
            secure=self._settings.minio_secure,
        )
        client.put_object(
            self._settings.minio_bucket_name,
            key,
            content,
            length=len(content),
            content_type=content_type,
        )
