from rest_framework import serializers
from .models import Manifestation, ManifestationSettings


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

    def validate(self, data):
        # Uniquement à la création — un agent doit toujours pouvoir gérer les
        # demandes déjà déposées, même fonctionnalité mise en pause depuis.
        if not self.instance and not ManifestationSettings.load().is_enabled:
            raise serializers.ValidationError(
                {"detail": "La création de nouvelles manifestations est temporairement indisponible."}
            )
        # Uniquement à la création — voir ReservationSerializer.validate() pour le
        # raisonnement identique (une manifestation en salle communale est soumise
        # à la même restriction de groupes qu'une réservation classique).
        room = data.get("room")
        if room and not self.instance:
            request = self.context.get("request")
            user = getattr(request, "user", None)
            if not room.user_can_reserve(user):
                raise serializers.ValidationError(
                    {"room": "Cette salle est réservée à certains groupes d'utilisateurs. "
                             "Connectez-vous avec un compte autorisé ou contactez la mairie."}
                )
        return data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get("is_public", True):
            data["subject_visible"] = True
        else:
            request = self.context.get("request")
            user = getattr(request, "user", None)
            is_owner = (user and user.is_authenticated
                        and instance.user_id
                        and str(instance.user_id) == str(user.pk))
            is_agent = (user and user.is_authenticated
                        and user.role in ("agent", "admin"))
            can_view = bool(is_owner or is_agent)
            data["subject_visible"] = can_view
            if not can_view:
                data["title"] = "PRIVATISÉE"
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
