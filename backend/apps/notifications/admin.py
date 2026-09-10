from django.contrib import admin
from apps.compat.admin import MongoBulkDeleteMixin
from .models import MunicipalService, Notification


@admin.register(MunicipalService)
class MunicipalServiceAdmin(MongoBulkDeleteMixin, admin.ModelAdmin):
    list_display = ["name", "email", "icon", "is_active"]
    list_editable = ["is_active"]


@admin.register(Notification)
class NotificationAdmin(MongoBulkDeleteMixin, admin.ModelAdmin):
    list_display = ["__str__", "priority", "sent_by", "email_sent", "email_count", "sent_at"]
    list_filter = ["priority", "email_sent"]
    readonly_fields = ["sent_at", "sent_by", "email_sent", "email_count"]
