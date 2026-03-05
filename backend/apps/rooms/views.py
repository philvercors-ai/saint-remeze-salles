from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from apps.accounts.permissions import IsAdmin
from .models import Room
from .serializers import RoomSerializer


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.filter(is_active=True).order_by("name")
    serializer_class = RoomSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [AllowAny()]

    def perform_destroy(self, instance):
        # Soft delete — ne supprime pas physiquement
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def availability(self, request, pk=None):
        """Retourne les créneaux occupés pour une date donnée."""
        room = self.get_object()
        date_str = request.query_params.get("date")
        if not date_str:
            return Response({"detail": "Paramètre 'date' requis (YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.reservations.models import Reservation
        reservations = Reservation.objects.filter(
            room=room,
            date=date_str,
            status__in=["pending", "approved"],
        ).values("start_time", "end_time", "title", "status")

        return Response({
            "date": date_str,
            "room": room.name,
            "booked_slots": list(reservations),
        })
