from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from core.validators import validate_image_host


class PostQuerySet(models.QuerySet):
    def published(self):
        """Posts that the public website may show."""
        return self.filter(is_published=True, published_at__lte=timezone.now())


class Post(models.Model):
    """A news article or event shown on the public News & Events pages.

    Managed in Django admin for now (admin portal later). Only published
    posts whose publish time has passed are exposed by the API.
    """

    class Kind(models.TextChoices):
        NEWS = "news", "News"
        EVENT = "event", "Event"

    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.NEWS)
    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True, blank=True, help_text="Leave blank to generate from the title.")
    summary = models.CharField(max_length=300, help_text="One or two sentences shown on the listing page.")
    body = models.TextField(help_text="Full text. Separate paragraphs with a blank line.")
    cover_image_url = models.URLField(
        blank=True,
        validators=[validate_image_host],
        help_text="Optional hosted image link (e.g. Cloudinary). Do not use photos of identifiable children without parental consent.",
    )
    cover_image_alt = models.CharField(max_length=200, blank=True, help_text="Describe the image for screen readers.")

    event_start = models.DateTimeField(null=True, blank=True, help_text="Events only: when it starts.")
    event_end = models.DateTimeField(null=True, blank=True, help_text="Events only: when it ends (optional).")
    event_location = models.CharField(max_length=160, blank=True, help_text="Events only.")

    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(default=timezone.now, help_text="Posts scheduled in the future stay hidden until then.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = PostQuerySet.as_manager()

    class Meta:
        ordering = ("-published_at",)

    def __str__(self) -> str:
        return self.title

    def clean(self):
        from django.core.exceptions import ValidationError

        errors = {}
        if self.kind == self.Kind.EVENT and not self.event_start:
            errors["event_start"] = "Events need a start date and time."
        if self.event_start and self.event_end and self.event_end < self.event_start:
            errors["event_end"] = "The end must be after the start."
        if self.cover_image_url and not self.cover_image_alt:
            errors["cover_image_alt"] = "Describe the cover image for screen readers."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:170] or "post"
            slug, n = base, 2
            while Post.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug, n = f"{base}-{n}", n + 1
            self.slug = slug
        super().save(*args, **kwargs)
