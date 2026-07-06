"""Storage service for MinIO-backed image uploads."""

from __future__ import annotations

import asyncio
import io
import json
import logging
import uuid

from fastapi import UploadFile

from app.config import get_settings
from app.exceptions import BaseAppException
from app.schemas.admin import AdminUploadResponse

logger = logging.getLogger(__name__)


class StorageService:
    """Upload images to object storage (MinIO/S3-compatible) and return public URLs."""

    _client = None
    _bucket_ready = False

    def __init__(self) -> None:
        self._settings = get_settings()

    def _get_client(self):
        if StorageService._client is None:
            try:
                from minio import Minio
            except ImportError as exc:  # pragma: no cover - dependency is declared in pyproject
                raise BaseAppException(
                    "Image storage is unavailable: MinIO client is not installed",
                    status_code=503,
                ) from exc
            StorageService._client = Minio(
                self._settings.minio_endpoint,
                access_key=self._settings.minio_access_key,
                secret_key=self._settings.minio_secret_key,
                secure=self._settings.minio_secure,
            )
        return StorageService._client

    def _ensure_bucket_sync(self) -> None:
        """Create the bucket and set a public-read policy if it doesn't exist yet.

        These are public marketing/gallery/city/artifact images, so a public-read
        policy on the whole bucket is the intended, standard behavior — not a
        security concern.
        """
        client = self._get_client()
        bucket = self._settings.minio_bucket_name
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": ["*"]},
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{bucket}/*"],
                    }
                ],
            }
            client.set_bucket_policy(bucket, json.dumps(policy))
        StorageService._bucket_ready = True

    async def _ensure_bucket(self) -> None:
        if not StorageService._bucket_ready:
            await asyncio.to_thread(self._ensure_bucket_sync)

    async def upload_image(self, file: UploadFile) -> AdminUploadResponse:
        content = await file.read()
        if not content:
            raise BaseAppException("Image content is empty", status_code=422)

        key = f"uploads/{uuid.uuid4()}-{file.filename or 'image'}"
        await self._upload_to_minio(content, key, file.content_type or "application/octet-stream")
        url = self._build_public_url(key)
        return AdminUploadResponse(url=url, bucket=self._settings.minio_bucket_name, key=key)

    async def delete_image(self, key: str) -> None:
        try:
            await self._ensure_bucket()
            client = self._get_client()
            await asyncio.to_thread(client.remove_object, self._settings.minio_bucket_name, key)
        except BaseAppException:
            raise
        except Exception:  # noqa: BLE001 - best-effort delete, never block the request
            logger.warning("Failed to delete storage object %s", key, exc_info=True)

    async def delete_by_url(self, url: str | None) -> None:
        """Best-effort delete for a URL previously returned by upload_image.

        Silently no-ops for URLs that don't look like ours (e.g. an admin pasted
        an external image URL directly instead of uploading one).
        """
        key = self._extract_key(url)
        if key is not None:
            await self.delete_image(key)

    @staticmethod
    def _extract_key(url: str | None) -> str | None:
        # Every key produced by upload_image is prefixed "uploads/", regardless
        # of whether the final URL is MinIO-absolute or the local dev fallback.
        if not url or "uploads/" not in url:
            return None
        return url[url.index("uploads/") :]

    def _build_public_url(self, key: str) -> str:
        if self._settings.minio_public_url:
            return f"{self._settings.minio_public_url.rstrip('/')}/{key}"
        return f"/uploads/{key}"

    async def _upload_to_minio(self, content: bytes, key: str, content_type: str) -> None:
        await self._ensure_bucket()
        client = self._get_client()
        try:
            await asyncio.to_thread(
                client.put_object,
                self._settings.minio_bucket_name,
                key,
                io.BytesIO(content),
                length=len(content),
                content_type=content_type,
            )
        except BaseAppException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise BaseAppException(
                "Image storage is unavailable, please try again", status_code=503
            ) from exc
