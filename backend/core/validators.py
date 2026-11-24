"""Validators for hosted media URLs.

Media binaries never live in this repo or on this server: admins paste the
URL of a file hosted in cloud storage (e.g. Cloudinary). Images are rendered
with next/image, which only loads from allow-listed hosts, so image URLs must
come from a host in settings.MEDIA_IMAGE_HOSTS (keep it in sync with
IMAGE_REMOTE_HOSTS on the frontend).
"""
from urllib.parse import urlparse

from django.conf import settings
from django.core.exceptions import ValidationError


def validate_https_url(value: str) -> None:
    if urlparse(value).scheme != "https":
        raise ValidationError("Use a secure link that starts with https://.")


def validate_image_host(value: str) -> None:
    validate_https_url(value)
    host = (urlparse(value).hostname or "").lower()
    allowed = settings.MEDIA_IMAGE_HOSTS
    if host not in allowed:
        raise ValidationError(
            f"Images must be hosted on one of: {', '.join(allowed)}. "
            "Upload the image there first, then paste its link."
        )
