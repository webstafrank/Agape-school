from django.contrib import admin

from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "is_published", "published_at", "event_start")
    list_filter = ("kind", "is_published")
    list_editable = ("is_published",)
    search_fields = ("title", "summary", "body")
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "published_at"
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("kind", "title", "slug", "summary", "body")}),
        ("Cover image", {"fields": ("cover_image_url", "cover_image_alt")}),
        ("Event details", {"fields": ("event_start", "event_end", "event_location"), "description": "Fill these in for events only."}),
        ("Publishing", {"fields": ("is_published", "published_at", "created_at", "updated_at")}),
    )
