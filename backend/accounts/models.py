from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as DjangoUserManager
from django.db import models


class UserManager(DjangoUserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        # Superusers manage the school, so they belong in the admin portal.
        extra_fields.setdefault("role", User.Role.ADMIN)
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    """Custom user with a role, so the same auth backs students, staff and admins.

    Access rules are enforced on the backend per role (see CLAUDE.md); the role
    also drives frontend portal routing (student -> /portal/student, etc.).
    """

    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        STAFF = "staff", "Staff"
        ADMIN = "admin", "Admin"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
    )

    objects = UserManager()

    @property
    def is_student(self) -> bool:
        return self.role == self.Role.STUDENT

    @property
    def is_staff_member(self) -> bool:
        return self.role == self.Role.STAFF

    @property
    def is_admin_role(self) -> bool:
        return self.role == self.Role.ADMIN
