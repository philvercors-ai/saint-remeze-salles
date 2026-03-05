import csv
from datetime import date, timedelta

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from apps.accounts.permissions import IsAgent, IsOwnerOrAgent
from services.email_service import EmailService
from .models import Reservation
from .serializers import (
    ReservationSerializer,
    ReservationAdminSerializer,
    ReservationApproveSerializer,
    PlanningReservationSerializer,
)


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related("room", "user", "reviewed_by").all()
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["date", "created_at", "status"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.role in ("agent", "admin"):
            return ReservationAdminSerializer
        return ReservationSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "update", "partial_update", "destroy", "approve", "reject", "export_csv"):
            if self.action in ("list", "export_csv"):
                return [IsAgent()]
            return [IsOwnerOrAgent()]
        # create et planning : ouverts aux non-authentifiés
        return [AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # Filtre par statut
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        # Filtre par salle
        room_id = self.request.query_params.get("room")
        if room_id:
            qs = qs.filter(room_id=room_id)

        return qs

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        reservation = serializer.save(user=user)
        EmailService.send_reservation_received(reservation)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my(self, request):
        qs = Reservation.objects.filter(user=request.user).order_by("-created_at")
        serializer = ReservationSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def planning(self, request):
        """Créneaux approuvés pour l'affichage du planning hebdomadaire."""
        week_param = request.query_params.get("week")
        room_id = request.query_params.get("room")

        # Semaine courante par défaut
        today = date.today()
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)

        if week_param:
            try:
                # Format ISO YYYY-WNN
                import datetime
                start = datetime.datetime.strptime(f"{week_param}-1", "%G-W%V-%u").date()
                end = start + timedelta(days=6)
            except ValueError:
                pass

        qs = Reservation.objects.filter(
            date__range=[start, end],
            status__in=["approved", "pending"],
        ).select_related("room")

        if room_id:
            qs = qs.filter(room_id=room_id)

        serializer = PlanningReservationSerializer(qs, many=True)
        return Response({
            "week_start": str(start),
            "week_end": str(end),
            "reservations": serializer.data,
        })

    @action(detail=True, methods=["post"], permission_classes=[IsAgent])
    def approve(self, request, pk=None):
        reservation = self.get_object()
        serializer = ReservationApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if reservation.status != "pending":
            return Response({"detail": "Seules les demandes en attente peuvent être approuvées."}, status=status.HTTP_400_BAD_REQUEST)

        reservation.approve(request.user)
        EmailService.send_reservation_approved(reservation)
        return Response(ReservationAdminSerializer(reservation).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAgent])
    def reject(self, request, pk=None):
        reservation = self.get_object()
        serializer = ReservationApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if reservation.status != "pending":
            return Response({"detail": "Seules les demandes en attente peuvent être refusées."}, status=status.HTTP_400_BAD_REQUEST)

        reservation.reject(request.user, serializer.validated_data.get("comment", ""))
        EmailService.send_reservation_rejected(reservation)
        return Response(ReservationAdminSerializer(reservation).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAgent])
    def export_csv(self, request):
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = "attachment; filename=reservations.csv"
        response.write("\ufeff")

        writer = csv.writer(response)
        writer.writerow(["ID", "Salle", "Titre", "Association", "Contact", "Email", "Téléphone",
                          "Date", "Début", "Fin", "Participants", "Statut", "Créé le"])

        for r in self.get_queryset():
            writer.writerow([
                r.id, r.room.name, r.title, r.association, r.contact_name,
                r.contact_email, r.contact_phone, r.date, r.start_time, r.end_time,
                r.attendees, r.get_status_display(), r.created_at.strftime("%d/%m/%Y %H:%M"),
            ])

        return response
