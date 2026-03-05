from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView

from apps.accounts.permissions import IsAgent
from services.email_service import EmailService
from .models import MunicipalService, Notification
from .serializers import MunicipalServiceSerializer, NotificationSerializer, SendNotificationSerializer


class MunicipalServiceListView(ListAPIView):
    permission_classes = [IsAgent]
    queryset = MunicipalService.objects.filter(is_active=True)
    serializer_class = MunicipalServiceSerializer


class SendNotificationView(APIView):
    permission_classes = [IsAgent]

    def post(self, request):
        serializer = SendNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service_ids = serializer.validated_data["service_ids"]
        message = serializer.validated_data["message"]
        priority = serializer.validated_data["priority"]

        services = MunicipalService.objects.filter(id__in=service_ids, is_active=True)
        if not services.exists():
            return Response({"detail": "Aucun service valide sélectionné."}, status=status.HTTP_400_BAD_REQUEST)

        # Crée la notification
        notif = Notification.objects.create(
            sent_by=request.user,
            message=message,
            priority=priority,
        )
        notif.services.set(services)

        # Envoie les emails
        count = 0
        for service in services:
            if EmailService.send_service_notification(service.email, service.name, message, priority):
                count += 1

        notif.email_sent = count > 0
        notif.email_count = count
        notif.save(update_fields=["email_sent", "email_count"])

        return Response({
            "detail": f"Notification envoyée à {count} service(s) sur {services.count()}.",
            "notification": NotificationSerializer(notif).data,
        }, status=status.HTTP_201_CREATED)


class NotificationHistoryView(ListAPIView):
    permission_classes = [IsAgent]
    queryset = Notification.objects.select_related("sent_by").prefetch_related("services").all()
    serializer_class = NotificationSerializer
