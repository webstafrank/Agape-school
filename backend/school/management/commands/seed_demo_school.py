"""Local demo data for trying the portals. Refuses to run unless DEBUG=True."""
from datetime import date, time, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from school.models import (
    Announcement,
    FeeRecord,
    Result,
    SchoolClass,
    StudentProfile,
    Subject,
    TeachingAssignment,
    Term,
    TimetableEntry,
)

User = get_user_model()

SUBJECTS = [("Mathematics", "maths"), ("English", "english"), ("Kiswahili", "kiswahili"),
            ("Science & Technology", "science"), ("Creative Arts", "creative-arts")]
# Monday–Friday, five lessons a day, rotating subjects.
SLOTS = [(time(8, 0), time(8, 35)), (time(8, 35), time(9, 10)), (time(9, 30), time(10, 5)),
         (time(10, 5), time(10, 40)), (time(11, 0), time(11, 35))]
SCORES = {"maths": (82, 64), "english": (71, 77), "kiswahili": (58, 66), "science": (90, 85), "creative-arts": (47, 73)}


class Command(BaseCommand):
    help = "Create fake classes, results, timetable, announcements and fees for local testing (DEBUG only)."

    def add_arguments(self, parser):
        parser.add_argument("--password", default="local-dev-only-pw", help="Password for the TEST-* accounts.")

    def handle(self, *args, password, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo_school only runs with DEBUG=True — never against production.")
        year = timezone.localdate().year

        def account(username, role, first):
            user, _ = User.objects.get_or_create(
                username=username, defaults={"role": role, "first_name": first, "last_name": "Example"}
            )
            user.set_password(password)
            user.save()
            return user

        student = account("TEST-STU-001", "student", "Testa")
        classmate = account("TEST-STU-002", "student", "Testo")
        teacher = account("TEST-STAFF-01", "staff", "Tutor")
        account("test-admin", "admin", "Adminna")

        term1, _ = Term.objects.get_or_create(
            year=year, name="term-1",
            defaults={"start_date": date(year, 1, 6), "end_date": date(year, 4, 4), "results_published": True},
        )
        term2, _ = Term.objects.get_or_create(
            year=year, name="term-2",
            defaults={"start_date": date(year, 4, 28), "end_date": date(year, 8, 1), "results_published": True},
        )
        # Current term is open for results entry (not yet published to students).
        term3, _ = Term.objects.get_or_create(
            year=year, name="term-3",
            defaults={"start_date": date(year, 9, 1), "end_date": date(year, 11, 28), "results_published": False},
        )
        Term.objects.filter(is_current=True).exclude(pk=term3.pk).update(is_current=False)
        Term.objects.filter(pk=term3.pk).update(is_current=True)

        subjects = {code: Subject.objects.get_or_create(code=code, defaults={"name": name})[0] for name, code in SUBJECTS}
        cls, _ = SchoolClass.objects.get_or_create(
            name="Grade 5 Demo", year=year, defaults={"grade": "grade-5", "class_teacher": teacher}
        )
        for user in (student, classmate):
            StudentProfile.objects.update_or_create(user=user, defaults={"school_class": cls})
        for subject in subjects.values():
            TeachingAssignment.objects.get_or_create(teacher=teacher, school_class=cls, subject=subject)

        codes = list(subjects)
        for day in range(1, 6):
            for i, (start, end) in enumerate(SLOTS):
                subject = subjects[codes[(day + i) % len(codes)]]
                TimetableEntry.objects.get_or_create(
                    school_class=cls, day=day, start_time=start,
                    defaults={"end_time": end, "subject": subject, "teacher": teacher, "room": "Room 5"},
                )

        for code, (t1, t2) in SCORES.items():
            for term, score in ((term1, t1), (term2, t2)):
                Result.objects.update_or_create(
                    student=student, subject=subjects[code], term=term,
                    defaults={"school_class": cls, "score": score, "entered_by": teacher,
                              "comment": "Sample comment — demo data."},
                )

        now = timezone.now()
        for title, body, school_class, days_ago in [
            ("[Demo] Half-term break", "School closes on Friday at 12:30 pm and reopens on Monday.", None, 1),
            ("[Demo] Maths homework", "Complete exercise 4B on page 32.\n\nBring your geometry set on Tuesday.", cls, 0),
            ("[Demo] Swimming kit", "Grade 5 swimming starts next week. Please pack a towel and costume.", cls, 4),
        ]:
            Announcement.objects.get_or_create(
                title=title,
                defaults={"body": body, "school_class": school_class, "author": teacher,
                          "published_at": now - timedelta(days=days_ago)},
            )

        FeeRecord.objects.update_or_create(student=student, term=term1, defaults={"amount_due": 32000, "amount_paid": 32000})
        FeeRecord.objects.update_or_create(student=student, term=term2, defaults={"amount_due": 32000, "amount_paid": 14500})

        self.stdout.write(self.style.SUCCESS(
            "Demo school ready. Sign in as TEST-STU-001, TEST-STAFF-01 or test-admin."
        ))
