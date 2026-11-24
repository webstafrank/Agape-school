from rest_framework.permissions import SAFE_METHODS, BasePermission

STUDENT, STAFF, ADMIN = "student", "staff", "admin"


def role_of(user) -> str | None:
    return getattr(user, "role", None) if user and user.is_authenticated else None


class RoleIn(BasePermission):
    """Allow only the listed roles (set `allowed_roles` on the view)."""

    def has_permission(self, request, view):
        return role_of(request.user) in getattr(view, "allowed_roles", ())


class StudentsReadOnly(BasePermission):
    """Students may read (their own, scoped) data but never write."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or role_of(request.user) in (STAFF, ADMIN)
