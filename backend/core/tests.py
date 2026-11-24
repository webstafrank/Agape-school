from django.urls import reverse
from rest_framework.test import APIClient


def test_health_is_public_and_ok():
    resp = APIClient().get(reverse("health"))
    assert resp.status_code == 200
    assert resp.data == {"status": "ok"}


def test_unknown_api_url_returns_json_404(client, db):
    resp = client.get("/api/does-not-exist/")
    assert resp.status_code == 404
    assert resp["Content-Type"] == "application/json"
    assert resp.json() == {"detail": "Not found."}


def test_non_api_404_keeps_django_page(client, db):
    resp = client.get("/no-such-page/")
    assert resp.status_code == 404
    assert "application/json" not in resp["Content-Type"]


def test_api_500_is_json_without_details(rf):
    from core.views import server_error

    resp = server_error(rf.get("/api/school/results/"))
    assert resp.status_code == 500
    assert resp["Content-Type"] == "application/json"
    assert b"Traceback" not in resp.content and b"detail" in resp.content


def test_unhandled_api_exception_returns_json_500(client, db, settings, monkeypatch):
    from core import views

    def boom(self, request):
        raise RuntimeError("secret internal detail")

    monkeypatch.setattr(views.HealthView, "get", boom)
    client.raise_request_exception = False
    resp = client.get("/api/health/")
    assert resp.status_code == 500
    assert resp.json()["detail"].startswith("Something went wrong")
    assert b"secret internal detail" not in resp.content
