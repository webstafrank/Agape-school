"""Scaffold smoke tests: prove Django + DRF are wired up correctly."""
from django.core.management import call_command


def test_rest_framework_installed(settings):
    assert "rest_framework" in settings.INSTALLED_APPS


def test_system_checks_pass():
    # Runs Django's system checks; raises SystemCheckError on any problem.
    call_command("check")
