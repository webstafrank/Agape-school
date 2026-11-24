from rest_framework import serializers

from .models import MediaItem, youtube_id


class PublicMediaItemSerializer(serializers.ModelSerializer):
    """Public fields only — approval metadata is never exposed."""

    youtube_id = serializers.SerializerMethodField()

    class Meta:
        model = MediaItem
        fields = ("id", "kind", "title", "caption", "alt_text", "url", "poster_url", "width", "height", "youtube_id")

    def get_youtube_id(self, obj: MediaItem) -> str | None:
        return youtube_id(obj.url) if obj.kind == MediaItem.Kind.VIDEO else None
