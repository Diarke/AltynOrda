"""Certificate repository."""

import uuid

from sqlalchemy import select

from app.models.certificate import Certificate
from app.repositories.base import BaseRepository


class CertificateRepository(BaseRepository[Certificate]):
    model = Certificate

    async def get_by_user(self, user_id: uuid.UUID) -> list[Certificate]:
        stmt = select(Certificate).where(Certificate.user_id == user_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_code(self, code: str) -> Certificate | None:
        stmt = select(Certificate).where(Certificate.certificate_code == code)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
