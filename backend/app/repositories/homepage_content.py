"""Homepage content repository."""

from app.models.homepage_content import HomepageContent
from app.repositories.base import BaseRepository


class HomepageContentRepository(BaseRepository[HomepageContent]):
    model = HomepageContent
