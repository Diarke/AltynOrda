"""Certificate API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import CurrentUser
from app.dependencies.services import get_certificate_service
from app.schemas.certificate import CertificateCreateRequest, CertificateResponse
from app.schemas.common import SuccessResponse
from app.services.certificate import CertificateService

router = APIRouter(prefix="/certificates", tags=["Certificates"])


@router.post(
    "",
    response_model=SuccessResponse[CertificateResponse],
    summary="Issue a completion certificate",
)
async def issue_certificate(
    data: CertificateCreateRequest,
    current_user: CurrentUser,
    service: Annotated[CertificateService, Depends(get_certificate_service)],
) -> SuccessResponse[CertificateResponse]:
    cert = await service.issue_certificate(current_user, data)
    return SuccessResponse(message="Certificate issued", data=cert)


@router.get(
    "",
    response_model=SuccessResponse[list[CertificateResponse]],
    summary="List current user certificates",
)
async def list_certificates(
    current_user: CurrentUser,
    service: Annotated[CertificateService, Depends(get_certificate_service)],
) -> SuccessResponse[list[CertificateResponse]]:
    certs = await service.get_user_certificates(current_user)
    return SuccessResponse(data=certs)
