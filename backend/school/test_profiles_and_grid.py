"""Profiles (own details, admin-only edits, password change) and the class results table.

Uses the fixture world from school/tests.py:
  class_a (Grade 4): student_a, student_b, taught Maths by teacher_t
  class_b (Grade 8): student_c, taught English by teacher_u
  term_pub: results published; term_hidden: current, not published
"""
from datetime import date, timedelta

import pytest
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Result, SchoolClass, StaffProfile, StudentProfile, Subject, TeachingAssignment
from .tests import client_for, w  # noqa: F401  (w is a pytest fixture)

API = "/api/school"
GRID = f"{API}/results/grid/"
ADMIN_USERS = "/api/admin/users"
PASSWORD = "/api/auth/password/"


# ---------------------------------------------------------------- own profile


def set_student_details(user, **details):
    StudentProfile.objects.filter(user=user).update(**details)


def test_student_profile_shows_own_details_and_class_teacher(w):
    w.class_a.class_teacher = w.teacher_t
    w.class_a.save()
    set_student_details(w.student_a, date_of_birth=date(2016, 3, 9), guardian_name="Testa Guardian",
                        guardian_phone="0700 000 001")
    me = client_for(w.student_a).get(f"{API}/me/").json()
    assert me["details"] == {"date_of_birth": "2016-03-09", "guardian_name": "Testa Guardian",
                             "guardian_phone": "0700 000 001"}
    assert me["school_class"]["class_teacher_name"] == "STAFF-T"
    assert me["first_name"] == "Testa" and "assignments" not in me


def test_profile_never_shows_another_pupils_details(w):
    """/me/ takes no ID: a student only ever gets their own record, whatever they send."""
    set_student_details(w.student_b, guardian_name="Testb Guardian", guardian_phone="0700 000 002")
    c = client_for(w.student_a)
    for resp in (c.get(f"{API}/me/"), c.get(f"{API}/me/", {"id": w.student_b.id}),
                 c.get(f"{API}/me/", {"user": w.student_b.id})):
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == w.student_a.id
        assert "Testb Guardian" not in str(body) and "0700 000 002" not in str(body)


def test_students_cannot_read_other_profiles_through_admin_api(w):
    for user in (w.student_a, w.teacher_t):
        c = client_for(user)
        assert c.get(f"{ADMIN_USERS}/{w.student_b.id}/").status_code == 403
        assert c.get(f"{ADMIN_USERS}/").status_code == 403


def test_staff_profile_shows_details_classes_and_subjects(w):
    StaffProfile.objects.create(user=w.teacher_t, staff_number="TSC-0001", phone="+254 700 000 003")
    w.class_b.class_teacher = w.teacher_t
    w.class_b.save()
    me = client_for(w.teacher_t).get(f"{API}/me/").json()
    assert me["details"] == {"staff_number": "TSC-0001", "phone": "+254 700 000 003"}
    assert me["class_teacher_of"] == [{"id": w.class_b.id, "name": "Grade 8 Red"}]
    assert [a["subject_name"] for a in me["assignments"]] == ["Mathematics"]
    assert "school_class" not in me


def test_profile_without_saved_details_is_blank_not_an_error(w):
    assert client_for(w.teacher_u).get(f"{API}/me/").json()["details"] == {"staff_number": "", "phone": ""}
    StudentProfile.objects.filter(user=w.student_c).delete()
    me = client_for(w.student_c).get(f"{API}/me/").json()
    assert me["school_class"] is None and me["details"]["guardian_name"] == ""


def test_profile_cannot_be_edited_by_its_owner(w):
    for user in (w.student_a, w.teacher_t):
        c = client_for(user)
        for method in ("put", "patch", "post"):
            resp = getattr(c, method)(f"{API}/me/", {"guardian_phone": "0711 111 111", "phone": "0711 111 111"},
                                      format="json")
            assert resp.status_code == 405
        assert c.patch(f"{ADMIN_USERS}/{user.id}/", {"first_name": "Hacked"}, format="json").status_code == 403
    assert StudentProfile.objects.get(user=w.student_a).guardian_phone == ""


def test_staff_numbers_are_unique_but_blank_is_allowed(w):
    StaffProfile.objects.create(user=w.teacher_t, staff_number="")
    StaffProfile.objects.create(user=w.teacher_u, staff_number="")
    StaffProfile.objects.filter(user=w.teacher_t).update(staff_number="TSC-9")
    with pytest.raises(IntegrityError):
        StaffProfile.objects.filter(user=w.teacher_u).update(staff_number="TSC-9")


# ---------------------------------------------------------------- admin edits details


def test_admin_edits_student_details(w):
    resp = client_for(w.admin).patch(f"{ADMIN_USERS}/{w.student_a.id}/", {
        "date_of_birth": "2016-03-09", "guardian_name": "  Testa Guardian ", "guardian_phone": "+254 700 000 001",
    }, format="json")
    assert resp.status_code == 200, resp.json()
    body = resp.json()
    assert (body["date_of_birth"], body["guardian_name"], body["guardian_phone"]) == (
        "2016-03-09", "Testa Guardian", "+254 700 000 001")
    assert body["school_class"] == w.class_a.id  # untouched
    profile = StudentProfile.objects.get(user=w.student_a)
    assert profile.guardian_name == "Testa Guardian" and profile.school_class == w.class_a


def test_admin_edits_staff_details_and_creates_profile_on_first_edit(w):
    assert not StaffProfile.objects.filter(user=w.teacher_t).exists()
    resp = client_for(w.admin).patch(f"{ADMIN_USERS}/{w.teacher_t.id}/",
                                     {"staff_number": "TSC-0001", "phone": "0700 000 003"}, format="json")
    assert resp.status_code == 200, resp.json()
    assert (resp.json()["staff_number"], resp.json()["phone"]) == ("TSC-0001", "0700 000 003")
    assert StaffProfile.objects.get(user=w.teacher_t).phone == "0700 000 003"
    listing = client_for(w.admin).get(f"{ADMIN_USERS}/", {"role": "staff"}).json()
    assert {u["username"]: u["staff_number"] for u in listing}["STAFF-T"] == "TSC-0001"


def test_admin_creates_users_with_details(w):
    c = client_for(w.admin)
    resp = c.post(f"{ADMIN_USERS}/", {"username": "TEST-NEW", "role": "student", "school_class": w.class_b.id,
                                      "guardian_name": "New Guardian", "guardian_phone": "0700 000 009"},
                  format="json")
    assert resp.status_code == 201, resp.json()
    profile = StudentProfile.objects.get(user__username="TEST-NEW")
    assert profile.guardian_name == "New Guardian" and profile.school_class == w.class_b
    resp = c.post(f"{ADMIN_USERS}/", {"username": "STAFF-NEW", "role": "staff", "staff_number": "TSC-7"},
                  format="json")
    assert resp.status_code == 201, resp.json()
    assert StaffProfile.objects.get(user__username="STAFF-NEW").staff_number == "TSC-7"


@pytest.mark.parametrize("who,payload,field", [
    ("teacher_t", {"guardian_name": "X"}, "guardian_name"),
    ("teacher_t", {"date_of_birth": "2016-01-01"}, "date_of_birth"),
    ("student_a", {"staff_number": "TSC-1"}, "staff_number"),
    ("student_a", {"phone": "0700 000 000"}, "phone"),
    ("student_a", {"guardian_phone": "call me"}, "guardian_phone"),
    ("student_a", {"guardian_phone": "12"}, "guardian_phone"),
    ("teacher_t", {"phone": "0700-000-000; DROP"}, "phone"),
])
def test_admin_detail_validation(w, who, payload, field):
    resp = client_for(w.admin).patch(f"{ADMIN_USERS}/{getattr(w, who).id}/", payload, format="json")
    assert resp.status_code == 400 and field in resp.json()


def test_date_of_birth_must_be_in_the_past(w):
    tomorrow = (timezone.localdate() + timedelta(days=1)).isoformat()
    resp = client_for(w.admin).patch(f"{ADMIN_USERS}/{w.student_a.id}/", {"date_of_birth": tomorrow}, format="json")
    assert resp.status_code == 400 and "date_of_birth" in resp.json()


def test_duplicate_staff_number_is_a_friendly_error(w):
    StaffProfile.objects.create(user=w.teacher_u, staff_number="TSC-9")
    resp = client_for(w.admin).patch(f"{ADMIN_USERS}/{w.teacher_t.id}/", {"staff_number": "tsc-9"}, format="json")
    assert resp.status_code == 400 and "staff_number" in resp.json()
    # Re-saving your own number is fine.
    ok = client_for(w.admin).patch(f"{ADMIN_USERS}/{w.teacher_u.id}/", {"staff_number": "TSC-9"}, format="json")
    assert ok.status_code == 200


def test_editing_details_does_not_move_a_student_out_of_their_class(w):
    client_for(w.admin).patch(f"{ADMIN_USERS}/{w.student_a.id}/", {"guardian_name": "Kept"}, format="json")
    assert StudentProfile.objects.get(user=w.student_a).school_class == w.class_a


# ---------------------------------------------------------------- change own password


def login(username, password):
    return APIClient().post("/api/auth/token/", {"username": username, "password": password}, format="json")


@pytest.mark.parametrize("who", ["student_a", "teacher_t", "admin"])
def test_user_changes_own_password(w, who):
    user = getattr(w, who)
    resp = client_for(user).post(PASSWORD, {"current_password": "pw-not-real-123",
                                            "new_password": "Blue-Heron-Valley-42"}, format="json")
    assert resp.status_code == 200, resp.json()
    assert login(user.username, "Blue-Heron-Valley-42").status_code == 200
    assert login(user.username, "pw-not-real-123").status_code == 401


def test_password_change_needs_the_current_password(w):
    resp = client_for(w.student_a).post(PASSWORD, {"current_password": "wrong",
                                                   "new_password": "Blue-Heron-Valley-42"}, format="json")
    assert resp.status_code == 400 and "current_password" in resp.json()
    w.student_a.refresh_from_db()
    assert w.student_a.check_password("pw-not-real-123")


@pytest.mark.parametrize("new", ["short", "password123", "12345678901", "pw-not-real-123"])
def test_password_change_rejects_weak_or_unchanged_passwords(w, new):
    resp = client_for(w.student_a).post(PASSWORD, {"current_password": "pw-not-real-123", "new_password": new},
                                        format="json")
    assert resp.status_code == 400 and "new_password" in resp.json()


def test_password_change_requires_login(db):
    assert APIClient().post(PASSWORD, {"current_password": "x", "new_password": "y"}, format="json").status_code == 401


def test_password_change_is_throttled(w, monkeypatch):
    from django.core.cache import cache
    from rest_framework.throttling import ScopedRateThrottle

    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", {"login": "2/minute"})
    cache.clear()
    c = client_for(w.student_a)
    codes = [c.post(PASSWORD, {"current_password": "wrong", "new_password": "x"}, format="json").status_code
             for _ in range(3)]
    cache.clear()
    assert codes == [400, 400, 429]


# ---------------------------------------------------------------- results table (grid)


@pytest.fixture
def science(w):
    """teacher_t also teaches Science in class_a; teacher_u teaches English in class_a too."""
    sci = Subject.objects.create(name="Science", code="science")
    TeachingAssignment.objects.create(teacher=w.teacher_t, school_class=w.class_a, subject=sci)
    TeachingAssignment.objects.create(teacher=w.teacher_u, school_class=w.class_a, subject=w.english)
    return sci


def cells(w, items, term=None, cls=None):
    return {"school_class": (cls or w.class_a).id, "term": (term or w.term_hidden).id,
            "cells": [{"student": s.id, "subject": subj.id, "score": score} for s, subj, score in items]}


def test_grid_shows_only_the_teachers_subjects_and_class(w, science):
    body = client_for(w.teacher_t).get(GRID, {"school_class": w.class_a.id}).json()
    assert [s["name"] for s in body["subjects"]] == ["Mathematics", "Science"]  # not English (teacher_u's)
    assert [s["id"] for s in body["students"]] == sorted([w.student_a.id, w.student_b.id],
                                                         key=lambda i: {w.student_a.id: "Testa",
                                                                        w.student_b.id: "Testb"}[i])
    assert body["term"]["id"] == w.term_hidden.id  # defaults to the current term
    assert body["locked"] is False
    assert [(r["student"], r["subject"], r["score"]) for r in body["results"]] == [
        (w.student_a.id, w.maths.id, "60.00")]


def test_grid_for_published_term_is_locked_for_staff(w):
    body = client_for(w.teacher_t).get(GRID, {"school_class": w.class_a.id, "term": w.term_pub.id}).json()
    assert body["locked"] is True
    assert {(r["student"], r["score"]) for r in body["results"]} == {(w.student_a.id, "81.00"),
                                                                    (w.student_b.id, "45.00")}
    # English results exist for student_a in this term, but teacher_t doesn't teach English.
    assert all(r["subject"] == w.maths.id for r in body["results"])


def test_grid_admin_sees_every_taught_subject(w, science):
    body = client_for(w.admin).get(GRID, {"school_class": w.class_a.id, "term": w.term_pub.id}).json()
    assert [s["name"] for s in body["subjects"]] == ["English", "Mathematics", "Science"]
    assert body["locked"] is False


@pytest.mark.parametrize("params", [
    {"school_class": "class_b"},       # a class they don't teach
    {"school_class": "missing"},       # no such class
    {"school_class": "abc"},
    {},
    {"school_class": "class_a", "term": "999999"},
    {"school_class": "class_a", "term": "x"},
])
def test_grid_unknown_or_foreign_class_is_not_found(w, params):
    resolved = {k: {"class_a": w.class_a.id, "class_b": w.class_b.id, "missing": 999999}.get(v, v)
                for k, v in params.items()}
    assert client_for(w.teacher_t).get(GRID, resolved).status_code == 404


def test_class_teacher_without_a_subject_cannot_open_the_grid(w):
    w.class_b.class_teacher = w.teacher_t
    w.class_b.save()
    assert client_for(w.teacher_t).get(GRID, {"school_class": w.class_b.id}).status_code == 404


@pytest.mark.parametrize("who", ["student_a", "student_c"])
def test_students_have_no_access_to_the_grid(w, who):
    c = client_for(getattr(w, who))
    assert c.get(GRID, {"school_class": w.class_a.id}).status_code == 403
    resp = c.post(GRID, cells(w, [(w.student_a, w.maths, 100)]), format="json")
    assert resp.status_code == 403
    assert Result.objects.get(student=w.student_a, subject=w.maths, term=w.term_hidden).score == 60


def test_grid_requires_login(w):
    assert APIClient().get(GRID, {"school_class": w.class_a.id}).status_code == 401
    assert APIClient().post(GRID, {}, format="json").status_code == 401


def test_grid_saves_creates_updates_and_clears_across_subjects(w, science):
    Result.objects.filter(student=w.student_a, subject=w.maths, term=w.term_hidden).update(comment="Keep me")
    resp = client_for(w.teacher_t).post(GRID, cells(w, [
        (w.student_a, w.maths, "88.5"),   # update, comment kept
        (w.student_a, science, 74),       # create
        (w.student_b, science, 30),       # create
        (w.student_b, w.maths, None),     # clearing a missing result is a no-op
    ]), format="json")
    assert resp.status_code == 200, resp.json()
    saved = {(r["student"], r["subject"]): r for r in resp.json()["results"]}
    assert saved[(w.student_a.id, w.maths.id)]["score"] == "88.50"
    assert saved[(w.student_a.id, w.maths.id)]["level"] == "EE"
    assert saved[(w.student_a.id, w.maths.id)]["comment"] == "Keep me"
    assert saved[(w.student_b.id, science.id)]["level"] == "AE"
    assert (w.student_b.id, w.maths.id) not in saved
    assert Result.objects.get(student=w.student_a, subject=science, term=w.term_hidden).entered_by == w.teacher_t

    resp = client_for(w.teacher_t).post(GRID, cells(w, [(w.student_a, w.maths, None)]), format="json")
    assert resp.status_code == 200
    assert not Result.objects.filter(student=w.student_a, subject=w.maths, term=w.term_hidden).exists()


def test_grid_save_is_all_or_nothing(w, science):
    resp = client_for(w.teacher_t).post(GRID, cells(w, [
        (w.student_a, w.maths, 99),
        (w.student_b, science, 101),  # out of range
    ]), format="json")
    assert resp.status_code == 400
    assert resp.json()["cells"][1]["score"]
    assert Result.objects.get(student=w.student_a, subject=w.maths, term=w.term_hidden).score == 60
    assert not Result.objects.filter(subject=science).exists()


def test_grid_reports_row_errors_by_position(w):
    resp = client_for(w.teacher_t).post(GRID, cells(w, [
        (w.student_a, w.maths, 50),
        (w.student_c, w.maths, 50),   # not in class_a
        (w.student_a, w.maths, 51),   # duplicate cell
    ]), format="json")
    assert resp.status_code == 400
    errs = resp.json()["cells"]
    assert errs[0] == {} and "student" in errs[1] and "student" in errs[2]
    assert Result.objects.get(student=w.student_a, subject=w.maths, term=w.term_hidden).score == 60


def test_staff_cannot_save_a_subject_they_dont_teach_even_mixed_with_their_own(w, science):
    """English in class_a belongs to teacher_u: one foreign cell rejects the whole save."""
    resp = client_for(w.teacher_t).post(GRID, cells(w, [
        (w.student_a, w.maths, 99),
        (w.student_b, w.english, 99),
    ]), format="json")
    assert resp.status_code == 403
    assert Result.objects.get(student=w.student_a, subject=w.maths, term=w.term_hidden).score == 60
    assert not Result.objects.filter(student=w.student_b, subject=w.english).exists()


def test_staff_cannot_save_into_a_class_they_dont_teach(w):
    resp = client_for(w.teacher_t).post(GRID, cells(w, [(w.student_c, w.english, 10)], cls=w.class_b),
                                        format="json")
    assert resp.status_code == 403
    assert Result.objects.get(student=w.student_c, term=w.term_pub).score == 92
    assert not Result.objects.filter(student=w.student_c, term=w.term_hidden).exists()


def test_staff_cannot_change_a_published_term_through_the_grid(w):
    resp = client_for(w.teacher_t).post(GRID, cells(w, [(w.student_a, w.maths, 1)], term=w.term_pub),
                                        format="json")
    assert resp.status_code == 403
    assert Result.objects.get(student=w.student_a, subject=w.maths, term=w.term_pub).score == 81


def test_admin_can_save_any_taught_subject_and_published_terms(w, science):
    resp = client_for(w.admin).post(GRID, cells(w, [
        (w.student_a, w.english, 55), (w.student_b, science, 66)], term=w.term_pub), format="json")
    assert resp.status_code == 200, resp.json()
    assert Result.objects.get(student=w.student_a, subject=w.english, term=w.term_pub).score == 55


def test_admin_cannot_save_a_subject_nobody_teaches_in_that_class(w):
    art = Subject.objects.create(name="Art", code="art")
    resp = client_for(w.admin).post(GRID, cells(w, [(w.student_a, art, 50)]), format="json")
    assert resp.status_code == 400 and "subject" in resp.json()["cells"][0]


@pytest.mark.parametrize("bad", [
    {"cells": []},
    {"cells": [{"student": 1, "subject": 1}]},  # score key is required (null to clear)
    {"cells": "nope"},
])
def test_grid_rejects_malformed_payloads(w, bad):
    payload = {"school_class": w.class_a.id, "term": w.term_hidden.id, **bad}
    assert client_for(w.teacher_t).post(GRID, payload, format="json").status_code == 400


def test_a_student_who_moved_class_drops_off_the_old_grid(w):
    new_class = SchoolClass.objects.create(name="Grade 4 Green", grade="grade-4", year=2026)
    StudentProfile.objects.filter(user=w.student_b).update(school_class=new_class)
    body = client_for(w.teacher_t).get(GRID, {"school_class": w.class_a.id, "term": w.term_pub.id}).json()
    assert [s["id"] for s in body["students"]] == [w.student_a.id]
    assert {r["student"] for r in body["results"]} == {w.student_a.id}
    resp = client_for(w.teacher_t).post(GRID, cells(w, [(w.student_b, w.maths, 50)]), format="json")
    assert resp.status_code == 400
