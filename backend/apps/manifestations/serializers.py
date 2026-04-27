from rest_framework import serializers
from .models import Manifestation


class ManifestationSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    equipment_needs = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    equipment_quantities = serializers.DictField(child=serializers.IntegerField(min_value=0), required=False, default=dict)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    room_name = serializers.CharField(source="room.name", read_only=True)

    class Meta:
        model = Manifestation
        fields = [
            "id", "title", "association", "contact_name", "contact_email", "contact_phone",
            "date_start", "date_end",
            "location_type", "room", "room_name", "location", "gps_lat", "gps_lng",
            "expected_attendees", "description", "budget",
            "equipment_needs", "equipment_quantities",
            "status", "status_display", "admin_comment", "reviewed_at", "created_at",
            "is_public",
        ]
        read_only_fields = ["id", "status", "admin_comment", "reviewed_at", "created_at", "room_name"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get("is_public", True):
            request = self.context.get("request")
            user = getattr(request, "user", None)
            is_owner = (user and user.is_authenticated
                        and instance.user_id
                        and str(instance.user_id) == str(user.pk))
            is_agent = (user and user.is_authenticated
                        and user.role in ("agent", "admin"))
            if not (is_owner or is_agent):
                data["title"] = "Réservé"
                data["association"] = ""
                data["contact_name"] = ""
                data["contact_email"] = ""
                data["contact_phone"] = ""
                data["description"] = ""
                data["location"] = "Lieu privé"
                data["gps_lat"] = None
                data["gps_lng"] = None
        return data

    def create(self, validated_data):
        quantities = validated_data.get("equipment_quantities", {})
        validated_data["equipment_needs"] = [k for k, v in quantities.items() if v > 0]
        if validated_data.get("location_type") == "room" and validated_data.get("room"):
            validated_data["location"] = validated_data["room"].name
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
