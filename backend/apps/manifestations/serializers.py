from rest_framework import serializers
from .models import Manifestation


class ManifestationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Manifestation
        fields = [
            "id", "title", "association", "contact_name", "contact_email", "contact_phone",
            "date_start", "date_end", "location", "expected_attendees",
            "description", "budget", "equipment_needs",
            "status", "status_display", "admin_comment", "reviewed_at", "created_at",
        ]
        read_only_fields = ["id", "status", "admin_comment", "reviewed_at", "created_at"]

    def create(self, validated_data):
        instance = Manifestation(**validated_data)
        instance.full_clean()
        instance.save()
        return instance


class ManifestationAdminSerializer(ManifestationSerializer):
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta(ManifestationSerializer.Meta):
        fields = ManifestationSerializer.Meta.fields + ["user", "reviewed_by", "reviewed_by_name"]

    def get_reviewed_by_name(self, obj):
        return obj.reviewed_by.get_full_name() if obj.reviewed_by else None


class ManifestationApproveSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, default="")
