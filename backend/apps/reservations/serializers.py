from django.core.exceptions import ValidationError as DjangoValidationError
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
        # Uniquement à la création : un agent peut modifier une réservation existante
        # sans que ça implique qu'il ait lui-même le droit de réserver cette salle.
        if room and not self.instance:
            request = self.context.get("request")
            user = getattr(request, "user", None)
            if not room.user_can_reserve(user):
                raise serializers.ValidationError(
                    {"room": "Cette salle est réservée à certains groupes d'utilisateurs. "
                             "Connectez-vous avec un compte autorisé ou contactez la mairie."}
                )
        return data

    @staticmethod
    def _full_clean_or_400(instance):
        # full_clean() lève django.core.exceptions.ValidationError, que le
        # gestionnaire d'exceptions par défaut de DRF ne convertit PAS en 400
        # (il ne reconnaît que rest_framework.exceptions.ValidationError) —
        # sans cette conversion, un chevauchement de créneau plante en 500 au
        # lieu de renvoyer une erreur de validation exploitable côté client.
        try:
            instance.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)

    def create(self, validated_data):
        instance = Reservation(**validated_data)
        self._full_clean_or_400(instance)  # Déclenche la validation chevauchement
        instance.save()
        return instance

    def update(self, instance, validated_data):
        # Sans cette surcharge (le ModelSerializer.update() par défaut ne
        # déclenche pas full_clean()), modifier les horaires d'une réservation
        # existante — ex. depuis le Planning — pourrait créer un chevauchement
        # non détecté avec une autre réservation de la même salle.
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        self._full_clean_or_400(instance)
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
    """Données minimales pour l'affichage du planning (public — visible par
    tous, quel que soit le groupe de réservation de l'utilisateur : le
    Planning n'est jamais filtré par Room.allowed_groups, seule la création
    de la réservation l'est). Le sujet des réservations privées est masqué
    pour les non-propriétaires — sauf agents/admin et membres du groupe
    "Conseil Municipal", qui voient le sujet réel en plus de la mention
    "PRIVATISÉE" (via `subject_visible`, côté frontend)."""
    room_name = serializers.CharField(source="room.name", read_only=True)
    room_color = serializers.CharField(source="room.color", read_only=True)
    room_emoji = serializers.CharField(source="room.image_emoji", read_only=True)

    class Meta:
        model = Reservation
        fields = ["id", "room", "room_name", "room_color", "room_emoji",
                  "title", "date", "start_time", "end_time", "status",
                  "recurrence_group", "is_public"]
        # "subject_visible" et "can_edit" ne sont pas des champs du modèle —
        # injectés manuellement dans to_representation() ci-dessous, jamais
        # listés ici (DRF échouerait à les résoudre comme des champs réels).

    def _is_owner(self, instance, user):
        return bool(user and user.is_authenticated and instance.user_id
                    and str(instance.user_id) == str(user.pk))

    def _is_agent(self, user):
        return bool(user and user.is_authenticated and user.role in ("agent", "admin"))

    def _can_view_subject(self, instance, user):
        if self._is_owner(instance, user) or self._is_agent(user):
            return True
        return bool(user and user.is_authenticated
                    and user.reservation_groups.filter(name="Conseil Municipal").exists())

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        data["can_edit"] = self._is_owner(instance, user) or self._is_agent(user)
        if data.get("is_public", True):
            data["subject_visible"] = True
        else:
            can_view = self._can_view_subject(instance, user)
            data["subject_visible"] = can_view
            if not can_view:
                data["title"] = "PRIVATISÉE"
        return data
