from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.include_root_view = False
router.register("users", views.UserViewSet, basename="admin-user")
router.register("classes", views.ClassViewSet, basename="admin-class")
router.register("assignments", views.AssignmentViewSet, basename="admin-assignment")
router.register("terms", views.TermViewSet, basename="admin-term")
router.register("media", views.MediaViewSet, basename="admin-media")
router.register("enquiries", views.EnquiryViewSet, basename="admin-enquiry")

urlpatterns = [path("overview/", views.OverviewView.as_view(), name="admin-overview"), *router.urls]
