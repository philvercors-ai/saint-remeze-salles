from rest_framework import serializers
from .models import MunicipalService, Notification


class MunicipalServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MunicipalService
        fields = ["id", "name", "email", "icon"]


class NotificationSerializer(serializers.ModelSerializer):
    services_detail = MunicipalServiceSerializer(source="services", many=True, read_only=True)
    sent_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "services", "services_detail", "message", "priority", "sent_at", "email_sent", "email_count", "sent_by_name"]
        read_only_fields = ["id", "sent_at", "email_sent", "email_count"]

    def get_sent_by_name(self, obj):
        return obj.sent_by.get_full_name() if obj.sent_by else None


class SendNotificationSerializer(serializers.Serializer):
    service_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    message = serializers.CharField(min_length=10)
    priority = serializers.ChoiceField(choices=["low", "normal", "high"], default="normal")
