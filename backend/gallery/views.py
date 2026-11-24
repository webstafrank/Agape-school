from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from .models import MediaItem
from .serializers import PublicMediaItemSerializer

LIST_LIMIT = 200


class PublicGalleryView(ListAPIView):
    """Approved gallery media only. Filter with ?kind=photo|video."""

    permission_classes = (AllowAny,)
    authentication_classes = ()
    serializer_class = PublicMediaItemSerializer

    def get_queryset(self):
        qs = MediaItem.objects.approved()
        kind = self.request.query_params.get("kind")
        if kind in MediaItem.Kind.values:
            qs = qs.filter(kind=kind)
        return qs[:LIST_LIMIT]
