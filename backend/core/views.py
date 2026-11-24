from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Public liveness probe used by deploy verification."""

    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request: Request) -> Response:
        return Response({"status": "ok"})


# --- Error handlers (used when DEBUG=False) ----------------------------------
# API clients always get JSON, never Django's HTML error pages; other paths
# (e.g. /admin/) keep Django's defaults.

from django.http import JsonResponse  # noqa: E402
from django.views import defaults  # noqa: E402


def _is_api(request) -> bool:
    return request.path.startswith("/api/")


def not_found(request, exception=None):
    if _is_api(request):
        return JsonResponse({"detail": "Not found."}, status=404)
    return defaults.page_not_found(request, exception)


def server_error(request):
    if _is_api(request):
        # No details: they could leak internals. The server log has the traceback.
        return JsonResponse({"detail": "Something went wrong on our side. Please try again."}, status=500)
    return defaults.server_error(request)
