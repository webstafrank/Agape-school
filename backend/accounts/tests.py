import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


def test_user_defaults_to_student_role(db):
    user = User.objects.create_user(username="pupil", password="pw-not-real-123")
    assert user.role == User.Role.STUDENT
    assert user.is_student and not user.is_admin_role


def test_role_choices_enforced(db):
    staff = User.objects.create_user(
        username="teacher", password="pw-not-real-123", role=User.Role.STAFF
    )
    assert staff.is_staff_member


# ---- JWT auth ----

def test_login_returns_tokens_and_role(api, db):
    User.objects.create_user(
        username="alice", password="pw-not-real-123", role=User.Role.STAFF
    )
    resp = api.post(
        reverse("token_obtain_pair"),
        {"username": "alice", "password": "pw-not-real-123"},
        format="json",
    )
    assert resp.status_code == 200
    assert "access" in resp.data and "refresh" in resp.data
    assert resp.data["role"] == "staff"


def test_login_with_bad_password_is_rejected(api, db):
    User.objects.create_user(username="bob", password="pw-not-real-123")
    resp = api.post(
        reverse("token_obtain_pair"),
        {"username": "bob", "password": "wrong-password"},
        format="json",
    )
    assert resp.status_code == 401


def test_me_requires_authentication(api, db):
    # Forbidden path: no token -> 401.
    resp = api.get(reverse("me"))
    assert resp.status_code == 401


def test_me_returns_own_profile_when_authenticated(api, db):
    User.objects.create_user(
        username="carol", password="pw-not-real-123", role=User.Role.ADMIN
    )
    token = api.post(
        reverse("token_obtain_pair"),
        {"username": "carol", "password": "pw-not-real-123"},
        format="json",
    ).data["access"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    resp = api.get(reverse("me"))
    assert resp.status_code == 200
    assert resp.data["username"] == "carol"
    assert resp.data["role"] == "admin"
