"""Gallery image repository."""

from app.models.gallery_image import GalleryImage
from app.repositories.base import BaseRepository


class GalleryImageRepository(BaseRepository[GalleryImage]):
    model = GalleryImage
