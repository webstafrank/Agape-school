import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework.test import APIClient

from .models import MediaItem, youtube_id

User = get_user_model()
URL = "/api/gallery/"
PHOTO_URL = "https://res.cloudinary.com/demo/image/upload/sample.jpg"


@pytest.fixture
def api():
    return APIClient()


def make_item(**kwargs):
    defaults = {"kind": MediaItem.Kind.PHOTO, "title": "Item", "alt_text": "Alt", "url": PHOTO_URL}
    defaults.update(kwargs)
    return MediaItem.objects.create(**defaults)


def test_url_is_routed():
    assert reverse("gallery-list") == URL


def test_new_items_are_unapproved_by_default(db):
    assert make_item().is_approved is False


def test_unapproved_media_never_appears_publicly(api, db):
    make_item(title="Approved photo", is_approved=True)
    make_item(title="Pending photo")
    make_item(title="Pending video", kind=MediaItem.Kind.VIDEO, url="https://youtu.be/dQw4w9WgXcQ")
    for params in ({}, {"kind": "photo"}, {"kind": "video"}):
        res = api.get(URL, params)
        assert res.status_code == 200
        assert "Pending" not in res.content.decode()
    assert [i["title"] for i in api.get(URL).json()] == ["Approved photo"]


def test_unapproving_hides_an_item_again(api, db):
    admin = User.objects.create_user("admin1", password="x", role="admin")
    item = make_item(title="Was public")
    item.approve(admin)
    item.save()
    assert len(api.get(URL).json()) == 1
    item.unapprove()
    item.save()
    assert api.get(URL).json() == []


def test_staff_or_admin_tokens_do_not_reveal_pending_media(api, db):
    # The public endpoint ignores credentials entirely.
    admin = User.objects.create_user("admin2", password="x", role="admin", is_staff=True, is_superuser=True)
    api.force_authenticate(admin)
    make_item(title="Pending")
    assert api.get(URL).json() == []


def test_public_payload_hides_approval_metadata(api, db):
    make_item(is_approved=True)
    item = api.get(URL).json()[0]
    assert set(item) == {"id", "kind", "title", "caption", "alt_text", "url", "poster_url", "width", "height", "youtube_id"}


def test_filter_by_kind_and_youtube_id(api, db):
    make_item(title="P", is_approved=True)
    make_item(title="V", kind=MediaItem.Kind.VIDEO, url="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5", is_approved=True)
    videos = api.get(URL, {"kind": "video"}).json()
    assert [v["title"] for v in videos] == ["V"]
    assert videos[0]["youtube_id"] == "dQw4w9WgXcQ"
    assert api.get(URL, {"kind": "photo"}).json()[0]["youtube_id"] is None


def test_read_only(api, db):
    assert api.post(URL, {"title": "x"}, format="json").status_code == 405


@pytest.mark.parametrize(
    "url,expected",
    [
        ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtube.com/shorts/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"),
        ("https://res.cloudinary.com/demo/video/upload/clip.mp4", None),
        ("https://evil.example/?u=https://youtu.be/dQw4w9WgXcQ", None),
    ],
)
def test_youtube_id(url, expected):
    assert youtube_id(url) == expected


@pytest.mark.parametrize("url", ["http://res.cloudinary.com/a.jpg", "https://random-host.example/a.jpg"])
def test_photo_must_come_from_allowed_https_host(db, url):
    with pytest.raises(ValidationError) as exc:
        MediaItem(kind=MediaItem.Kind.PHOTO, title="t", alt_text="a", url=url).full_clean()
    assert "url" in exc.value.message_dict


def test_video_must_be_https(db):
    with pytest.raises(ValidationError):
        MediaItem(kind=MediaItem.Kind.VIDEO, title="t", alt_text="a", url="http://example.com/v.mp4").full_clean()
    MediaItem(kind=MediaItem.Kind.VIDEO, title="t", alt_text="a", url="https://youtu.be/dQw4w9WgXcQ").full_clean()


def test_admin_approve_action_records_who_approved(client, db):
    admin = User.objects.create_superuser("boss", "boss@example.com", "pw", role="admin")
    client.force_login(admin)
    item = make_item()
    res = client.post(
        "/admin/gallery/mediaitem/",
        {"action": "approve_selected", "_selected_action": [item.pk]},
    )
    assert res.status_code == 302
    item.refresh_from_db()
    assert item.is_approved and item.approved_by == admin and item.approved_at is not None
