from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from admissions.models import Enquiry
from gallery.models import MediaItem, youtube_id
from school.models import (
    SchoolClass,
    StaffProfile,
    StudentProfile,
    Subject,
    TeachingAssignment,
    Term,
    phone_validator,
)

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    """Users as admins manage them. Passwords are never readable or writable here."""

    school_class = serializers.PrimaryKeyRelatedField(
        queryset=SchoolClass.objects.all(), required=False, allow_null=True,
        help_text="Students only: their class.",
    )
    class_name = serializers.SerializerMethodField()
    # Profile details (only admins edit these; users see their own on /api/school/me/).
    date_of_birth = serializers.DateField(required=False, allow_null=True, write_only=True)
    guardian_name = serializers.CharField(required=False, allow_blank=True, max_length=120, write_only=True)
    guardian_phone = serializers.CharField(required=False, allow_blank=True, max_length=20, write_only=True,
                                           validators=[phone_validator])
    staff_number = serializers.CharField(required=False, allow_blank=True, max_length=30, write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20, write_only=True,
                                  validators=[phone_validator])

    STUDENT_DETAILS = ("date_of_birth", "guardian_name", "guardian_phone")
    STAFF_DETAILS = ("staff_number", "phone")

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email", "role", "is_active", "school_class",
                  "class_name", "date_of_birth", "guardian_name", "guardian_phone", "staff_number", "phone",
                  "last_login", "date_joined")
        read_only_fields = ("last_login", "date_joined")

    def _profile(self, user):
        return getattr(user, "student_profile", None) if user.role == "student" else None

    def _staff_profile(self, user):
        return getattr(user, "staff_profile", None) if user.role == "staff" else None

    def get_class_name(self, user):
        profile = self._profile(user)
        return profile.school_class.name if profile and profile.school_class else None

    def to_representation(self, user):
        # Detail fields live on the profiles, not User: they're write-only above and read back here.
        data = super().to_representation(user)
        profile, staff = self._profile(user), self._staff_profile(user)
        data["school_class"] = profile.school_class_id if profile else None
        data["date_of_birth"] = profile.date_of_birth.isoformat() if profile and profile.date_of_birth else None
        data["guardian_name"] = profile.guardian_name if profile else ""
        data["guardian_phone"] = profile.guardian_phone if profile else ""
        data["staff_number"] = staff.staff_number if staff else ""
        data["phone"] = staff.phone if staff else ""
        return data

    def get_fields(self):
        fields = super().get_fields()
        if self.instance is not None and hasattr(self.instance, "pk"):
            # Changing someone's role would orphan their records; create a new account instead.
            fields["role"].read_only = True
            fields["username"].read_only = True
        return fields

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    def validate(self, attrs):
        role = attrs.get("role") or (self.instance.role if self.instance else None)
        if attrs.get("school_class") is not None and role != "student":
            raise serializers.ValidationError({"school_class": "Only students are placed in a class."})
        errors = {}
        for name in self.STUDENT_DETAILS:
            if attrs.get(name) not in (None, "") and role != "student":
                errors[name] = "Only students have this detail."
        for name in self.STAFF_DETAILS:
            if attrs.get(name) not in (None, "") and role != "staff":
                errors[name] = "Only staff have this detail."
        if errors:
            raise serializers.ValidationError(errors)
        for name in ("guardian_name", "staff_number", "guardian_phone", "phone"):
            if isinstance(attrs.get(name), str):
                attrs[name] = attrs[name].strip()
        dob = attrs.get("date_of_birth")
        if dob is not None and dob >= timezone.localdate():
            raise serializers.ValidationError({"date_of_birth": "Date of birth must be in the past."})
        number = attrs.get("staff_number")
        if number:
            taken = StaffProfile.objects.filter(staff_number__iexact=number)
            if self.instance is not None:
                taken = taken.exclude(user=self.instance)
            if taken.exists():
                raise serializers.ValidationError({"staff_number": "Another staff member already has this number."})
        request = self.context["request"]
        if self.instance is not None and self.instance.pk == request.user.pk and attrs.get("is_active") is False:
            raise serializers.ValidationError({"is_active": "You can't deactivate your own account."})
        return attrs

    def _pop_details(self, validated_data):
        names = (*self.STUDENT_DETAILS, *self.STAFF_DETAILS)
        return {n: validated_data.pop(n) for n in names if n in validated_data}

    def _save_details(self, user, details, school_class=None, set_class=False):
        if user.role == "student":
            values = {n: details[n] for n in self.STUDENT_DETAILS if n in details}
            if set_class:
                values["school_class"] = school_class
            profile, _ = StudentProfile.objects.update_or_create(user=user, defaults=values)
            user.student_profile = profile  # replace the cached (stale) profile for the response
        elif user.role == "staff":
            values = {n: details[n] for n in self.STAFF_DETAILS if n in details}
            if values or not StaffProfile.objects.filter(user=user).exists():
                profile, _ = StaffProfile.objects.update_or_create(user=user, defaults=values)
                user.staff_profile = profile

    def create(self, validated_data):
        school_class = validated_data.pop("school_class", None)
        details = self._pop_details(validated_data)
        with transaction.atomic():
            user = User(**validated_data)
            user.set_unusable_password()  # replaced by the view with a generated one
            user.save()
            self._save_details(user, details, school_class, set_class=True)
        return user

    def update(self, user, validated_data):
        has_class = "school_class" in validated_data
        school_class = validated_data.pop("school_class", None)
        details = self._pop_details(validated_data)
        with transaction.atomic():
            user = super().update(user, validated_data)
            if has_class or details:
                self._save_details(user, details, school_class, set_class=has_class)
        return user


class AdminClassSerializer(serializers.ModelSerializer):
    grade_label = serializers.CharField(source="get_grade_display", read_only=True)
    class_teacher_name = serializers.SerializerMethodField()
    student_count = serializers.IntegerField(source="students.count", read_only=True)

    class Meta:
        model = SchoolClass
        fields = ("id", "name", "grade", "grade_label", "year", "class_teacher", "class_teacher_name", "student_count")

    def get_class_teacher_name(self, obj):
        return (obj.class_teacher.get_full_name() or obj.class_teacher.username) if obj.class_teacher else None

    def validate_class_teacher(self, teacher):
        if teacher is not None and teacher.role != "staff":
            raise serializers.ValidationError("The class teacher must be a staff account.")
        return teacher


class AdminAssignmentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    class_name = serializers.CharField(source="school_class.name", read_only=True)

    class Meta:
        model = TeachingAssignment
        fields = ("id", "teacher", "teacher_name", "school_class", "class_name", "subject", "subject_name")

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username

    def validate_teacher(self, teacher):
        if teacher.role != "staff":
            raise serializers.ValidationError("Only staff accounts can be assigned to teach.")
        return teacher


class AdminTermSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source="__str__", read_only=True)

    class Meta:
        model = Term
        fields = ("id", "year", "name", "label", "start_date", "end_date", "is_current", "results_published")

    def get_fields(self):
        fields = super().get_fields()
        # The "one current term" DB constraint is satisfied in save() by moving the
        # flag, so don't let DRF's auto-generated unique check reject the request.
        fields["is_current"].validators = []
        return fields

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "The term must end after it starts."})
        return attrs

    def save(self, **kwargs):
        from django.db import transaction

        with transaction.atomic():
            if self.validated_data.get("is_current"):
                # Only one current term: switching moves the flag.
                qs = Term.objects.filter(is_current=True)
                if self.instance is not None:
                    qs = qs.exclude(pk=self.instance.pk)
                qs.update(is_current=False)
            return super().save(**kwargs)


class AdminMediaSerializer(serializers.ModelSerializer):
    approved_by_name = serializers.SerializerMethodField()
    youtube_id = serializers.SerializerMethodField()

    class Meta:
        model = MediaItem
        fields = ("id", "kind", "title", "caption", "alt_text", "url", "poster_url", "youtube_id", "is_approved",
                  "approved_by_name", "approved_at", "created_at")
        read_only_fields = ("kind", "title", "caption", "alt_text", "url", "poster_url", "approved_at", "created_at")

    def get_approved_by_name(self, obj):
        return (obj.approved_by.get_full_name() or obj.approved_by.username) if obj.approved_by else None

    def get_youtube_id(self, obj):
        return youtube_id(obj.url) if obj.kind == MediaItem.Kind.VIDEO else None

    def update(self, item, validated_data):
        if "is_approved" in validated_data:
            item.approve(self.context["request"].user) if validated_data["is_approved"] else item.unapprove()
            item.save()
        return item


class AdminEnquirySerializer(serializers.ModelSerializer):
    grade_label = serializers.CharField(source="get_grade_display", read_only=True)

    class Meta:
        model = Enquiry
        fields = ("id", "parent_name", "phone", "email", "child_first_name", "grade", "grade_label", "start_term",
                  "message", "status", "created_at")
        # Admins update the follow-up status only; what the family sent is kept as sent.
        read_only_fields = tuple(f for f in fields if f != "status")


class SubjectOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ("id", "name")
