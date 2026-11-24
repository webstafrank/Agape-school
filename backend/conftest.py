import pytest


@pytest.fixture(autouse=True)
def fast_password_hashing(settings):
    # Real hashers are deliberately slow; tests don't need that (test-only).
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
