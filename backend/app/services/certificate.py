"""Certificate issuance service."""

import secrets
from datetime import UTC, datetime

from app.constants import CERTIFICATE_MIN_COMPLETION_PERCENT
from app.core.unit_of_work import UnitOfWork
from app.enums import NotificationType, QuestStatus
from app.exceptions import ValidationException
from app.i18n.messages import render_certificate
from app.models.certificate import Certificate
from app.models.user import User
from app.schemas.certificate import CertificateCreateRequest, CertificateResponse
from app.services.notification import notify


class CertificateService:
    """Issue completion certificates to users."""

    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def issue_certificate(
        self, user: User, data: CertificateCreateRequest
    ) -> CertificateResponse:
        records = await self._uow.progress.get_by_user(user.id)
        if not records:
            raise ValidationException("No progress records found")

        completed = sum(1 for r in records if r.status == QuestStatus.COMPLETED)
        completion_percent = int(completed / len(records) * 100)

        if completion_percent < CERTIFICATE_MIN_COMPLETION_PERCENT:
            raise ValidationException(
                f"Minimum {CERTIFICATE_MIN_COMPLETION_PERCENT}% completion required. "
                f"Current: {completion_percent}%"
            )

        existing = await self._uow.certificates.get_by_user(user.id)
        if existing:
            return self._to_response(existing[0])

        default_title, description = render_certificate(
            user.language,
            name=user.full_name or user.username,
            percent=completion_percent,
        )
        certificate = Certificate(
            user_id=user.id,
            title=data.title or default_title,
            description=description,
            completion_percent=completion_percent,
            certificate_code=self._generate_code(),
            issued_at=datetime.now(UTC).strftime("%Y-%m-%d"),
        )
        created = await self._uow.certificates.create(certificate)
        await notify(
            self._uow,
            user.id,
            NotificationType.CERTIFICATE_READY,
            user.language,
            entity_type="certificate",
            entity_id=created.id,
            title=created.title,
        )
        return self._to_response(created)

    async def get_user_certificates(self, user: User) -> list[CertificateResponse]:
        certs = await self._uow.certificates.get_by_user(user.id)
        return [self._to_response(c) for c in certs]

    async def verify_certificate(self, code: str) -> CertificateResponse:
        cert = await self._uow.certificates.get_by_code(code)
        if cert is None:
            from app.exceptions import NotFoundException

            raise NotFoundException("Certificate not found")
        return self._to_response(cert)

    @staticmethod
    def _generate_code() -> str:
        return f"ORDA-{secrets.token_hex(8).upper()}"

    @staticmethod
    def _to_response(cert: Certificate) -> CertificateResponse:
        return CertificateResponse(
            id=cert.id,
            user_id=cert.user_id,
            title=cert.title,
            description=cert.description,
            completion_percent=cert.completion_percent,
            certificate_code=cert.certificate_code,
            issued_at=cert.issued_at,
            created_at=cert.created_at,
        )
