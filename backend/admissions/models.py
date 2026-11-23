from django.db import models


class Enquiry(models.Model):
    """An admissions enquiry submitted from the public website.

    Collects the minimum needed to follow up: only the child's FIRST name
    is stored, and enquiries are never exposed through a public endpoint.
    """

    class Grade(models.TextChoices):
        PP1 = "pp1", "Pre-Primary 1"
        PP2 = "pp2", "Pre-Primary 2"
        GRADE_1 = "grade-1", "Grade 1"
        GRADE_2 = "grade-2", "Grade 2"
        GRADE_3 = "grade-3", "Grade 3"
        GRADE_4 = "grade-4", "Grade 4"
        GRADE_5 = "grade-5", "Grade 5"
        GRADE_6 = "grade-6", "Grade 6"
        GRADE_7 = "grade-7", "Grade 7"
        GRADE_8 = "grade-8", "Grade 8"
        GRADE_9 = "grade-9", "Grade 9"

    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        CLOSED = "closed", "Closed"

    parent_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=30)
    email = models.EmailField(blank=True)
    child_first_name = models.CharField(max_length=60)
    grade = models.CharField(max_length=10, choices=Grade.choices)
    start_term = models.CharField(max_length=60, blank=True)
    message = models.TextField(max_length=2000, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name_plural = "enquiries"

    def __str__(self) -> str:
        return f"{self.parent_name} — {self.get_grade_display()} ({self.get_status_display()})"
