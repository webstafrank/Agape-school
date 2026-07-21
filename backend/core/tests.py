from django.urls import reverse
from rest_framework.test import APIClient


def test_health_is_public_and_ok():
    resp = APIClient().get(reverse("health"))
    assert resp.status_code == 200
    assert resp.data == {"status": "ok"}
