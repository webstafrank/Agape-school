from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    fieldsets = UserAdmin.fieldsets + (("Role", {"fields": ("role",)}),)
    # Set the portal role (and name) when creating the user, not in a second edit.
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Role and name", {"classes": ("wide",), "fields": ("role", "first_name", "last_name")}),
    )
