from datetime import timedelta

import pytest
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Post

LIST_URL = "/api/news/"


@pytest.fixture
def api():
    return APIClient()


def make_post(**kwargs):
    defaults = {
        "title": "Test post",
        "summary": "Summary",
        "body": "Body",
        "is_published": True,
        "published_at": timezone.now() - timedelta(hours=1),
    }
    defaults.update(kwargs)
    return Post.objects.create(**defaults)


def test_urls_are_routed():
    assert reverse("news-list") == LIST_URL
    assert reverse("news-detail", kwargs={"slug": "abc"}) == "/api/news/abc/"


def test_list_is_public_and_newest_first(api, db):
    older = make_post(title="Older", published_at=timezone.now() - timedelta(days=2))
    newer = make_post(title="Newer")
    res = api.get(LIST_URL)
    assert res.status_code == 200
    assert [p["slug"] for p in res.json()] == [newer.slug, older.slug]


def test_list_ignores_a_bad_token(api, db):
    make_post()
    api.credentials(HTTP_AUTHORIZATION="Bearer expired-or-garbage")
    assert api.get(LIST_URL).status_code == 200


def test_drafts_and_scheduled_posts_are_hidden(api, db):
    make_post(title="Visible")
    draft = make_post(title="Draft", is_published=False)
    scheduled = make_post(title="Scheduled", published_at=timezone.now() + timedelta(days=1))
    assert [p["title"] for p in api.get(LIST_URL).json()] == ["Visible"]
    assert api.get(f"{LIST_URL}{draft.slug}/").status_code == 404
    assert api.get(f"{LIST_URL}{scheduled.slug}/").status_code == 404


def test_filter_by_kind(api, db):
    make_post(title="A news item")
    make_post(title="An event", kind=Post.Kind.EVENT, event_start=timezone.now() + timedelta(days=3))
    res = api.get(LIST_URL, {"kind": "event"})
    assert [p["title"] for p in res.json()] == ["An event"]
    # Unknown kinds are ignored rather than erroring.
    assert len(api.get(LIST_URL, {"kind": "bogus"}).json()) == 2


def test_list_omits_body_but_detail_includes_it(api, db):
    post = make_post(body="Para one.\n\nPara two.")
    assert "body" not in api.get(LIST_URL).json()[0]
    detail = api.get(f"{LIST_URL}{post.slug}/").json()
    assert detail["body"] == "Para one.\n\nPara two."
    assert detail["title"] == "Test post"


def test_api_is_read_only(api, db):
    post = make_post()
    assert api.post(LIST_URL, {"title": "x"}, format="json").status_code == 405
    assert api.delete(f"{LIST_URL}{post.slug}/").status_code == 405


def test_slug_is_generated_and_unique(db):
    a = make_post(title="Sports Day!")
    b = make_post(title="Sports Day!")
    assert a.slug == "sports-day"
    assert b.slug == "sports-day-2"


def test_event_requires_start(db):
    post = Post(kind=Post.Kind.EVENT, title="E", summary="s", body="b")
    with pytest.raises(ValidationError) as exc:
        post.full_clean()
    assert "event_start" in exc.value.message_dict


def test_event_end_must_follow_start(db):
    start = timezone.now()
    post = Post(kind=Post.Kind.EVENT, title="E", summary="s", body="b", event_start=start, event_end=start - timedelta(hours=1))
    with pytest.raises(ValidationError) as exc:
        post.full_clean()
    assert "event_end" in exc.value.message_dict


@pytest.mark.parametrize(
    "url",
    ["http://res.cloudinary.com/demo/image/upload/a.jpg", "https://evil.example/a.jpg"],
)
def test_cover_image_must_be_https_on_allowed_host(db, url):
    post = Post(title="T", summary="s", body="b", cover_image_url=url, cover_image_alt="alt")
    with pytest.raises(ValidationError) as exc:
        post.full_clean()
    assert "cover_image_url" in exc.value.message_dict


def test_cover_image_needs_alt_text(db):
    post = Post(title="T", summary="s", body="b", cover_image_url="https://res.cloudinary.com/demo/image/upload/a.jpg")
    with pytest.raises(ValidationError) as exc:
        post.full_clean()
    assert "cover_image_alt" in exc.value.message_dict


def test_seed_command_is_idempotent_and_labelled(api, db):
    call_command("seed_demo_content")
    call_command("seed_demo_content")
    assert Post.objects.count() == 3
    titles = [p["title"] for p in api.get(LIST_URL).json()]
    assert len(titles) == 3 and all(t.startswith("[Sample]") for t in titles)
