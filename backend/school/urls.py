from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.include_root_view = False
router.register("terms", views.TermViewSet, basename="term")
router.register("subjects", views.SubjectViewSet, basename="subject")
router.register("classes", views.SchoolClassViewSet, basename="class")
router.register("results", views.ResultViewSet, basename="result")
router.register("announcements", views.AnnouncementViewSet, basename="announcement")
router.register("timetable", views.TimetableViewSet, basename="timetable")
router.register("fees", views.FeeRecordViewSet, basename="fee")

urlpatterns = [path("me/", views.MeView.as_view(), name="school-me"), *router.urls]
