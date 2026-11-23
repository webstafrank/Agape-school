import re

from rest_framework import serializers

from .models import Enquiry

PHONE_RE = re.compile(r"^\+?[0-9][0-9 \-]{6,18}[0-9]$")


class EnquirySerializer(serializers.ModelSerializer):
    # Honeypot: hidden from humans on the form, so any value means a bot.
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Enquiry
        fields = (
            "parent_name",
            "phone",
            "email",
            "child_first_name",
            "grade",
            "start_term",
            "message",
            "website",
        )

    def validate_phone(self, value: str) -> str:
        value = value.strip()
        if not PHONE_RE.match(value):
            raise serializers.ValidationError("Enter a valid phone number, e.g. +254 712 345 678.")
        return value

    def validate_child_first_name(self, value: str) -> str:
        value = value.strip()
        if " " in value:
            # Only the first name is collected, to limit stored child data.
            value = value.split()[0]
        return value

    def is_spam(self) -> bool:
        return bool(self.validated_data.get("website"))

    def create(self, validated_data):
        validated_data.pop("website", None)
        return super().create(validated_data)
