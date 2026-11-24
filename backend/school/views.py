from django.db.models import Exists, OuterRef, Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Announcement,
    FeeRecord,
    Result,
    SchoolClass,
    StudentProfile,
    Subject,
    TeachingAssignment,
    Term,
    TimetableEntry,
    staff_class_ids,
)
from .permissions import (
    ADMIN,
    STAFF,
    STUDENT,
    PublishedResultsLockedForStaff,
    RoleIn,
    StudentsReadOnly,
    role_of,
)
from .serializers import (
    AnnouncementSerializer,
    FeeRecordSerializer,
    ResultSerializer,
    ResultSheetSerializer,
    SchoolClassSerializer,
    SubjectSerializer,
    TermSerializer,
    TimetableEntrySerializer,
    profile_payload,
)

# Every queryset below is scoped to the requesting user's role. Objects outside
# that scope are simply not found (404), so IDs can't be probed.


def student_class_id(user):
    return StudentProfile.objects.filter(user=user).values("school_class_id")


class MeView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(profile_payload(request.user))


class TermViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = TermSerializer
    queryset = Term.objects.all()


class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = SubjectSerializer
    queryset = Subject.objects.all()


class SchoolClassViewSet(viewsets.ReadOnlyModelViewSet):
    """Staff: the classes they teach or lead (with student lists). Students: no access."""

    permission_classes = (IsAuthenticated, RoleIn)
    allowed_roles = (STAFF, ADMIN)
    serializer_class = SchoolClassSerializer

    def get_queryset(self):
        qs = SchoolClass.objects.prefetch_related("students__user")
        if role_of(self.request.user) == STAFF:
            qs = qs.filter(id__in=staff_class_ids(self.request.user))
        return qs


class ResultViewSet(viewsets.ModelViewSet):
    """Students: own results in published terms (read-only).
    Staff: results for the class+subject pairs they teach (read/write).
    Admin: everything. Filter with ?term=<id>, ?school_class=<id>, ?subject=<id>.
    Staff cannot change results once the term is published."""

    permission_classes = (IsAuthenticated, RoleIn, StudentsReadOnly, PublishedResultsLockedForStaff)
    allowed_roles = (STUDENT, STAFF, ADMIN)
    serializer_class = ResultSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Result.objects.select_related("student", "subject", "term", "school_class")
        role = role_of(user)
        if role == STUDENT:
            qs = qs.filter(student=user, term__results_published=True)
        elif role == STAFF:
            teaches = TeachingAssignment.objects.filter(
                teacher=user, school_class=OuterRef("school_class"), subject=OuterRef("subject")
            )
            qs = qs.filter(Exists(teaches))
        for param in ("term", "school_class", "subject"):
            value = self.request.query_params.get(param)
            if value and value.isdigit():
                qs = qs.filter(**{f"{param}_id": int(value)})
        return qs

    @action(detail=False, methods=["post"])
    def sheet(self, request):
        """POST /results/sheet/ — save a class mark sheet (create, update, or clear) atomically."""
        serializer = ResultSheetSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        results = serializer.save()
        return Response(ResultSerializer(results, many=True, context={"request": request}).data)


class AnnouncementViewSet(viewsets.ModelViewSet):
    """Students: school-wide + own class (read-only). Staff: school-wide + their
    classes; post/edit/delete only their own posts to their classes. Admin: all."""

    permission_classes = (IsAuthenticated, RoleIn, StudentsReadOnly)
    allowed_roles = (STUDENT, STAFF, ADMIN)
    serializer_class = AnnouncementSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Announcement.objects.select_related("author", "school_class")
        role = role_of(user)
        if role == STUDENT:
            qs = qs.filter(
                Q(school_class__isnull=True) | Q(school_class_id__in=student_class_id(user)),
                published_at__lte=timezone.now(),
            )
        elif role == STAFF:
            visible = Q(school_class__isnull=True) | Q(school_class_id__in=staff_class_ids(user))
            if self.action in ("update", "partial_update", "destroy"):
                visible = Q(author=user, school_class_id__in=staff_class_ids(user))
            qs = qs.filter(visible)
        return qs


class TimetableViewSet(viewsets.ReadOnlyModelViewSet):
    """Students: their class. Staff: lessons they teach + their classes. Admin: all."""

    permission_classes = (IsAuthenticated, RoleIn)
    allowed_roles = (STUDENT, STAFF, ADMIN)
    serializer_class = TimetableEntrySerializer

    def get_queryset(self):
        user = self.request.user
        qs = TimetableEntry.objects.select_related("subject", "teacher", "school_class")
        role = role_of(user)
        if role == STUDENT:
            qs = qs.filter(school_class_id__in=student_class_id(user))
        elif role == STAFF:
            qs = qs.filter(Q(teacher=user) | Q(school_class_id__in=staff_class_ids(user))).distinct()
        value = self.request.query_params.get("school_class")
        if value and value.isdigit():
            qs = qs.filter(school_class_id=int(value))
        return qs


class FeeRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """Students: their own fee records. Admin: all. Staff: no access."""

    permission_classes = (IsAuthenticated, RoleIn)
    allowed_roles = (STUDENT, ADMIN)
    serializer_class = FeeRecordSerializer

    def get_queryset(self):
        qs = FeeRecord.objects.select_related("term")
        if role_of(self.request.user) == STUDENT:
            qs = qs.filter(student=self.request.user)
        return qs
