"""Admin portal API. Every endpoint here is for role=admin only."""
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from admissions.models import Enquiry
from gallery.models import MediaItem
from school.models import SchoolClass, StudentProfile, TeachingAssignment, Term
from school.permissions import ADMIN, RoleIn

from .passwords import generate_password
from .serializers import (
    AdminAssignmentSerializer,
    AdminClassSerializer,
    AdminEnquirySerializer,
    AdminMediaSerializer,
    AdminTermSerializer,
    AdminUserSerializer,
)

User = get_user_model()
LIST_LIMIT = 500


class AdminOnly:
    permission_classes = (IsAuthenticated, RoleIn)
    allowed_roles = (ADMIN,)


class OverviewView(AdminOnly, APIView):
    def get(self, request):
        current = Term.objects.filter(is_current=True).first()
        return Response({
            "students": User.objects.filter(role="student", is_active=True).count(),
            "staff": User.objects.filter(role="staff", is_active=True).count(),
            "classes": SchoolClass.objects.count(),
            "pending_media": MediaItem.objects.filter(is_approved=False).count(),
            "new_enquiries": Enquiry.objects.filter(status=Enquiry.Status.NEW).count(),
            "unplaced_students": StudentProfile.objects.filter(school_class__isnull=True, user__is_active=True).count(),
            "current_term": AdminTermSerializer(current).data if current else None,
        })


class UserViewSet(AdminOnly, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin,
                  mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """List/search, create (returns a one-time password), edit, deactivate. No hard delete:
    deactivating keeps a student's results and history."""

    serializer_class = AdminUserSerializer

    def get_queryset(self):
        qs = User.objects.select_related("student_profile__school_class", "staff_profile").order_by("role", "username")
        p = self.request.query_params
        if p.get("role") in ("student", "staff", "admin"):
            qs = qs.filter(role=p["role"])
        if p.get("school_class", "").isdigit():
            qs = qs.filter(student_profile__school_class_id=int(p["school_class"]))
        if p.get("q"):
            q = p["q"].strip()
            qs = qs.filter(Q(username__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q))
        if p.get("active") in ("true", "false"):
            qs = qs.filter(is_active=p["active"] == "true")
        return qs[:LIST_LIMIT] if self.action == "list" else qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        password = generate_password()
        user.set_password(password)
        user.save(update_fields=["password"])
        # The only time this password is ever shown.
        return Response({**self.get_serializer(user).data, "password": password}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        user = self.get_object()
        password = generate_password()
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"password": password})


class ClassViewSet(AdminOnly, viewsets.ModelViewSet):
    serializer_class = AdminClassSerializer
    queryset = SchoolClass.objects.select_related("class_teacher").prefetch_related("students")

    def destroy(self, request, *args, **kwargs):
        cls = self.get_object()
        if cls.students.exists() or cls.results.exists():
            return Response({"detail": "Move the students out and keep past results: this class can't be deleted."},
                            status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


class AssignmentViewSet(AdminOnly, mixins.ListModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin,
                        viewsets.GenericViewSet):
    serializer_class = AdminAssignmentSerializer

    def get_queryset(self):
        qs = TeachingAssignment.objects.select_related("teacher", "subject", "school_class")
        value = self.request.query_params.get("school_class", "")
        if value.isdigit():
            qs = qs.filter(school_class_id=int(value))
        return qs


class TermViewSet(AdminOnly, mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin,
                  viewsets.GenericViewSet):
    serializer_class = AdminTermSerializer
    queryset = Term.objects.all()


class MediaViewSet(AdminOnly, mixins.ListModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin,
                   viewsets.GenericViewSet):
    """Review gallery media: approve/unapprove (PATCH is_approved) or delete.
    Adding media stays in Django admin (paste a hosted link)."""

    serializer_class = AdminMediaSerializer

    def get_queryset(self):
        qs = MediaItem.objects.select_related("approved_by").order_by("is_approved", "-created_at")
        value = self.request.query_params.get("status")
        if value == "pending":
            qs = qs.filter(is_approved=False)
        elif value == "approved":
            qs = qs.filter(is_approved=True)
        return qs


class EnquiryViewSet(AdminOnly, mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = AdminEnquirySerializer

    def get_queryset(self):
        qs = Enquiry.objects.all()
        value = self.request.query_params.get("status")
        if value in Enquiry.Status.values:
            qs = qs.filter(status=value)
        return qs[:LIST_LIMIT] if self.action == "list" else qs
