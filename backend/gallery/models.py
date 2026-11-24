import re

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.validators import validate_https_url, validate_image_host

YOUTUBE_RE = re.compile(
    r"^https://(?:www\.)?(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{11})(?:[?&#].*)?$"
)


def youtube_id(url: str) -> str | None:
    m = YOUTUBE_RE.match(url)
    return m.group(1) if m else None


class MediaItemQuerySet(models.QuerySet):
    def approved(self):
        """The ONLY queryset the public site may read from."""
        return self.filter(is_approved=True)


class MediaItem(models.Model):
    """A gallery photo or video, hosted in cloud storage and linked by URL.

    New items are hidden until an admin approves them — this site involves
    children, so nothing appears publicly without that check.
    """

    class Kind(models.TextChoices):
        PHOTO = "photo", "Photo"
        VIDEO = "video", "Video"

    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.PHOTO)
    title = models.CharField(max_length=120)
    caption = models.CharField(max_length=300, blank=True)
    alt_text = models.CharField(
        max_length=200,
        help_text="Describe what the photo/video shows, for screen readers. Do not name children.",
    )
    url = models.URLField(
        help_text=(
            "Photos: an image link from the allowed image host (e.g. Cloudinary). "
            "Videos: a YouTube link or a direct https link to a video file."
        ),
    )
    poster_url = models.URLField(
        blank=True,
        validators=[validate_image_host],
        help_text="Videos only, optional: a preview image (not needed for YouTube).",
    )
    width = models.PositiveIntegerField(null=True, blank=True, help_text="Photos only, optional: original width in pixels.")
    height = models.PositiveIntegerField(null=True, blank=True, help_text="Photos only, optional: original height in pixels.")
    sort_order = models.IntegerField(default=0, help_text="Lower numbers show first.")

    is_approved = models.BooleanField(
        default=False,
        help_text="Only approve media with parental consent for any identifiable child.",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+", editable=False
    )
    approved_at = models.DateTimeField(null=True, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = MediaItemQuerySet.as_manager()

    class Meta:
        ordering = ("sort_order", "-created_at")
        verbose_name = "gallery item"

    def __str__(self) -> str:
        return f"{self.get_kind_display()}: {self.title}"

    def clean(self):
        try:
            if self.kind == self.Kind.PHOTO:
                validate_image_host(self.url)
            else:
                validate_https_url(self.url)
        except ValidationError as e:
            raise ValidationError({"url": e.messages})

    def approve(self, user) -> None:
        self.is_approved = True
        self.approved_by = user
        self.approved_at = timezone.now()

    def unapprove(self) -> None:
        self.is_approved = False
        self.approved_by = None
        self.approved_at = None
