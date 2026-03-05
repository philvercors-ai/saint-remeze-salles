from django.contrib import admin
from .models import Manifestation


@admin.register(Manifestation)
class ManifestationAdmin(admin.ModelAdmin):
    list_display = ["title", "association", "date_start", "date_end", "location", "status", "created_at"]
    list_filter = ["status", "date_start"]
    search_fields = ["title", "association", "contact_name", "contact_email"]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at", "reviewed_at"]
