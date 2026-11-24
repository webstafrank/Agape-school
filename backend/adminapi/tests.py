from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from admissions.models import Enquiry
from gallery.models import MediaItem
from school.models import Result, SchoolClass, StudentProfile, Subject, TeachingAssignment, Term

from .passwords import ALPHABET, generate_password

User = get_user_model()
API = "/api/admin"
PHOTO = "https://res.cloudinary.com/demo/image/upload/sample.jpg"


@pytest.fixture
def people(db):
    mk = lambda u, r: User.objects.create_user(username=u, password="pw-not-real-123", role=r)  # noqa: E731
    p = {"admin": mk("ADMIN-1", "admin"), "staff": mk("STAFF-1", "staff"), "student": mk("STU-1", "student")}
    p["class"] = SchoolClass.objects.create(name="Grade 3 Green", grade="grade-3", year=2026)
    StudentProfile.objects.create(user=p["student"], school_class=p["class"])
    return p


def as_user(user=None):
    c = APIClient()
    if user:
        c.force_authenticate(user)
    return c


ENDPOINTS = [
    ("get", "overview/"), ("get", "users/"), ("post", "users/"), ("get", "classes/"), ("post", "classes/"),
    ("get", "assignments/"), ("post", "assignments/"), ("get", "terms/"), ("post", "terms/"),
    ("get", "media/"), ("get", "enquiries/"),
]


@pytest.mark.parametrize("method,path", ENDPOINTS)
@pytest.mark.parametrize("who", ["student", "staff"])
def test_admin_api_is_admin_only(people, who, method, path):
    resp = getattr(as_user(people[who]), method)(f"{API}/{path}", {}, format="json")
    assert resp.status_code == 403


@pytest.mark.parametrize("method,path", ENDPOINTS)
def test_admin_api_requires_login(db, method, path):
    assert getattr(as_user(), method)(f"{API}/{path}", {}, format="json").status_code == 401


@pytest.mark.parametrize("who", ["student", "staff"])
def test_non_admins_cannot_reset_passwords_or_see_enquiries(people, who):
    c = as_user(people[who])
    assert c.post(f"{API}/users/{people['student'].id}/reset-password/").status_code == 403
    Enquiry.objects.create(parent_name="P", phone="+254700000001", child_first_name="C", grade="pp1")
    assert c.get(f"{API}/enquiries/").status_code == 403


# ---------------------------------------------------------------- passwords

def test_generated_passwords_are_strong_and_unambiguous():
    pwds = {generate_password() for _ in range(200)}
    assert len(pwds) == 200
    for p in pwds:
        assert len(p) == 11 and p[5] == "-"
        assert all(ch in ALPHABET for ch in p.replace("-", ""))


# ---------------------------------------------------------------- users

def test_create_student_returns_one_time_password_that_works(people):
    resp = as_user(people["admin"]).post(f"{API}/users/", {
        "username": "ADM-2026-001", "first_name": "Testy", "last_name": "Learner", "role": "student",
        "school_class": people["class"].id,
    }, format="json")
    assert resp.status_code == 201, resp.json()
    body = resp.json()
    assert body["class_name"] == "Grade 3 Green"
    login = APIClient().post("/api/auth/token/", {"username": "ADM-2026-001", "password": body["password"]}, format="json")
    assert login.status_code == 200 and login.json()["role"] == "student"
    # Never shown again.
    again = as_user(people["admin"]).get(f"{API}/users/{body['id']}/").json()
    assert "password" not in again


def test_usernames_are_unique_ignoring_case(people):
    resp = as_user(people["admin"]).post(f"{API}/users/", {"username": "stu-1", "role": "student"}, format="json")
    assert resp.status_code == 400 and "username" in resp.json()


def test_only_students_get_a_class(people):
    resp = as_user(people["admin"]).post(f"{API}/users/", {
        "username": "T-2", "role": "staff", "school_class": people["class"].id}, format="json")
    assert resp.status_code == 400 and "school_class" in resp.json()


def test_move_student_to_another_class(people):
    other = SchoolClass.objects.create(name="Grade 4 Gold", grade="grade-4", year=2026)
    resp = as_user(people["admin"]).patch(f"{API}/users/{people['student'].id}/", {"school_class": other.id}, format="json")
    assert resp.status_code == 200 and resp.json()["class_name"] == "Grade 4 Gold"
    assert StudentProfile.objects.get(user=people["student"]).school_class == other


def test_role_and_username_cannot_be_changed(people):
    as_user(people["admin"]).patch(f"{API}/users/{people['student'].id}/", {"role": "admin", "username": "x"}, format="json")
    people["student"].refresh_from_db()
    assert people["student"].role == "student" and people["student"].username == "STU-1"


def test_reset_password(people):
    resp = as_user(people["admin"]).post(f"{API}/users/{people['student'].id}/reset-password/")
    new = resp.json()["password"]
    assert APIClient().post("/api/auth/token/", {"username": "STU-1", "password": "pw-not-real-123"},
                            format="json").status_code == 401
    assert APIClient().post("/api/auth/token/", {"username": "STU-1", "password": new}, format="json").status_code == 200


def test_deactivated_users_cannot_sign_in(people):
    as_user(people["admin"]).patch(f"{API}/users/{people['student'].id}/", {"is_active": False}, format="json")
    resp = APIClient().post("/api/auth/token/", {"username": "STU-1", "password": "pw-not-real-123"}, format="json")
    assert resp.status_code == 401


def test_admin_cannot_deactivate_themselves(people):
    resp = as_user(people["admin"]).patch(f"{API}/users/{people['admin'].id}/", {"is_active": False}, format="json")
    assert resp.status_code == 400
    people["admin"].refresh_from_db()
    assert people["admin"].is_active


def test_user_search_and_filters(people):
    c = as_user(people["admin"])
    assert [u["username"] for u in c.get(f"{API}/users/", {"role": "student"}).json()] == ["STU-1"]
    assert [u["username"] for u in c.get(f"{API}/users/", {"q": "staff"}).json()] == ["STAFF-1"]
    assert [u["username"] for u in c.get(f"{API}/users/", {"school_class": people["class"].id}).json()] == ["STU-1"]


def test_no_hard_delete_of_users(people):
    assert as_user(people["admin"]).delete(f"{API}/users/{people['student'].id}/").status_code == 405


# ---------------------------------------------------------------- classes & assignments

def test_create_class_with_class_teacher_and_assign_subject(people):
    c = as_user(people["admin"])
    resp = c.post(f"{API}/classes/", {"name": "Grade 7 Blue", "grade": "grade-7", "year": 2026,
                                      "class_teacher": people["staff"].id}, format="json")
    assert resp.status_code == 201
    cls_id = resp.json()["id"]
    maths = Subject.objects.create(name="Mathematics", code="maths")
    resp = c.post(f"{API}/assignments/", {"teacher": people["staff"].id, "school_class": cls_id, "subject": maths.id},
                  format="json")
    assert resp.status_code == 201
    assert TeachingAssignment.objects.filter(teacher=people["staff"], school_class_id=cls_id).exists()
    # The new teacher immediately sees the class in the staff API.
    assert cls_id in [x["id"] for x in as_user(people["staff"]).get("/api/school/classes/").json()]


@pytest.mark.parametrize("field", ["class_teacher"])
def test_class_teacher_must_be_staff(people, field):
    resp = as_user(people["admin"]).post(f"{API}/classes/", {"name": "X", "grade": "grade-1", "year": 2026,
                                                             field: people["student"].id}, format="json")
    assert resp.status_code == 400


def test_students_cannot_be_assigned_to_teach(people):
    maths = Subject.objects.create(name="Mathematics", code="maths")
    resp = as_user(people["admin"]).post(f"{API}/assignments/", {
        "teacher": people["student"].id, "school_class": people["class"].id, "subject": maths.id}, format="json")
    assert resp.status_code == 400


def test_class_with_students_cannot_be_deleted(people):
    assert as_user(people["admin"]).delete(f"{API}/classes/{people['class'].id}/").status_code == 400
    empty = SchoolClass.objects.create(name="Empty", grade="pp1", year=2026)
    assert as_user(people["admin"]).delete(f"{API}/classes/{empty.id}/").status_code == 204


# ---------------------------------------------------------------- terms

def test_setting_current_term_moves_the_flag(people):
    c = as_user(people["admin"])
    t1 = c.post(f"{API}/terms/", {"year": 2026, "name": "term-1", "start_date": "2026-01-05",
                                  "end_date": "2026-04-03", "is_current": True}, format="json").json()
    t2 = c.post(f"{API}/terms/", {"year": 2026, "name": "term-2", "start_date": "2026-05-04",
                                  "end_date": "2026-08-07", "is_current": True}, format="json").json()
    assert not Term.objects.get(id=t1["id"]).is_current and Term.objects.get(id=t2["id"]).is_current
    c.patch(f"{API}/terms/{t1['id']}/", {"is_current": True}, format="json")
    assert list(Term.objects.filter(is_current=True).values_list("id", flat=True)) == [t1["id"]]


def test_publishing_results_reveals_them_to_students(people):
    term = Term.objects.create(year=2026, name="term-1", start_date=date(2026, 1, 5), end_date=date(2026, 4, 3))
    maths = Subject.objects.create(name="Mathematics", code="maths")
    Result.objects.create(student=people["student"], school_class=people["class"], subject=maths, term=term, score=70)
    student = as_user(people["student"])
    assert student.get("/api/school/results/").json() == []
    as_user(people["admin"]).patch(f"{API}/terms/{term.id}/", {"results_published": True}, format="json")
    assert len(student.get("/api/school/results/").json()) == 1


def test_term_dates_validated(people):
    resp = as_user(people["admin"]).post(f"{API}/terms/", {"year": 2026, "name": "term-3", "start_date": "2026-09-01",
                                                           "end_date": "2026-08-01"}, format="json")
    assert resp.status_code == 400 and "end_date" in resp.json()


# ---------------------------------------------------------------- gallery

def test_approve_and_unapprove_media(people):
    item = MediaItem.objects.create(title="Sports day", alt_text="Race", url=PHOTO)
    c = as_user(people["admin"])
    assert [m["id"] for m in c.get(f"{API}/media/", {"status": "pending"}).json()] == [item.id]
    assert APIClient().get("/api/gallery/").json() == []

    resp = c.patch(f"{API}/media/{item.id}/", {"is_approved": True}, format="json")
    assert resp.status_code == 200 and resp.json()["approved_by_name"] == "ADMIN-1"
    assert [m["id"] for m in APIClient().get("/api/gallery/").json()] == [item.id]

    c.patch(f"{API}/media/{item.id}/", {"is_approved": False}, format="json")
    assert APIClient().get("/api/gallery/").json() == []
    item.refresh_from_db()
    assert item.approved_by is None


def test_media_content_is_not_editable_via_portal(people):
    item = MediaItem.objects.create(title="Sports day", alt_text="Race", url=PHOTO)
    as_user(people["admin"]).patch(f"{API}/media/{item.id}/", {"url": "https://evil.example/x.jpg", "title": "x"},
                                   format="json")
    item.refresh_from_db()
    assert item.url == PHOTO and item.title == "Sports day"


# ---------------------------------------------------------------- enquiries

def test_enquiry_status_update_only(people):
    e = Enquiry.objects.create(parent_name="Test Parent", phone="+254700000001", child_first_name="Kid", grade="pp1")
    c = as_user(people["admin"])
    assert [x["id"] for x in c.get(f"{API}/enquiries/", {"status": "new"}).json()] == [e.id]
    resp = c.patch(f"{API}/enquiries/{e.id}/", {"status": "contacted", "parent_name": "Changed"}, format="json")
    assert resp.status_code == 200
    e.refresh_from_db()
    assert e.status == "contacted" and e.parent_name == "Test Parent"
    assert c.patch(f"{API}/enquiries/{e.id}/", {"status": "bogus"}, format="json").status_code == 400
    assert c.post(f"{API}/enquiries/", {}, format="json").status_code == 405
    assert c.delete(f"{API}/enquiries/{e.id}/").status_code == 405


# ---------------------------------------------------------------- overview

def test_overview_counts(people):
    MediaItem.objects.create(title="Pending", alt_text="a", url=PHOTO)
    Enquiry.objects.create(parent_name="P", phone="+254700000001", child_first_name="C", grade="pp1")
    data = as_user(people["admin"]).get(f"{API}/overview/").json()
    assert data["students"] == 1 and data["staff"] == 1 and data["classes"] == 1
    assert data["pending_media"] == 1 and data["new_enquiries"] == 1
    assert data["current_term"] is None
