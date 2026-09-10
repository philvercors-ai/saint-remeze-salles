from django.contrib import admin
from django.shortcuts import redirect
from .models import Manifestation, EquipmentStock, ManifestationSettings


@admin.register(ManifestationSettings)
class ManifestationSettingsAdmin(admin.ModelAdmin):
    """Singleton — redirige toujours vers l'unique ligne (pk=1, créée à la
    volée) au lieu de montrer une liste, et interdit ajout/suppression."""
    fields = ["is_enabled", "updated_at"]
    readonly_fields = ["updated_at"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        obj = ManifestationSettings.load()
        return redirect("admin:manifestations_manifestationsettings_change", obj.pk)


@admin.register(Manifestation)
class ManifestationAdmin(admin.ModelAdmin):
    list_display = ["title", "association", "date_start", "date_end", "location", "status", "created_at"]
    list_filter = ["status", "date_start"]
    search_fields = ["title", "association", "contact_name", "contact_email"]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at", "reviewed_at"]


@admin.register(EquipmentStock)
class EquipmentStockAdmin(admin.ModelAdmin):
    list_display = ["name", "total_quantity"]
    ordering = ["name"]
