from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import PasswordChangeSerializer, RoleTokenObtainPairSerializer, UserSerializer


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


class PasswordChangeView(APIView):
    """POST /api/auth/password/ — change your own password (current password required)."""

    permission_classes = (permissions.IsAuthenticated,)
    # Shares the sign-in limit: checking the current password is a guessing surface too.
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "login"

    def post(self, request: Request) -> Response:
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password changed."})
