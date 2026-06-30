"""Authentication API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.auth.dependencies import CurrentUser
from app.dependencies.services import get_auth_service
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.common import SuccessResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=SuccessResponse[TokenResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    data: RegisterRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> SuccessResponse[TokenResponse]:
    tokens = await service.register(data)
    return SuccessResponse(message="Registration successful", data=tokens)


@router.post(
    "/login",
    response_model=SuccessResponse[TokenResponse],
    summary="Authenticate and receive JWT tokens",
)
async def login(
    data: LoginRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> SuccessResponse[TokenResponse]:
    tokens = await service.login(data)
    return SuccessResponse(message="Login successful", data=tokens)


@router.post(
    "/refresh",
    response_model=SuccessResponse[TokenResponse],
    summary="Refresh access token using refresh token",
)
async def refresh_token(
    data: RefreshTokenRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> SuccessResponse[TokenResponse]:
    tokens = await service.refresh(data.refresh_token)
    return SuccessResponse(message="Token refreshed", data=tokens)


@router.post(
    "/logout",
    response_model=SuccessResponse[None],
    summary="Logout current user (client-side token discard)",
)
async def logout(_current_user: CurrentUser) -> SuccessResponse[None]:
    return SuccessResponse(message="Logged out successfully")
