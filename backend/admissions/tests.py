import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

from .models import Enquiry

User = get_user_model()
URL = "/api/admissions/enquiries/"

VALID = {
    "parent_name": "Test Parent",
    "phone": "+254 700 000 001",
    "email": "parent@example.com",
    "child_first_name": "Testchild",
    "grade": "grade-3",
    "start_term": "January 2027",
    "message": "We'd like to visit.",
}


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    # Throttle counts live in the cache; isolate each test.
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api():
    return APIClient()


def test_url_is_routed():
    assert reverse("admissions-enquiry-create") == URL


def test_valid_enquiry_is_saved(api, db):
    res = api.post(URL, VALID, format="json")
    assert res.status_code == 201
    enquiry = Enquiry.objects.get()
    assert enquiry.parent_name == "Test Parent"
    assert enquiry.grade == Enquiry.Grade.GRADE_3
    assert enquiry.status == Enquiry.Status.NEW


def test_response_does_not_echo_personal_data(api, db):
    res = api.post(URL, VALID, format="json")
    assert res.json() == {"ok": True}


def test_only_child_first_name_is_stored(api, db):
    api.post(URL, {**VALID, "child_first_name": "Testchild Middlename Surname"}, format="json")
    assert Enquiry.objects.get().child_first_name == "Testchild"


@pytest.mark.parametrize("field", ["parent_name", "phone", "child_first_name", "grade"])
def test_required_fields(api, db, field):
    data = {k: v for k, v in VALID.items() if k != field}
    res = api.post(URL, data, format="json")
    assert res.status_code == 400
    assert field in res.json()
    assert not Enquiry.objects.exists()


@pytest.mark.parametrize(
    "field,value",
    [("grade", "grade-12"), ("email", "not-an-email"), ("phone", "call me"), ("message", "x" * 2001)],
)
def test_invalid_values_rejected(api, db, field, value):
    res = api.post(URL, {**VALID, field: value}, format="json")
    assert res.status_code == 400
    assert field in res.json()


def test_honeypot_pretends_success_but_saves_nothing(api, db):
    res = api.post(URL, {**VALID, "website": "http://spam.example"}, format="json")
    assert res.status_code == 201
    assert not Enquiry.objects.exists()


def test_rate_limited_per_client(api, db, monkeypatch):
    from rest_framework.throttling import ScopedRateThrottle

    # DRF reads rates into the class at import time, so patch them there.
    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", {"enquiries": "2/hour"})
    assert api.post(URL, VALID, format="json").status_code == 201
    assert api.post(URL, VALID, format="json").status_code == 201
    assert api.post(URL, VALID, format="json").status_code == 429
    assert Enquiry.objects.count() == 2


def test_expired_token_does_not_block_public_form(api, db):
    api.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
    assert api.post(URL, VALID, format="json").status_code == 201


# ---- Access: enquiries hold family contact details; never readable via the API ----

@pytest.mark.parametrize("method", ["get", "put", "patch", "delete"])
def test_anonymous_cannot_read_or_modify(api, db, method):
    Enquiry.objects.create(**VALID)
    res = getattr(api, method)(URL)
    assert res.status_code == 405


@pytest.mark.parametrize("role", ["student", "staff"])
def test_logged_in_non_admins_cannot_list(api, db, role):
    Enquiry.objects.create(**VALID)
    user = User.objects.create_user(username=f"u-{role}", password="pw-not-real-123", role=role)
    api.force_authenticate(user)
    res = api.get(URL)
    assert res.status_code == 405
    assert "Test Parent" not in res.content.decode()


def test_admin_site_lists_enquiries_for_superuser(client, db):
    Enquiry.objects.create(**VALID)
    admin = User.objects.create_superuser(username="admin", password="pw-not-real-123", email="a@example.com")
    client.force_login(admin)
    res = client.get("/admin/admissions/enquiry/")
    assert res.status_code == 200
    assert "Test Parent" in res.content.decode()


def test_admin_site_hidden_from_non_staff(client, db):
    Enquiry.objects.create(**VALID)
    user = User.objects.create_user(username="pupil", password="pw-not-real-123")
    client.force_login(user)
    res = client.get("/admin/admissions/enquiry/")
    assert res.status_code == 302  # redirected to admin login


# ---- CORS ----

def test_cors_allows_configured_frontend_origin(api, db):
    res = api.options(URL, HTTP_ORIGIN="http://localhost:3000", HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST")
    assert res["Access-Control-Allow-Origin"] == "http://localhost:3000"


def test_cors_blocks_unknown_origin(api, db):
    res = api.options(URL, HTTP_ORIGIN="https://evil.example", HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST")
    assert "Access-Control-Allow-Origin" not in res
