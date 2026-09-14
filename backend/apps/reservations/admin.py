from django.contrib import admin
from django.utils import timezone
from apps.compat.admin import MongoBulkDeleteMixin
from .models import Reservation
from services.email_service import EmailService


@admin.register(Reservation)
class ReservationAdmin(MongoBulkDeleteMixin, admin.ModelAdmin):
    list_display = ["title", "room", "date", "start_time", "end_time", "contact_name", "status", "created_at"]
    list_filter = ["status", "room", "date"]
    search_fields = ["title", "contact_name", "contact_email", "association"]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at", "reviewed_at", "reviewed_by"]
    date_hierarchy = "date"
    actions = ["approve_reservations", "reject_reservations"]

    def delete_model(self, request, obj):
        EmailService.send_reservation_deleted(obj)
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        # Surcharge de MongoBulkDeleteMixin.delete_queryset() : reprend la
        # même suppression objet par objet (requise sur MongoDB, voir ce
        # mixin), mais regroupe d'abord par série récurrente pour n'envoyer
        # qu'un seul email de synthèse par série sélectionnée, au lieu d'un
        # email par occurrence.
        objs = list(queryset)
        by_group = {}
        singles = []
        for obj in objs:
            if obj.recurrence_group:
                by_group.setdefault(obj.recurrence_group, []).append(obj)
            else:
                singles.append(obj)

        for obj in singles:
            EmailService.send_reservation_deleted(obj)
        for items in by_group.values():
            if len(items) > 1:
                EmailService.send_recurring_reservation_deleted(items)
            else:
                EmailService.send_reservation_deleted(items[0])

        for obj in objs:
            obj.delete()

    def approve_reservations(self, request, queryset):
        for r in queryset.filter(status="pending"):
            r.approve(request.user)
            EmailService.send_reservation_approved(r)
        self.message_user(request, f"{queryset.count()} réservation(s) approuvée(s).")
    approve_reservations.short_description = "Approuver les réservations sélectionnées"

    def reject_reservations(self, request, queryset):
        for r in queryset.filter(status="pending"):
            r.reject(request.user)
            EmailService.send_reservation_rejected(r)
        self.message_user(request, f"{queryset.count()} réservation(s) refusée(s).")
    reject_reservations.short_description = "Refuser les réservations sélectionnées"
