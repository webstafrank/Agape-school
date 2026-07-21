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
