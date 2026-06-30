"""FastAPI dependency providers."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.unit_of_work import UnitOfWork
from app.database.session import get_session_factory


async def get_db() -> AsyncGenerator[AsyncSession]:
    """Provide an async database session."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_uow() -> AsyncGenerator[UnitOfWork]:
    """Provide a Unit of Work bound to a database session."""
    factory = get_session_factory()
    async with factory() as session:
        uow = UnitOfWork(session)
        try:
            yield uow
            await uow.commit()
        except Exception:
            await uow.rollback()
            raise
