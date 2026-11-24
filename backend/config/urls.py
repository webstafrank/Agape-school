"""URL configuration for config project."""
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from accounts.views import MeView, RoleTokenObtainPairView
from core.views import HealthView

urlpatterns = [
    path('admin/', admin.site.urls),
    # Public health probe
    path('api/health/', HealthView.as_view(), name='health'),
    # JWT auth
    path('api/auth/token/', RoleTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    # Admissions (public, create-only)
    path('api/admissions/', include('admissions.urls')),
    # News & events (public, read-only, published posts only)
    path('api/news/', include('news.urls')),
    # Gallery (public, read-only, admin-approved media only)
    path('api/gallery/', include('gallery.urls')),
    # School records for the portals (authenticated, role-scoped)
    path('api/school/', include('school.urls')),
    # Admin portal (role=admin only)
    path('api/admin/', include('adminapi.urls')),
    # Current user
    path('api/auth/me/', MeView.as_view(), name='me'),
]
