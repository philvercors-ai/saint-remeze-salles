from django.contrib import admin
from .models import Room


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["name", "capacity", "area_sqm", "daily_rate_individual", "daily_rate_association", "is_active", "requires_admin_only"]
    list_filter = ["is_active", "requires_admin_only", "allowed_groups"]
    search_fields = ["name"]
    list_editable = ["is_active", "daily_rate_individual", "daily_rate_association"]
    filter_horizontal = ["allowed_groups"]
