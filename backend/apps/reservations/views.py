import calendar
import csv
import uuid
from datetime import date, timedelta

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsAgent, IsOwnerOrAgent
from services.email_service import EmailService
from .models import Reservation
from .serializers import (
    ReservationSerializer,
    ReservationAdminSerializer,
    ReservationApproveSerializer,
    GroupActionSerializer,
    RecurringReservationSerializer,
    PlanningReservationSerializer,
)

MAX_OCCURRENCES = 52  # 1 an de récurrences hebdomadaires max


def _next_date(current: date, recurrence_type: str) -> date:
    if recurrence_type == "weekly":
        return current + timedelta(weeks=1)
    if recurrence_type == "biweekly":
        return current + timedelta(weeks=2)
    # monthly : même jour le mois suivant, clamped au dernier jour si nécessaire
    month = current.month % 12 + 1
    year = current.year + (1 if current.month == 12 else 0)
    max_day = calendar.monthrange(year, month)[1]
    return current.replace(year=year, month=month, day=min(current.day, max_day))


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
        if self.action in ("list", "export_csv"):
            return [IsAgent()]
        if self.action in ("approve", "reject", "approve_group", "reject_group"):
            return [IsAgent()]
        if self.action in ("retrieve", "update", "partial_update", "destroy"):
            return [IsOwnerOrAgent()]
        return [AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        room_id = self.request.query_params.get("room")
        if room_id:
            qs = qs.filter(room_id=room_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        reservation = serializer.save(user=user)
        EmailService.send_reservation_received(reservation)

    # ── Actions standard ────────────────────────────────────────────────────────

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my(self, request):
        qs = Reservation.objects.filter(user=request.user).order_by("-created_at")
        return Response(ReservationSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def planning(self, request):
        week_param = request.query_params.get("week")
        room_id = request.query_params.get("room")
        today = date.today()
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        if week_param:
            try:
                import datetime
                start = datetime.datetime.strptime(f"{week_param}-1", "%G-W%V-%u").date()
                end = start + timedelta(days=6)
            except ValueError:
                pass
        qs = Reservation.objects.filter(
            date__range=[start, end], status__in=["approved", "pending"],
        ).select_related("room")
        if room_id:
            qs = qs.filter(room_id=room_id)
        serializer = PlanningReservationSerializer(qs, many=True, context={"request": request})
        return Response({"week_start": str(start), "week_end": str(end), "reservations": serializer.data})

    @action(detail=True, methods=["post"], permission_classes=[IsAgent])
    def approve(self, request, pk=None):
        reservation = self.get_object()
        s = ReservationApproveSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if reservation.status != "pending":
            return Response({"detail": "Seules les demandes en attente peuvent être approuvées."}, status=status.HTTP_400_BAD_REQUEST)
        reservation.approve(request.user)
        EmailService.send_reservation_approved(reservation)
        return Response(ReservationAdminSerializer(reservation).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAgent])
    def reject(self, request, pk=None):
        reservation = self.get_object()
        s = ReservationApproveSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if reservation.status != "pending":
            return Response({"detail": "Seules les demandes en attente peuvent être refusées."}, status=status.HTTP_400_BAD_REQUEST)
        reservation.reject(request.user, s.validated_data.get("comment", ""))
        EmailService.send_reservation_rejected(reservation)
        return Response(ReservationAdminSerializer(reservation).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAgent])
    def export_csv(self, request):
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = "attachment; filename=reservations.csv"
        response.write("\ufeff")
        writer = csv.writer(response)
        writer.writerow(["ID", "Salle", "Titre", "Association", "Contact", "Email",
                         "Téléphone", "Date", "Début", "Fin", "Participants", "Statut", "Groupe récurrence", "Créé le"])
        for r in self.get_queryset():
            writer.writerow([
                r.id, r.room.name, r.title, r.association, r.contact_name,
                r.contact_email, r.contact_phone, r.date, r.start_time, r.end_time,
                r.attendees, r.get_status_display(), r.recurrence_group or "",
                r.created_at.strftime("%d/%m/%Y %H:%M"),
            ])
        return response

    # ── Récurrence ──────────────────────────────────────────────────────────────

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def recurring(self, request):
        """Crée une série de réservations récurrentes liées par un recurrence_group UUID."""
        s = RecurringReservationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data

        from apps.rooms.models import Room
        try:
            room = Room.objects.get(pk=data["room"])
        except Room.DoesNotExist:
            return Response({"room": "Salle introuvable."}, status=status.HTTP_400_BAD_REQUEST)

        if data["attendees"] > room.capacity:
            return Response(
                {"attendees": f"Dépasse la capacité de la salle ({room.capacity})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Génère toutes les dates de la série
        dates, current = [], data["date"]
        while current <= data["recurrence_end_date"] and len(dates) < MAX_OCCURRENCES:
            dates.append(current)
            current = _next_date(current, data["recurrence_type"])

        if not dates:
            return Response({"detail": "Aucune occurrence générée."}, status=status.HTTP_400_BAD_REQUEST)

        group_id = str(uuid.uuid4())
        user = request.user if request.user.is_authenticated else None
        created, skipped = [], []

        for d in dates:
            r = Reservation(
                room=room, user=user,
                title=data["title"], association=data["association"],
                contact_name=data["contact_name"], contact_email=data["contact_email"],
                contact_phone=data["contact_phone"], date=d,
                start_time=data["start_time"], end_time=data["end_time"],
                attendees=data["attendees"], notes=data["notes"],
                is_public=data.get("is_public", True),
                recurrence_group=group_id, status="pending",
            )
            try:
                r.full_clean()
                r.save()
                created.append(r)
            except Exception:
                skipped.append(str(d))

        if not created:
            return Response(
                {"detail": "Aucune occurrence n'a pu être créée (créneaux déjà occupés)."},
                status=status.HTTP_409_CONFLICT,
            )

        EmailService.send_reservation_received(created[0])

        return Response({
            "created": len(created),
            "skipped": skipped,
            "group_id": group_id,
            "reservations": ReservationSerializer(created, many=True).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], permission_classes=[IsAgent])
    def approve_group(self, request):
        """Approuve toutes les réservations en attente d'un groupe récurrent."""
        s = GroupActionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        pending = Reservation.objects.filter(recurrence_group=s.validated_data["group_id"], status="pending")
        count = pending.count()
        if count == 0:
            return Response({"detail": "Aucune réservation en attente dans ce groupe."}, status=status.HTTP_404_NOT_FOUND)
        for r in pending:
            r.approve(request.user)
            EmailService.send_reservation_approved(r)
        return Response({"detail": f"{count} réservation(s) approuvée(s).", "count": count})

    @action(detail=False, methods=["post"], permission_classes=[IsAgent])
    def reject_group(self, request):
        """Refuse toutes les réservations en attente d'un groupe récurrent."""
        s = GroupActionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        pending = Reservation.objects.filter(recurrence_group=s.validated_data["group_id"], status="pending")
        count = pending.count()
        if count == 0:
            return Response({"detail": "Aucune réservation en attente dans ce groupe."}, status=status.HTTP_404_NOT_FOUND)
        for r in pending:
            r.reject(request.user, s.validated_data.get("comment", ""))
            EmailService.send_reservation_rejected(r)
        return Response({"detail": f"{count} réservation(s) refusée(s).", "count": count})
