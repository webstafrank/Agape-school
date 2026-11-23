from django.contrib import admin

from .models import Enquiry


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display = ("created_at", "parent_name", "phone", "email", "child_first_name", "grade", "status")
    list_filter = ("status", "grade", "created_at")
    list_editable = ("status",)
    search_fields = ("parent_name", "phone", "email", "child_first_name")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
