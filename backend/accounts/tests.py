import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    # Login throttle counts live in the cache; isolate each test.
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


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


# ---- Portal sign-in support ----

def test_createsuperuser_gets_admin_role(db):
    boss = User.objects.create_superuser("boss", "boss@example.com", "pw-not-real-123")
    assert boss.role == User.Role.ADMIN


def test_superuser_role_can_still_be_set_explicitly(db):
    u = User.objects.create_superuser("tech", "t@example.com", "pw-not-real-123", role=User.Role.STAFF)
    assert u.role == User.Role.STAFF


def test_me_includes_names_for_the_portal_greeting(api, db):
    user = User.objects.create_user(username="ADM001", password="pw-not-real-123", first_name="Testa", last_name="Pupil")
    api.force_authenticate(user)
    data = api.get(reverse("me")).json()
    assert data["first_name"] == "Testa" and data["last_name"] == "Pupil"


def test_login_attempts_are_throttled(api, db):
    User.objects.create_user(username="dave", password="pw-not-real-123")
    url = reverse("token_obtain_pair")
    codes = [
        api.post(url, {"username": "dave", "password": "wrong"}, format="json").status_code
        for _ in range(11)
    ]
    assert codes[:10] == [401] * 10
    assert codes[10] == 429
    # Even the right password is refused until the window passes.
    ok = api.post(url, {"username": "dave", "password": "pw-not-real-123"}, format="json")
    assert ok.status_code == 429


# ---- Django admin: create users and manage passwords ----

def test_admin_creates_user_with_role_and_password_that_can_sign_in(api, client, db):
    boss = User.objects.create_superuser("boss", "boss@example.com", "Boss-pw-not-real-1")
    client.force_login(boss)

    resp = client.post(reverse("admin:accounts_user_add"), {
        "username": "TEST-STAFF-09", "usable_password": "true",
        "password1": "Staff-pw-not-real-2", "password2": "Staff-pw-not-real-2",
        "role": "staff", "first_name": "Tutor", "last_name": "Example", "_save": "Save",
    })
    assert resp.status_code == 302
    user = User.objects.get(username="TEST-STAFF-09")
    assert user.role == User.Role.STAFF

    login = api.post(reverse("token_obtain_pair"),
                     {"username": "TEST-STAFF-09", "password": "Staff-pw-not-real-2"}, format="json")
    assert login.status_code == 200 and login.data["role"] == "staff"

    # Password reset from the admin's "Reset password" page replaces the old one.
    resp = client.post(reverse("admin:auth_user_password_change", args=[user.pk]), {
        "usable_password": "true", "password1": "New-pw-not-real-3", "password2": "New-pw-not-real-3",
    })
    assert resp.status_code == 302
    old = api.post(reverse("token_obtain_pair"),
                   {"username": "TEST-STAFF-09", "password": "Staff-pw-not-real-2"}, format="json")
    assert old.status_code == 401
    new = api.post(reverse("token_obtain_pair"),
                   {"username": "TEST-STAFF-09", "password": "New-pw-not-real-3"}, format="json")
    assert new.status_code == 200
