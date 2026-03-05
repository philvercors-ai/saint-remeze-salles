from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["action", "user", "ip_address", "timestamp"]
    list_filter = ["action"]
    search_fields = ["action", "user__email", "ip_address"]
    readonly_fields = ["user", "action", "object_type", "object_id", "details", "ip_address", "user_agent", "timestamp"]
    ordering = ["-timestamp"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
