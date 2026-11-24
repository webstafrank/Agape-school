from django.urls import path

from .views import PostDetailView, PostListView

urlpatterns = [
    path("", PostListView.as_view(), name="news-list"),
    path("<slug:slug>/", PostDetailView.as_view(), name="news-detail"),
]
