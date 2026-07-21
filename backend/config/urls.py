"""URL configuration for config project."""
from django.contrib import admin
from django.urls import path
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
    # Current user
    path('api/auth/me/', MeView.as_view(), name='me'),
]
