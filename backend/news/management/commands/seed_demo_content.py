from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from news.models import Post

SAMPLES = [
    {
        "slug": "sample-welcome-back-term-one",
        "kind": Post.Kind.NEWS,
        "title": "[Sample] Welcome back for Term One",
        "summary": "Sample post — replace in the admin. Classes resume with new reading corners in every Kindergarten room.",
        "body": (
            "This is sample text so the News page has something to show. Edit or delete it in the Django admin.\n\n"
            "We are delighted to welcome all our learners back for the new term. Our Kindergarten classrooms now "
            "have reading corners, and the Primary section has a refreshed science area."
        ),
        "days_ago": 3,
    },
    {
        "slug": "sample-junior-secondary-science-fair",
        "kind": Post.Kind.EVENT,
        "title": "[Sample] Junior Secondary Science Fair",
        "summary": "Sample event — replace in the admin. Grade 7–9 learners present their projects to parents.",
        "body": (
            "This is a sample event. Edit or delete it in the Django admin.\n\n"
            "Parents and guardians are invited to see the projects our Junior Secondary learners have built this term."
        ),
        "days_ago": 1,
        "event_in_days": 21,
        "event_location": "School hall",
    },
    {
        "slug": "sample-sports-day",
        "kind": Post.Kind.EVENT,
        "title": "[Sample] Annual Sports Day",
        "summary": "Sample event — replace in the admin. A morning of races, games, and team spirit for every section.",
        "body": (
            "This is a sample event. Edit or delete it in the Django admin.\n\n"
            "Families are welcome to cheer on all three sections. Please bring water and a hat."
        ),
        "days_ago": 0,
        "event_in_days": 35,
        "event_location": "School field",
    },
]


class Command(BaseCommand):
    help = "Create clearly labelled sample news and events (safe to run repeatedly). Development/demo only."

    def handle(self, *args, **options):
        now = timezone.now()
        created = 0
        for sample in SAMPLES:
            data = dict(sample)
            slug = data.pop("slug")
            days_ago = data.pop("days_ago")
            event_in_days = data.pop("event_in_days", None)
            data["published_at"] = now - timedelta(days=days_ago)
            data["is_published"] = True
            if event_in_days is not None:
                local = timezone.localtime(now + timedelta(days=event_in_days))
                start = local.replace(hour=9, minute=0, second=0, microsecond=0)
                data["event_start"] = start
                data["event_end"] = start + timedelta(hours=4)
            _, was_created = Post.objects.get_or_create(slug=slug, defaults=data)
            created += was_created
        self.stdout.write(self.style.SUCCESS(f"Sample content ready ({created} new post(s))."))
