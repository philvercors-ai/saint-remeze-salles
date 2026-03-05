from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, RGPDConsent, PasswordResetToken


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ["email", "get_full_name", "role", "email_verified", "is_active", "date_joined"]
    list_filter = ["role", "email_verified", "is_active"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["-date_joined"]
    fieldsets = UserAdmin.fieldsets + (
        ("Saint-Rémèze", {"fields": ("phone", "association", "role", "email_verified")}),
        ("RGPD", {"fields": ("rgpd_consent_date", "deletion_requested_at", "anonymized_at")}),
    )
    actions = ["anonymize_users"]

    def anonymize_users(self, request, queryset):
        for user in queryset:
            user.anonymize()
        self.message_user(request, f"{queryset.count()} utilisateur(s) anonymisé(s).")
    anonymize_users.short_description = "Anonymiser les utilisateurs sélectionnés (RGPD)"


@admin.register(RGPDConsent)
class RGPDConsentAdmin(admin.ModelAdmin):
    list_display = ["user", "consent_type", "granted", "timestamp", "policy_version"]
    list_filter = ["consent_type", "granted"]
    search_fields = ["user__email"]
    readonly_fields = ["user", "consent_type", "granted", "timestamp", "ip_address", "user_agent", "policy_version"]
    ordering = ["-timestamp"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ["user", "created_at", "expires_at", "used"]
    list_filter = ["used"]
    readonly_fields = ["user", "token", "created_at", "expires_at", "used"]
