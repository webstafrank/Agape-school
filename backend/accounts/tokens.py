"""Tie every JWT to the password it was issued under.

Each token carries `pwd`, a keyed hash of the user's current password hash.
When the password changes (by the user, or an admin reset), the stamp no
longer matches, so every older access AND refresh token stops working at
once. Stateless: no blacklist table. Tokens without a stamp are rejected.
"""
from django.contrib.auth import get_user_model
from django.utils.crypto import constant_time_compare, salted_hmac
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

CLAIM = "pwd"


def password_stamp(user) -> str:
    return salted_hmac("agape.jwt.password-stamp", user.password).hexdigest()[:20]


def stamp_matches(token, user) -> bool:
    return constant_time_compare(str(token.get(CLAIM, "")), password_stamp(user))


def tokens_for(user) -> dict:
    """A fresh access/refresh pair for `user` (same claims as sign-in)."""
    from .serializers import RoleTokenObtainPairSerializer

    refresh = RoleTokenObtainPairSerializer.get_token(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


class StampedJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not stamp_matches(validated_token, user):
            raise AuthenticationFailed("Your password has changed. Please sign in again.", code="password_changed")
        return user


class StampedTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = RefreshToken(attrs["refresh"])
        user = (
            get_user_model()
            .objects.filter(**{api_settings.USER_ID_FIELD: refresh.get(api_settings.USER_ID_CLAIM)})
            .first()
        )
        if user is None or not user.is_active or not stamp_matches(refresh, user):
            raise InvalidToken("Your password has changed. Please sign in again.")
        return super().validate(attrs)
