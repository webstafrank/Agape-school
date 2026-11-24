from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny

from .models import Post
from .serializers import PostDetailSerializer, PostListSerializer

# The public listing shows the most recent posts only; older ones remain
# reachable by their detail URL.
LIST_LIMIT = 50


class PublicPostMixin:
    permission_classes = (AllowAny,)
    # Public, read-only: a stale token in the browser must not cause a 401.
    authentication_classes = ()

    def get_queryset(self):
        return Post.objects.published()


class PostListView(PublicPostMixin, ListAPIView):
    """Published news and events, newest first. Filter with ?kind=news|event."""

    serializer_class = PostListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        kind = self.request.query_params.get("kind")
        if kind in Post.Kind.values:
            qs = qs.filter(kind=kind)
        return qs[:LIST_LIMIT]


class PostDetailView(PublicPostMixin, RetrieveAPIView):
    """One published post by slug; drafts and scheduled posts are 404."""

    serializer_class = PostDetailSerializer
    lookup_field = "slug"
