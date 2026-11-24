from rest_framework import serializers

from .models import Post


class PostListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = (
            "slug",
            "kind",
            "title",
            "summary",
            "cover_image_url",
            "cover_image_alt",
            "event_start",
            "event_end",
            "event_location",
            "published_at",
        )


class PostDetailSerializer(PostListSerializer):
    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + ("body", "updated_at")
