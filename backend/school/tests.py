"""Role and object-level access tests for the portal API.

Fixture world:
  class_a (Grade 4, Primary): student_a, student_b — taught Maths by teacher_t
  class_b (Grade 8, Junior Secondary): student_c — taught English by teacher_u
  term_pub: results published; term_hidden: not published
"""
from datetime import date, time, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.test import APIClient

from .grading import level_for
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
)

User = get_user_model()
API = "/api/school"


@pytest.fixture
def w(db):
    """The fixture world (obviously fake people)."""

    class W:
        pass

    x = W()
    x.term_pub = Term.objects.create(year=2026, name="term-1", start_date=date(2026, 1, 5), end_date=date(2026, 4, 3),
                                     results_published=True)
    x.term_hidden = Term.objects.create(year=2026, name="term-2", start_date=date(2026, 5, 4), end_date=date(2026, 8, 7),
                                        is_current=True)
    x.maths = Subject.objects.create(name="Mathematics", code="maths")
    x.english = Subject.objects.create(name="English", code="english")
    x.class_a = SchoolClass.objects.create(name="Grade 4 Blue", grade="grade-4", year=2026)
    x.class_b = SchoolClass.objects.create(name="Grade 8 Red", grade="grade-8", year=2026)

    def user(username, role, **kw):
        return User.objects.create_user(username=username, password="pw-not-real-123", role=role, **kw)

    x.student_a = user("TEST-A", "student", first_name="Testa")
    x.student_b = user("TEST-B", "student", first_name="Testb")
    x.student_c = user("TEST-C", "student", first_name="Testc")
    for s, c in ((x.student_a, x.class_a), (x.student_b, x.class_a), (x.student_c, x.class_b)):
        StudentProfile.objects.create(user=s, school_class=c)
    x.teacher_t = user("STAFF-T", "staff")
    x.teacher_u = user("STAFF-U", "staff")
    x.admin = user("ADMIN-1", "admin")
    TeachingAssignment.objects.create(teacher=x.teacher_t, school_class=x.class_a, subject=x.maths)
    TeachingAssignment.objects.create(teacher=x.teacher_u, school_class=x.class_b, subject=x.english)

    def result(student, cls, subject, term, score):
        return Result.objects.create(student=student, school_class=cls, subject=subject, term=term, score=score)

    x.r_a_pub = result(x.student_a, x.class_a, x.maths, x.term_pub, 81)
    x.r_a_hidden = result(x.student_a, x.class_a, x.maths, x.term_hidden, 60)
    x.r_a_english = result(x.student_a, x.class_a, x.english, x.term_pub, 70)  # nobody teaches this pair
    x.r_b_pub = result(x.student_b, x.class_a, x.maths, x.term_pub, 45)
    x.r_c_pub = result(x.student_c, x.class_b, x.english, x.term_pub, 92)
    return x


def client_for(user=None):
    c = APIClient()
    if user:
        c.force_authenticate(user)
    return c


def ids(resp):
    return sorted(item["id"] for item in resp.json())


# ---------------------------------------------------------------- grading

@pytest.mark.parametrize(
    "score,grade,code",
    [(100, "grade-4", "EE"), (75, "grade-4", "EE"), (74.99, "grade-4", "ME"), (50, "pp1", "ME"),
     (25, "grade-6", "AE"), (0, "grade-1", "BE"),
     (90, "grade-8", "EE1"), (89.5, "grade-8", "EE2"), (58, "grade-7", "ME1"), (41, "grade-9", "ME2"),
     (31, "grade-9", "AE1"), (21, "grade-9", "AE2"), (11, "grade-9", "BE1"), (10, "grade-9", "BE2")],
)
def test_cbc_levels(score, grade, code):
    assert level_for(Decimal(str(score)), grade)[0] == code


def test_level_is_stored_and_recomputed(w):
    assert w.r_a_pub.level == "EE"
    assert w.r_c_pub.level == "EE1"  # Junior Secondary 8-level scale
    w.r_a_pub.score = 30
    w.r_a_pub.save()
    assert w.r_a_pub.level == "AE"


# ---------------------------------------------------------------- auth

@pytest.mark.parametrize("path", ["me/", "results/", "announcements/", "timetable/", "fees/", "classes/", "terms/"])
def test_everything_requires_login(w, path):
    assert client_for().get(f"{API}/{path}").status_code == 401


# ---------------------------------------------------------------- results: students

def test_student_sees_only_own_published_results(w):
    resp = client_for(w.student_a).get(f"{API}/results/")
    assert resp.status_code == 200
    assert ids(resp) == sorted([w.r_a_pub.id, w.r_a_english.id])


@pytest.mark.parametrize("other", ["r_b_pub", "r_c_pub"])
def test_student_cannot_read_another_students_result_by_id(w, other):
    target = getattr(w, other)
    resp = client_for(w.student_a).get(f"{API}/results/{target.id}/")
    assert resp.status_code == 404
    assert "score" not in resp.json()


def test_student_cannot_find_other_results_via_filters(w):
    c = client_for(w.student_a)
    for q in (f"?school_class={w.class_a.id}", f"?subject={w.maths.id}", f"?term={w.term_pub.id}"):
        assert w.r_b_pub.id not in ids(c.get(f"{API}/results/{q}"))


def test_student_cannot_see_unpublished_term_even_own(w):
    assert client_for(w.student_a).get(f"{API}/results/{w.r_a_hidden.id}/").status_code == 404


def test_publishing_the_term_reveals_results(w):
    w.term_hidden.results_published = True
    w.term_hidden.save()
    assert client_for(w.student_a).get(f"{API}/results/{w.r_a_hidden.id}/").status_code == 200


def test_student_cannot_write_results(w):
    c = client_for(w.student_a)
    payload = {"student": w.student_a.id, "school_class": w.class_a.id, "subject": w.maths.id,
               "term": w.term_hidden.id, "score": 100}
    assert c.post(f"{API}/results/", payload, format="json").status_code == 403
    assert c.patch(f"{API}/results/{w.r_a_pub.id}/", {"score": 100}, format="json").status_code == 403
    assert c.delete(f"{API}/results/{w.r_a_pub.id}/").status_code == 403
    w.r_a_pub.refresh_from_db()
    assert w.r_a_pub.score == 81


# ---------------------------------------------------------------- results: staff

def test_staff_sees_only_results_for_classes_and_subjects_they_teach(w):
    resp = client_for(w.teacher_t).get(f"{API}/results/")
    # Maths in class A, both terms (staff see unpublished results). Not English in class A, not class B.
    assert ids(resp) == sorted([w.r_a_pub.id, w.r_a_hidden.id, w.r_b_pub.id])
    assert client_for(w.teacher_t).get(f"{API}/results/{w.r_c_pub.id}/").status_code == 404
    assert client_for(w.teacher_t).get(f"{API}/results/{w.r_a_english.id}/").status_code == 404


def test_staff_enters_result_for_own_class(w):
    Result.objects.filter(student=w.student_b, term=w.term_hidden).delete()
    payload = {"student": w.student_b.id, "school_class": w.class_a.id, "subject": w.maths.id,
               "term": w.term_hidden.id, "score": "77.5", "comment": "Good progress"}
    resp = client_for(w.teacher_t).post(f"{API}/results/", payload, format="json")
    assert resp.status_code == 201, resp.json()
    body = resp.json()
    assert body["level"] == "EE" and body["level_label"] == "Exceeding Expectations"
    assert Result.objects.get(id=body["id"]).entered_by == w.teacher_t


@pytest.mark.parametrize(
    "cls,subject,student",
    [("class_a", "english", "student_b"),   # teaches the class, but not this subject
     ("class_b", "english", "student_c"),   # someone else's class
     ("class_b", "maths", "student_c")],    # no one's assignment
)
def test_staff_cannot_enter_results_outside_their_assignments(w, cls, subject, student):
    payload = {"student": getattr(w, student).id, "school_class": getattr(w, cls).id,
               "subject": getattr(w, subject).id, "term": w.term_hidden.id, "score": 50}
    resp = client_for(w.teacher_t).post(f"{API}/results/", payload, format="json")
    assert resp.status_code == 403
    assert not Result.objects.filter(student=getattr(w, student), term=w.term_hidden, subject=getattr(w, subject)).exists()


def test_staff_cannot_put_a_student_from_another_class_into_their_class(w):
    payload = {"student": w.student_c.id, "school_class": w.class_a.id, "subject": w.maths.id,
               "term": w.term_hidden.id, "score": 50}
    resp = client_for(w.teacher_t).post(f"{API}/results/", payload, format="json")
    assert resp.status_code == 400
    assert "student" in resp.json()


def test_staff_cannot_edit_or_delete_results_in_other_classes(w):
    c = client_for(w.teacher_t)
    assert c.patch(f"{API}/results/{w.r_c_pub.id}/", {"score": 1}, format="json").status_code == 404
    assert c.delete(f"{API}/results/{w.r_c_pub.id}/").status_code == 404
    w.r_c_pub.refresh_from_db()
    assert w.r_c_pub.score == 92


def test_staff_edit_changes_score_only(w):
    c = client_for(w.teacher_t)
    resp = c.patch(f"{API}/results/{w.r_b_pub.id}/",
                   {"score": 95, "student": w.student_a.id, "subject": w.english.id, "school_class": w.class_b.id},
                   format="json")
    assert resp.status_code == 200
    w.r_b_pub.refresh_from_db()
    assert (w.r_b_pub.score, w.r_b_pub.level) == (95, "EE")
    assert (w.r_b_pub.student, w.r_b_pub.subject, w.r_b_pub.school_class) == (w.student_b, w.maths, w.class_a)


def test_score_must_be_0_to_100_and_unique_per_term(w):
    c = client_for(w.teacher_t)
    assert c.patch(f"{API}/results/{w.r_b_pub.id}/", {"score": 101}, format="json").status_code == 400
    dup = {"student": w.student_b.id, "school_class": w.class_a.id, "subject": w.maths.id,
           "term": w.term_pub.id, "score": 50}
    assert c.post(f"{API}/results/", dup, format="json").status_code == 400


def test_admin_sees_all_results(w):
    assert len(client_for(w.admin).get(f"{API}/results/").json()) == Result.objects.count()


# ---------------------------------------------------------------- announcements

@pytest.fixture
def notices(w):
    now = timezone.now()
    return {
        "school": Announcement.objects.create(title="School", body="b", author=w.admin, published_at=now),
        "a": Announcement.objects.create(title="Class A", body="b", school_class=w.class_a, author=w.teacher_t,
                                         published_at=now),
        "b": Announcement.objects.create(title="Class B", body="b", school_class=w.class_b, author=w.teacher_u,
                                         published_at=now),
        "future": Announcement.objects.create(title="Later", body="b", school_class=w.class_a, author=w.teacher_t,
                                              published_at=now + timedelta(days=2)),
    }


def test_student_sees_school_and_own_class_announcements_only(w, notices):
    resp = client_for(w.student_a).get(f"{API}/announcements/")
    assert ids(resp) == sorted([notices["school"].id, notices["a"].id])
    assert client_for(w.student_a).get(f"{API}/announcements/{notices['b'].id}/").status_code == 404


def test_student_cannot_post_announcements(w):
    resp = client_for(w.student_a).post(f"{API}/announcements/", {"title": "x", "body": "y"}, format="json")
    assert resp.status_code == 403


def test_staff_posts_to_own_class(w):
    resp = client_for(w.teacher_t).post(
        f"{API}/announcements/", {"title": "Homework", "body": "Page 12", "school_class": w.class_a.id}, format="json"
    )
    assert resp.status_code == 201
    assert Announcement.objects.get(id=resp.json()["id"]).author == w.teacher_t


@pytest.mark.parametrize("payload_class", ["class_b", None, "omitted"])
def test_staff_cannot_post_to_other_classes_or_whole_school(w, payload_class):
    payload = {"title": "x", "body": "y"}
    if payload_class != "omitted":
        payload["school_class"] = getattr(w, payload_class).id if payload_class else None
    resp = client_for(w.teacher_t).post(f"{API}/announcements/", payload, format="json")
    assert resp.status_code == 403
    assert not Announcement.objects.filter(title="x").exists()


def test_admin_posts_school_wide(w):
    resp = client_for(w.admin).post(f"{API}/announcements/", {"title": "Closing day", "body": "Fri"}, format="json")
    assert resp.status_code == 201
    assert resp.json()["school_class"] is None


def test_staff_edits_only_own_announcements(w, notices):
    c = client_for(w.teacher_t)
    assert c.patch(f"{API}/announcements/{notices['a'].id}/", {"title": "Edited"}, format="json").status_code == 200
    # Visible to them, but not theirs to edit.
    assert c.patch(f"{API}/announcements/{notices['school'].id}/", {"title": "Hack"}, format="json").status_code == 404
    assert c.delete(f"{API}/announcements/{notices['b'].id}/").status_code == 404
    # Can't move their post to someone else's class.
    resp = c.patch(f"{API}/announcements/{notices['a'].id}/", {"school_class": w.class_b.id}, format="json")
    assert resp.status_code == 403


# ---------------------------------------------------------------- timetable

@pytest.fixture
def lessons(w):
    return {
        "a": TimetableEntry.objects.create(school_class=w.class_a, subject=w.maths, teacher=w.teacher_t, day=1,
                                           start_time=time(8), end_time=time(8, 40)),
        "b": TimetableEntry.objects.create(school_class=w.class_b, subject=w.english, teacher=w.teacher_u, day=1,
                                           start_time=time(8), end_time=time(8, 40)),
    }


def test_timetable_is_scoped(w, lessons):
    assert ids(client_for(w.student_a).get(f"{API}/timetable/")) == [lessons["a"].id]
    assert ids(client_for(w.student_c).get(f"{API}/timetable/")) == [lessons["b"].id]
    assert ids(client_for(w.teacher_t).get(f"{API}/timetable/")) == [lessons["a"].id]
    assert ids(client_for(w.admin).get(f"{API}/timetable/")) == sorted([lessons["a"].id, lessons["b"].id])
    assert client_for(w.student_a).get(f"{API}/timetable/{lessons['b'].id}/").status_code == 404


def test_timetable_is_read_only_via_api(w, lessons):
    resp = client_for(w.admin).post(f"{API}/timetable/", {}, format="json")
    assert resp.status_code == 405


def test_overlapping_lessons_are_rejected(w, lessons):
    clash = TimetableEntry(school_class=w.class_a, subject=w.english, day=1, start_time=time(8, 20),
                           end_time=time(9))
    with pytest.raises(ValidationError):
        clash.full_clean()


# ---------------------------------------------------------------- fees

@pytest.fixture
def fees(w):
    return {
        "a": FeeRecord.objects.create(student=w.student_a, term=w.term_pub, amount_due=30000, amount_paid=12500),
        "b": FeeRecord.objects.create(student=w.student_b, term=w.term_pub, amount_due=30000, amount_paid=30000),
    }


def test_student_sees_only_own_fees_with_balance(w, fees):
    resp = client_for(w.student_a).get(f"{API}/fees/")
    assert ids(resp) == [fees["a"].id]
    assert resp.json()[0]["balance"] == "17500.00"
    assert client_for(w.student_a).get(f"{API}/fees/{fees['b'].id}/").status_code == 404


def test_staff_cannot_see_fees(w, fees):
    assert client_for(w.teacher_t).get(f"{API}/fees/").status_code == 403
    assert client_for(w.teacher_t).get(f"{API}/fees/{fees['a'].id}/").status_code == 403


def test_fees_are_read_only_via_api(w, fees):
    c = client_for(w.student_a)
    assert c.patch(f"{API}/fees/{fees['a'].id}/", {"amount_paid": 30000}, format="json").status_code == 405


# ---------------------------------------------------------------- classes & profile

def test_students_cannot_list_classes_or_classmates(w):
    assert client_for(w.student_a).get(f"{API}/classes/").status_code == 403


def test_staff_see_only_their_classes_with_students(w):
    resp = client_for(w.teacher_t).get(f"{API}/classes/")
    data = resp.json()
    assert [c["id"] for c in data] == [w.class_a.id]
    assert sorted(s["username"] for s in data[0]["students"]) == ["TEST-A", "TEST-B"]
    assert [s["code"] for s in data[0]["my_subjects"]] == ["maths"]
    assert client_for(w.teacher_t).get(f"{API}/classes/{w.class_b.id}/").status_code == 404


def test_class_teacher_sees_their_class(w):
    w.class_b.class_teacher = w.teacher_t
    w.class_b.save()
    assert w.class_b.id in [c["id"] for c in client_for(w.teacher_t).get(f"{API}/classes/").json()]


def test_me_for_student_and_staff(w):
    me = client_for(w.student_a).get(f"{API}/me/").json()
    assert me["school_class"]["name"] == "Grade 4 Blue" and me["school_class"]["section"] == "primary"
    staff = client_for(w.teacher_t).get(f"{API}/me/").json()
    assert [(a["class_name"], a["subject_name"]) for a in staff["assignments"]] == [("Grade 4 Blue", "Mathematics")]


# ---------------------------------------------------------------- integrity

def test_only_one_current_term(w):
    with pytest.raises(IntegrityError):
        Term.objects.create(year=2026, name="term-3", start_date=date(2026, 9, 1), end_date=date(2026, 11, 20),
                            is_current=True)


def test_result_rejects_student_not_in_class(w):
    r = Result(student=w.student_c, school_class=w.class_a, subject=w.maths, term=w.term_hidden, score=50)
    with pytest.raises(ValidationError):
        r.full_clean()


def test_only_students_get_profiles_and_only_staff_teach(w):
    with pytest.raises(ValidationError):
        StudentProfile(user=w.teacher_u, school_class=w.class_a).full_clean()
    with pytest.raises(ValidationError):
        TeachingAssignment(teacher=w.student_a, school_class=w.class_a, subject=w.english).full_clean()


# ---------------------------------------------------------------- demo seed

def test_seed_demo_school_refuses_in_production(db, settings):
    from django.core.management import CommandError, call_command

    settings.DEBUG = False
    with pytest.raises(CommandError):
        call_command("seed_demo_school")
    assert not User.objects.filter(username="TEST-STU-001").exists()


def test_seed_demo_school_is_idempotent(db, settings):
    from django.core.management import call_command

    settings.DEBUG = True
    call_command("seed_demo_school")
    call_command("seed_demo_school")
    student = User.objects.get(username="TEST-STU-001")
    assert Result.objects.filter(student=student).count() == 10
    assert TimetableEntry.objects.count() == 25
    resp = client_for(student).get(f"{API}/results/")
    assert len(resp.json()) == 10
