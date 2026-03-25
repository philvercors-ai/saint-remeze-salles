from rest_framework import serializers
from .models import Room


class RoomSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    equipment = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    reservation_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            "id", "name", "category", "capacity", "area_sqm", "hourly_rate",
            "equipment", "description", "image_emoji", "color",
            "is_active", "requires_admin_only", "reservation_count",
        ]
        read_only_fields = ["id", "reservation_count"]

    def get_reservation_count(self, obj):
        return obj.reservation_count("approved")


class RoomAvailabilitySerializer(serializers.Serializer):
    date = serializers.DateField()
    booked_slots = serializers.ListField(child=serializers.DictField())
