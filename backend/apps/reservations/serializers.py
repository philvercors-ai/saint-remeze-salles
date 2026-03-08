from rest_framework import serializers
from .models import Reservation

RECURRENCE_CHOICES = ["weekly", "biweekly", "monthly"]
RECURRENCE_LABELS = {"weekly": "Hebdomadaire", "biweekly": "Bimensuelle", "monthly": "Mensuelle"}


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
            "reviewed_at", "created_at", "recurrence_group", "is_public",
        ]
        read_only_fields = ["id", "status", "admin_comment", "reviewed_at", "created_at", "recurrence_group"]

    def validate(self, data):
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
        read_only_fields = ["id", "created_at", "updated_at", "recurrence_group"]

    def get_reviewed_by_name(self, obj):
        return obj.reviewed_by.get_full_name() if obj.reviewed_by else None


class ReservationApproveSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class GroupActionSerializer(serializers.Serializer):
    group_id = serializers.CharField()
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class RecurringReservationSerializer(serializers.Serializer):
    """Crée une série de réservations récurrentes."""
    room = serializers.CharField()
    title = serializers.CharField(max_length=200)
    association = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    contact_name = serializers.CharField(max_length=100)
    contact_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    attendees = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    is_public = serializers.BooleanField(default=True)
    recurrence_type = serializers.ChoiceField(choices=RECURRENCE_CHOICES)
    recurrence_end_date = serializers.DateField()

    def validate(self, data):
        if data["recurrence_end_date"] <= data["date"]:
            raise serializers.ValidationError(
                {"recurrence_end_date": "La date de fin doit être après la première occurrence."}
            )
        if data["start_time"] >= data["end_time"]:
            raise serializers.ValidationError(
                {"end_time": "L'heure de fin doit être après l'heure de début."}
            )
        return data


class PlanningReservationSerializer(serializers.ModelSerializer):
    """Données minimales pour l'affichage du planning (public).
    Les réservations privées sont masquées pour les non-propriétaires."""
    room_name = serializers.CharField(source="room.name", read_only=True)
    room_color = serializers.CharField(source="room.color", read_only=True)
    room_emoji = serializers.CharField(source="room.image_emoji", read_only=True)

    class Meta:
        model = Reservation
        fields = ["id", "room", "room_name", "room_color", "room_emoji",
                  "title", "date", "start_time", "end_time", "status",
                  "recurrence_group", "is_public"]

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
        return data
