from django.contrib import admin
from apps.compat.admin import MongoBulkDeleteMixin
from .models import Room


@admin.register(Room)
class RoomAdmin(MongoBulkDeleteMixin, admin.ModelAdmin):
    list_display = ["name", "capacity", "area_sqm", "daily_rate_individual", "daily_rate_association", "is_active", "requires_admin_only"]
    list_filter = ["is_active", "requires_admin_only", "allowed_groups"]
    search_fields = ["name"]
    list_editable = ["is_active", "daily_rate_individual", "daily_rate_association"]
    filter_horizontal = ["allowed_groups"]
