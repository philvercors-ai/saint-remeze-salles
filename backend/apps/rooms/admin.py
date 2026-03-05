from django.contrib import admin
from .models import Room


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["name", "capacity", "area_sqm", "hourly_rate", "is_active", "requires_admin_only"]
    list_filter = ["is_active", "requires_admin_only"]
    search_fields = ["name"]
    list_editable = ["is_active", "hourly_rate"]
