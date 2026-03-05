from rest_framework import serializers
from .models import Reservation


class ReservationSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source="room.name", read_only=True)
    room_color = serializers.CharField(source="room.color", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id", "room", "room_name", "room_color",
            "title", "association", "contact_name", "contact_email", "contact_phone",
            "date", "start_time", "end_time", "attendees",
            "status", "status_display", "notes", "admin_comment",
            "reviewed_at", "created_at",
        ]
        read_only_fields = ["id", "status", "admin_comment", "reviewed_at", "created_at"]

    def validate(self, data):
        from apps.rooms.models import Room
        room = data.get("room") or (self.instance.room if self.instance else None)
        attendees = data.get("attendees", 0)
        if room and attendees > room.capacity:
            raise serializers.ValidationError(
                {"attendees": f"Le nombre de participants dépasse la capacité de la salle ({room.capacity})."}
            )
        return data

    def create(self, validated_data):
        instance = Reservation(**validated_data)
        instance.full_clean()  # Déclenche la validation chevauchement
        instance.save()
        return instance


class ReservationAdminSerializer(ReservationSerializer):
    """Sérialiseur enrichi pour les agents/admins (inclut les données sensibles)."""
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta(ReservationSerializer.Meta):
        fields = ReservationSerializer.Meta.fields + ["user", "reviewed_by", "reviewed_by_name", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_reviewed_by_name(self, obj):
        return obj.reviewed_by.get_full_name() if obj.reviewed_by else None


class ReservationApproveSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class PlanningReservationSerializer(serializers.ModelSerializer):
    """Données minimales pour l'affichage du planning (public)."""
    room_name = serializers.CharField(source="room.name", read_only=True)
    room_color = serializers.CharField(source="room.color", read_only=True)
    room_emoji = serializers.CharField(source="room.image_emoji", read_only=True)

    class Meta:
        model = Reservation
        fields = ["id", "room", "room_name", "room_color", "room_emoji", "title", "date", "start_time", "end_time", "status"]
