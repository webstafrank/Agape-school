from django.contrib import admin
from django.utils.html import format_html

from .models import MediaItem


@admin.register(MediaItem)
class MediaItemAdmin(admin.ModelAdmin):
    list_display = ("preview", "title", "kind", "is_approved", "approved_by", "approved_at", "sort_order")
    list_display_links = ("preview", "title")
    list_filter = ("is_approved", "kind")
    search_fields = ("title", "caption", "alt_text")
    readonly_fields = ("preview", "approved_by", "approved_at", "created_at")
    actions = ("approve_selected", "unapprove_selected")
    fieldsets = (
        (None, {"fields": ("kind", "title", "caption", "alt_text", "url", "poster_url", "width", "height", "sort_order")}),
        ("Approval", {"fields": ("is_approved", "approved_by", "approved_at", "preview", "created_at")}),
    )

    @admin.display(description="Preview")
    def preview(self, obj: MediaItem):
        src = obj.url if obj.kind == MediaItem.Kind.PHOTO else obj.poster_url
        if not src:
            return "—"
        return format_html('<img src="{}" alt="" style="height:60px;border-radius:4px">', src)

    def save_model(self, request, obj, form, change):
        # Record who approved it whenever the checkbox is ticked/unticked here.
        if "is_approved" in form.changed_data:
            obj.approve(request.user) if obj.is_approved else obj.unapprove()
        super().save_model(request, obj, form, change)

    @admin.action(description="Approve selected (shows them on the public site)")
    def approve_selected(self, request, queryset):
        for item in queryset:
            item.approve(request.user)
            item.save()
        self.message_user(request, f"Approved {queryset.count()} item(s).")

    @admin.action(description="Unapprove selected (hides them from the public site)")
    def unapprove_selected(self, request, queryset):
        for item in queryset:
            item.unapprove()
            item.save()
        self.message_user(request, f"Hid {queryset.count()} item(s).")
