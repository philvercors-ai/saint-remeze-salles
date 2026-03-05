from django.contrib import admin
from django.utils import timezone
from .models import Reservation
from services.email_service import EmailService


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ["title", "room", "date", "start_time", "end_time", "contact_name", "status", "created_at"]
    list_filter = ["status", "room", "date"]
    search_fields = ["title", "contact_name", "contact_email", "association"]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at", "reviewed_at", "reviewed_by"]
    date_hierarchy = "date"
    actions = ["approve_reservations", "reject_reservations"]

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
