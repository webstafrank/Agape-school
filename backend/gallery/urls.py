from django.urls import path

from .views import PublicGalleryView

urlpatterns = [
    path("", PublicGalleryView.as_view(), name="gallery-list"),
]
