"""School records behind the portals.

Access rules (enforced in views/permissions, tested in tests.py):
- students see only their own profile, results (published terms only),
  fees, their class timetable, and announcements for the school or their class;
- staff see the classes they are assigned to and may enter/edit results and
  post announcements only for those classes;
- admins manage everything.
"""
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from admissions.models import Enquiry

from .grading import level_for, section_for_grade

Grade = Enquiry.Grade
User = settings.AUTH_USER_MODEL


class Term(models.Model):
    class Name(models.TextChoices):
        TERM_1 = "term-1", "Term 1"
        TERM_2 = "term-2", "Term 2"
        TERM_3 = "term-3", "Term 3"

    year = models.PositiveSmallIntegerField()
    name = models.CharField(max_length=10, choices=Name.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False, help_text="Only one term can be current.")
    results_published = models.BooleanField(
        default=False, help_text="Students can see this term's results only once this is ticked."
    )

    class Meta:
        ordering = ("-year", "-name")
        constraints = [
            models.UniqueConstraint(fields=("year", "name"), name="unique_term_per_year"),
            models.UniqueConstraint(fields=("is_current",), condition=Q(is_current=True), name="one_current_term"),
        ]

    def __str__(self) -> str:
        return f"{self.get_name_display()} {self.year}"

    def clean(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "The term must end after it starts."})


class Subject(models.Model):
    name = models.CharField(max_length=80)
    code = models.SlugField(max_length=30, unique=True)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class SchoolClass(models.Model):
    name = models.CharField(max_length=40, help_text='e.g. "Grade 4 Blue"')
    grade = models.CharField(max_length=10, choices=Grade.choices)
    year = models.PositiveSmallIntegerField()
    class_teacher = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="classes_led",
        limit_choices_to={"role": "staff"},
    )

    class Meta:
        ordering = ("-year", "grade", "name")
        verbose_name = "class"
        verbose_name_plural = "classes"
        constraints = [models.UniqueConstraint(fields=("name", "year"), name="unique_class_name_per_year")]

    def __str__(self) -> str:
        return f"{self.name} ({self.year})"

    @property
    def section(self) -> str:
        return section_for_grade(self.grade)


class StudentProfile(models.Model):
    """Links a student account to their current class. Keeps child data minimal."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="student_profile", limit_choices_to={"role": "student"}
    )
    school_class = models.ForeignKey(
        SchoolClass, null=True, blank=True, on_delete=models.SET_NULL, related_name="students"
    )

    class Meta:
        ordering = ("user__username",)

    def __str__(self) -> str:
        return self.user.username

    def clean(self):
        if self.user_id and self.user.role != "student":
            raise ValidationError({"user": "Only student accounts can have a student profile."})


class TeachingAssignment(models.Model):
    """A teacher teaches a subject to a class — this defines a teacher's 'own classes'."""

    teacher = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="teaching_assignments", limit_choices_to={"role": "staff"}
    )
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name="assignments")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="assignments")

    class Meta:
        ordering = ("school_class", "subject")
        constraints = [
            models.UniqueConstraint(fields=("teacher", "school_class", "subject"), name="unique_teaching_assignment")
        ]

    def __str__(self) -> str:
        return f"{self.teacher} — {self.subject} — {self.school_class}"

    def clean(self):
        if self.teacher_id and self.teacher.role != "staff":
            raise ValidationError({"teacher": "Only staff accounts can be assigned to teach."})


def is_assigned(teacher, school_class, subject) -> bool:
    return TeachingAssignment.objects.filter(teacher=teacher, school_class=school_class, subject=subject).exists()


def staff_class_ids(teacher):
    """Classes a staff member teaches or leads."""
    return SchoolClass.objects.filter(
        Q(assignments__teacher=teacher) | Q(class_teacher=teacher)
    ).values("id")


class Result(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="results", limit_choices_to={"role": "student"}
    )
    school_class = models.ForeignKey(SchoolClass, on_delete=models.PROTECT, related_name="results")
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="results")
    term = models.ForeignKey(Term, on_delete=models.PROTECT, related_name="results")
    score = models.DecimalField(
        max_digits=5, decimal_places=2, validators=[MinValueValidator(Decimal(0)), MaxValueValidator(Decimal(100))]
    )
    level = models.CharField(max_length=4, editable=False)
    comment = models.CharField(max_length=300, blank=True)
    entered_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="+", editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-term__year", "-term__name", "subject__name")
        constraints = [
            models.UniqueConstraint(fields=("student", "subject", "term"), name="one_result_per_subject_per_term")
        ]

    def __str__(self) -> str:
        return f"{self.student} — {self.subject} — {self.term}: {self.score}"

    @property
    def level_label(self) -> str:
        return level_for(self.score, self.school_class.grade)[1]

    def clean(self):
        profile = StudentProfile.objects.filter(user_id=self.student_id).first()
        if not profile or profile.school_class_id != self.school_class_id:
            raise ValidationError({"student": "This student is not in that class."})

    def save(self, *args, **kwargs):
        self.level = level_for(Decimal(self.score), self.school_class.grade)[0]
        super().save(*args, **kwargs)


class Announcement(models.Model):
    """School-wide (no class) or for one class. Staff may post only to their classes."""

    title = models.CharField(max_length=160)
    body = models.TextField(max_length=5000)
    school_class = models.ForeignKey(
        SchoolClass, null=True, blank=True, on_delete=models.CASCADE, related_name="announcements",
        help_text="Leave blank for a school-wide announcement (admins only).",
    )
    author = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="announcements", editable=False)
    published_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-published_at",)

    def __str__(self) -> str:
        return self.title


class TimetableEntry(models.Model):
    class Day(models.IntegerChoices):
        MONDAY = 1, "Monday"
        TUESDAY = 2, "Tuesday"
        WEDNESDAY = 3, "Wednesday"
        THURSDAY = 4, "Thursday"
        FRIDAY = 5, "Friday"

    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name="timetable")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="+")
    teacher = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="timetable_entries",
        limit_choices_to={"role": "staff"},
    )
    day = models.PositiveSmallIntegerField(choices=Day.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ("school_class", "day", "start_time")
        verbose_name_plural = "timetable entries"

    def __str__(self) -> str:
        return f"{self.school_class} {self.get_day_display()} {self.start_time:%H:%M} {self.subject}"

    def clean(self):
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError({"end_time": "The lesson must end after it starts."})
        if self.school_class_id and self.day and self.start_time and self.end_time:
            clash = TimetableEntry.objects.filter(
                school_class_id=self.school_class_id, day=self.day,
                start_time__lt=self.end_time, end_time__gt=self.start_time,
            ).exclude(pk=self.pk)
            if clash.exists():
                raise ValidationError("This lesson overlaps another lesson for the same class.")


class FeeRecord(models.Model):
    """What a student owes and has paid for a term. Updated by admins."""

    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="fee_records", limit_choices_to={"role": "student"}
    )
    term = models.ForeignKey(Term, on_delete=models.PROTECT, related_name="fee_records")
    amount_due = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal(0))])
    amount_paid = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal(0), validators=[MinValueValidator(Decimal(0))]
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-term__year", "-term__name")
        constraints = [models.UniqueConstraint(fields=("student", "term"), name="one_fee_record_per_term")]

    def __str__(self) -> str:
        return f"{self.student} — {self.term}"

    @property
    def balance(self) -> Decimal:
        return self.amount_due - self.amount_paid
