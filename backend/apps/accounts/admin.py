import os

from django.contrib import admin, messages
from django.contrib.admin.utils import unquote
from django.contrib.auth.admin import UserAdmin
from django.http import HttpResponseRedirect
from .models import CustomUser, RGPDConsent, PasswordResetToken


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ["email", "get_full_name", "role", "email_verified", "is_active", "date_joined"]
    list_filter = ["role", "email_verified", "is_active"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["-date_joined"]
    fieldsets = UserAdmin.fieldsets + (
        ("Saint Remèze", {"fields": ("phone", "association", "role", "email_verified")}),
        ("RGPD", {"fields": ("rgpd_consent_date", "deletion_requested_at", "anonymized_at")}),
    )
    actions = ["anonymize_users"]

    def anonymize_users(self, request, queryset):
        for user in queryset:
            user.anonymize()
        self.message_user(request, f"{queryset.count()} utilisateur(s) anonymisé(s).")
    anonymize_users.short_description = "Anonymiser les utilisateurs sélectionnés (RGPD)"

    def user_change_password(self, request, id, form_url=""):
        # Le mot de passe du compte DJANGO_SUPERUSER_EMAIL est réécrit à chaque
        # redémarrage par `ensure_superuser` — le changer ici serait sans effet
        # durable et donnerait une fausse impression de changement réussi.
        user = self.get_object(request, unquote(id))
        if user and user.email == os.environ.get("DJANGO_SUPERUSER_EMAIL"):
            self.message_user(
                request,
                "Le mot de passe de ce compte est géré par la variable d'environnement "
                "DJANGO_SUPERUSER_PASSWORD sur Render — un changement ici serait écrasé au "
                "prochain redémarrage du serveur. Modifiez cette variable dans le dashboard Render.",
                level=messages.WARNING,
            )
            return HttpResponseRedirect("..")
        return super().user_change_password(request, id, form_url)


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


# Le lien « Change password » du bandeau d'en-tête du Django Admin (en haut de
# TOUTES les pages) permet à l'utilisateur connecté de changer SON PROPRE mot
# de passe — indépendamment du garde-fou sur la fiche utilisateur ci-dessus.
# Si l'admin connecté est le compte DJANGO_SUPERUSER_EMAIL, ce changement
# serait lui aussi écrasé au prochain redémarrage. On intercepte donc la vue
# elle-même plutôt que de surcharger le template admin/base.html.
_original_admin_password_change = admin.site.password_change


def _guarded_admin_password_change(request, extra_context=None):
    if request.user.is_authenticated and request.user.email == os.environ.get("DJANGO_SUPERUSER_EMAIL"):
        messages.warning(
            request,
            "Le mot de passe de ce compte est géré par la variable d'environnement "
            "DJANGO_SUPERUSER_PASSWORD sur Render — un changement ici serait écrasé au "
            "prochain redémarrage du serveur. Modifiez cette variable dans le dashboard Render.",
        )
        return HttpResponseRedirect("../")
    return _original_admin_password_change(request, extra_context)


admin.site.password_change = _guarded_admin_password_change
