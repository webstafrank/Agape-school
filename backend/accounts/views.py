from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RoleTokenObtainPairSerializer, UserSerializer


class RoleTokenObtainPairView(TokenObtainPairView):
    serializer_class = RoleTokenObtainPairSerializer
    # Per-IP limit on login attempts to slow down password guessing.
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "login"


class MeView(APIView):
    """Return the authenticated user's own profile (used for portal routing)."""

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request: Request) -> Response:
        return Response(UserSerializer(request.user).data)
