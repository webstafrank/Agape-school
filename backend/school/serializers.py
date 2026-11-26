from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from .grading import section_for_grade
from .models import (
    Announcement,
    FeeRecord,
    Result,
    SchoolClass,
    StaffProfile,
    StudentProfile,
    Subject,
    TeachingAssignment,
    Term,
    TimetableEntry,
    is_assigned,
    staff_class_ids,
)
from .permissions import ADMIN, STAFF, PublishedResultsLockedForStaff, role_of

PUBLISHED_LOCKED = PublishedResultsLockedForStaff.message
NOT_YOUR_CLASS = "You can only enter results for classes and subjects you teach."


def display_name(user) -> str:
    return user.get_full_name() or user.username


class TermSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source="__str__", read_only=True)

    class Meta:
        model = Term
        fields = ("id", "year", "name", "label", "start_date", "end_date", "is_current", "results_published")


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ("id", "name", "code")


class ClassmateSerializer(serializers.Serializer):
    """Student as seen by their teachers and admins (never by other students)."""

    id = serializers.IntegerField(source="user.id")
    username = serializers.CharField(source="user.username")
    name = serializers.SerializerMethodField()

    def get_name(self, profile):
        return display_name(profile.user)


class SchoolClassSerializer(serializers.ModelSerializer):
    section = serializers.CharField(read_only=True)
    grade_label = serializers.CharField(source="get_grade_display", read_only=True)
    students = ClassmateSerializer(many=True, read_only=True)
    my_subjects = serializers.SerializerMethodField()

    class Meta:
        model = SchoolClass
        fields = ("id", "name", "grade", "grade_label", "section", "year", "students", "my_subjects")

    def get_my_subjects(self, obj):
        user = self.context["request"].user
        qs = Subject.objects.filter(assignments__school_class=obj, assignments__teacher=user).distinct()
        return SubjectSerializer(qs, many=True).data


class ResultSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    term_label = serializers.CharField(source="term.__str__", read_only=True)
    level_label = serializers.CharField(read_only=True)

    class Meta:
        model = Result
        fields = (
            "id", "student", "student_name", "school_class", "subject", "subject_name", "term", "term_label",
            "score", "level", "level_label", "comment", "updated_at",
        )
        read_only_fields = ("level", "updated_at")

    def get_student_name(self, obj):
        return display_name(obj.student)

    def get_fields(self):
        fields = super().get_fields()
        if self.instance is not None and not isinstance(self.instance, (list, tuple)) and hasattr(self.instance, "pk"):
            # Once entered, only the score and comment can change.
            for name in ("student", "school_class", "subject", "term"):
                fields[name].read_only = True
        return fields

    def validate(self, attrs):
        if self.instance is None:
            user = self.context["request"].user
            if role_of(user) == STAFF and not is_assigned(user, attrs["school_class"], attrs["subject"]):
                raise PermissionDenied("You can only enter results for classes and subjects you teach.")
            if role_of(user) == STAFF and attrs["term"].results_published:
                raise PermissionDenied(PUBLISHED_LOCKED)
            profile = StudentProfile.objects.filter(user=attrs["student"]).first()
            if not profile or profile.school_class_id != attrs["school_class"].id:
                raise serializers.ValidationError({"student": "This student is not in that class."})
        return attrs

    def create(self, validated_data):
        validated_data["entered_by"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        instance.entered_by = self.context["request"].user
        return super().update(instance, validated_data)


class SheetEntrySerializer(serializers.Serializer):
    student = serializers.IntegerField()
    # Blank/null score = no result for this student (an existing one is removed).
    score = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100,
                                     allow_null=True, required=False)
    comment = serializers.CharField(max_length=300, allow_blank=True, required=False, default="")


class ResultSheetSerializer(serializers.Serializer):
    """A whole class mark sheet for one subject and term, saved all-or-nothing."""

    school_class = serializers.PrimaryKeyRelatedField(queryset=SchoolClass.objects.all())
    subject = serializers.PrimaryKeyRelatedField(queryset=Subject.objects.all())
    term = serializers.PrimaryKeyRelatedField(queryset=Term.objects.all())
    entries = SheetEntrySerializer(many=True, allow_empty=False, max_length=200)

    def validate(self, attrs):
        user = self.context["request"].user
        cls, subject, term = attrs["school_class"], attrs["subject"], attrs["term"]
        if role_of(user) == STAFF:
            if not is_assigned(user, cls, subject):
                raise PermissionDenied("You can only enter results for classes and subjects you teach.")
            if term.results_published:
                raise PermissionDenied(PUBLISHED_LOCKED)
        in_class = set(StudentProfile.objects.filter(school_class=cls).values_list("user_id", flat=True))
        seen, errors = set(), []
        for entry in attrs["entries"]:
            err = {}
            if entry["student"] not in in_class:
                err["student"] = ["This student is not in that class."]
            elif entry["student"] in seen:
                err["student"] = ["This student appears more than once."]
            seen.add(entry["student"])
            errors.append(err)
        if any(errors):
            raise serializers.ValidationError({"entries": errors})
        return attrs

    def save(self):
        from django.db import transaction

        data, user = self.validated_data, self.context["request"].user
        key = {"school_class": data["school_class"], "subject": data["subject"], "term": data["term"]}
        with transaction.atomic():
            for entry in data["entries"]:
                score = entry.get("score")
                if score is None:
                    Result.objects.filter(student_id=entry["student"], **key).delete()
                    continue
                result = Result.objects.filter(student_id=entry["student"], **key).first() or Result(
                    student_id=entry["student"], **key
                )
                result.score, result.comment, result.entered_by = score, entry.get("comment", ""), user
                result.save()
        return Result.objects.filter(**key).select_related("student", "subject", "term", "school_class")


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    class_name = serializers.CharField(source="school_class.name", read_only=True, default=None)

    class Meta:
        model = Announcement
        fields = (
            "id", "title", "body", "school_class", "class_name", "author_name", "is_mine", "published_at", "updated_at",
        )
        read_only_fields = ("updated_at",)
        extra_kwargs = {"published_at": {"required": False}}

    def get_author_name(self, obj):
        return display_name(obj.author) if obj.author else None

    def get_is_mine(self, obj) -> bool:
        return obj.author_id == self.context["request"].user.id

    def validate_school_class(self, school_class):
        user = self.context["request"].user
        if role_of(user) == ADMIN:
            return school_class
        if school_class is None:
            raise PermissionDenied("Only administrators can post school-wide announcements.")
        if not SchoolClass.objects.filter(id=school_class.id, id__in=staff_class_ids(user)).exists():
            raise PermissionDenied("You can only post announcements to classes you teach.")
        return school_class

    def validate(self, attrs):
        # A staff member must always pick a class, even if the field is omitted.
        if self.instance is None:
            if "school_class" not in attrs:
                attrs["school_class"] = self.validate_school_class(None)
            attrs.setdefault("published_at", timezone.now())
        return attrs

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)


class TimetableEntrySerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    class_name = serializers.CharField(source="school_class.name", read_only=True)
    teacher_name = serializers.SerializerMethodField()
    day_label = serializers.CharField(source="get_day_display", read_only=True)

    class Meta:
        model = TimetableEntry
        fields = (
            "id", "school_class", "class_name", "subject", "subject_name", "teacher", "teacher_name", "day", "day_label",
            "start_time", "end_time", "room",
        )

    def get_teacher_name(self, obj):
        return display_name(obj.teacher) if obj.teacher else None


class FeeRecordSerializer(serializers.ModelSerializer):
    term_label = serializers.CharField(source="term.__str__", read_only=True)
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = FeeRecord
        fields = ("id", "student", "term", "term_label", "amount_due", "amount_paid", "balance", "updated_at")


class TeachingAssignmentSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source="school_class.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = TeachingAssignment
        fields = ("id", "school_class", "class_name", "subject", "subject_name")


def profile_payload(user) -> dict:
    """GET /api/school/me/ — the signed-in user's own school details (never anyone else's).

    `details` holds the office fields an admin keeps up to date; they are
    read-only here and editable only through /api/admin/users/.
    """
    data = {
        "id": user.id, "username": user.username, "name": display_name(user), "role": user.role,
        "first_name": user.first_name, "last_name": user.last_name, "email": user.email,
        "date_joined": user.date_joined, "last_login": user.last_login,
    }
    if user.role == "student":
        profile = StudentProfile.objects.select_related("school_class__class_teacher").filter(user=user).first()
        cls = profile.school_class if profile else None
        data["school_class"] = (
            {"id": cls.id, "name": cls.name, "grade": cls.grade, "grade_label": cls.get_grade_display(),
             "section": section_for_grade(cls.grade), "year": cls.year,
             "class_teacher_name": display_name(cls.class_teacher) if cls.class_teacher else None}
            if cls else None
        )
        data["details"] = {
            "date_of_birth": profile.date_of_birth if profile else None,
            "guardian_name": profile.guardian_name if profile else "",
            "guardian_phone": profile.guardian_phone if profile else "",
        }
    elif user.role == "staff":
        assignments = TeachingAssignment.objects.filter(teacher=user).select_related("school_class", "subject")
        data["assignments"] = TeachingAssignmentSerializer(assignments, many=True).data
        data["class_teacher_of"] = [
            {"id": c.id, "name": c.name} for c in SchoolClass.objects.filter(class_teacher=user).order_by("name")
        ]
        staff = StaffProfile.objects.filter(user=user).first()
        data["details"] = {
            "staff_number": staff.staff_number if staff else "",
            "phone": staff.phone if staff else "",
        }
    return data


class GridCellSerializer(serializers.Serializer):
    student = serializers.IntegerField()
    subject = serializers.IntegerField()
    # Null = no result for this student in this subject (an existing one is removed).
    score = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100, allow_null=True)


def grid_subjects(user, school_class):
    """Subjects a user may enter in a class's results table.

    Staff: only the subjects they are assigned to teach in that class.
    Admin: every subject anyone is assigned to teach in that class.
    """
    qs = Subject.objects.filter(assignments__school_class=school_class)
    if role_of(user) == STAFF:
        qs = qs.filter(assignments__teacher=user)
    return qs.distinct().order_by("name")


class ResultGridSerializer(serializers.Serializer):
    """A class results table (students x subjects) for one term, saved all-or-nothing.

    Only changed cells are sent. A score creates or updates the result and keeps
    its comment; a null score removes the result.
    """

    MAX_CELLS = 5000

    school_class = serializers.PrimaryKeyRelatedField(queryset=SchoolClass.objects.all())
    term = serializers.PrimaryKeyRelatedField(queryset=Term.objects.all())
    cells = GridCellSerializer(many=True, allow_empty=False, max_length=MAX_CELLS)

    def validate(self, attrs):
        user = self.context["request"].user
        cls, term = attrs["school_class"], attrs["term"]
        is_staff = role_of(user) == STAFF
        allowed = set(grid_subjects(user, cls).values_list("id", flat=True))
        if is_staff:
            if not allowed:
                raise PermissionDenied(NOT_YOUR_CLASS)
            if term.results_published:
                raise PermissionDenied(PUBLISHED_LOCKED)
        in_class = set(StudentProfile.objects.filter(school_class=cls).values_list("user_id", flat=True))
        seen, errors = set(), []
        for cell in attrs["cells"]:
            err = {}
            key = (cell["student"], cell["subject"])
            if cell["subject"] not in allowed:
                if is_staff:
                    # Never save any of a table that reaches outside the teacher's subjects.
                    raise PermissionDenied(NOT_YOUR_CLASS)
                err["subject"] = ["Nobody teaches this subject in that class."]
            if cell["student"] not in in_class:
                err["student"] = ["This student is not in that class."]
            elif key in seen:
                err["student"] = ["This student and subject appear more than once."]
            seen.add(key)
            errors.append(err)
        if any(errors):
            raise serializers.ValidationError({"cells": errors})
        return attrs

    def save(self):
        from django.db import transaction

        data, user = self.validated_data, self.context["request"].user
        cls, term, cells = data["school_class"], data["term"], data["cells"]
        with transaction.atomic():
            existing = {
                (r.student_id, r.subject_id): r
                for r in Result.objects.select_for_update().filter(
                    school_class=cls, term=term,
                    student_id__in={c["student"] for c in cells}, subject_id__in={c["subject"] for c in cells},
                )
            }
            for cell in cells:
                result = existing.get((cell["student"], cell["subject"]))
                if cell["score"] is None:
                    if result is not None:
                        result.delete()
                    continue
                if result is None:
                    result = Result(student_id=cell["student"], subject_id=cell["subject"], school_class=cls, term=term)
                result.score, result.entered_by = cell["score"], user
                result.save()
        return grid_payload(user, cls, term)


def grid_payload(user, school_class, term) -> dict:
    """Body of GET/POST /api/school/results/grid/: students, the user's subjects, and saved scores."""
    subjects = list(grid_subjects(user, school_class))
    students = (
        StudentProfile.objects.filter(school_class=school_class)
        .select_related("user")
        .order_by("user__last_name", "user__first_name", "user__username")
    )
    results = Result.objects.filter(
        school_class=school_class, term=term, subject__in=subjects,
        student__student_profile__school_class=school_class,
    ).order_by("student_id", "subject_id")
    return {
        "school_class": {"id": school_class.id, "name": school_class.name, "grade": school_class.grade,
                         "section": school_class.section},
        "term": TermSerializer(term).data,
        "locked": role_of(user) == STAFF and term.results_published,
        "subjects": SubjectSerializer(subjects, many=True).data,
        "students": ClassmateSerializer(students, many=True).data,
        "results": [
            {"student": r.student_id, "subject": r.subject_id, "score": str(r.score), "level": r.level,
             "level_label": r.level_label, "comment": r.comment}
            for r in results
        ],
    }
