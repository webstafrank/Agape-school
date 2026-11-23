from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import EnquirySerializer


class EnquiryCreateView(APIView):
    """Public, create-only endpoint for admissions enquiries.

    There is deliberately no list/detail endpoint here: enquiries contain
    family contact details and are only visible to admins (Django admin now,
    the admin portal later).
    """

    permission_classes = (AllowAny,)
    # No auth: an expired token in the browser must not block a public form.
    authentication_classes = ()
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "enquiries"

    def post(self, request: Request) -> Response:
        serializer = EnquirySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.is_spam():
            # Look successful so bots don't learn to avoid the trap.
            return Response({"ok": True}, status=status.HTTP_201_CREATED)
        serializer.save()
        return Response({"ok": True}, status=status.HTTP_201_CREATED)
