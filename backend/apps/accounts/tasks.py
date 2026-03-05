"""Tâches Celery pour la gestion RGPD automatisée."""
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


@shared_task
def anonymize_pending_deletions():
    """Anonymise les comptes dont la suppression a été demandée il y a > RGPD_DELETION_DELAY_DAYS jours."""
    from .models import CustomUser
    from services.email_service import EmailService

    cutoff = timezone.now() - timedelta(days=settings.RGPD_DELETION_DELAY_DAYS)
    users_to_anonymize = CustomUser.objects.filter(
        deletion_requested_at__lte=cutoff,
        anonymized_at__isnull=True,
        is_active=True,
    )

    count = 0
    for user in users_to_anonymize:
        user.anonymize()
        count += 1

    return f"{count} compte(s) anonymisé(s)."


@shared_task
def anonymize_inactive_users():
    """Anonymise les comptes inactifs depuis RGPD_DATA_RETENTION_MONTHS mois."""
    from .models import CustomUser

    cutoff = timezone.now() - timedelta(days=settings.RGPD_DATA_RETENTION_MONTHS * 30)
    users = CustomUser.objects.filter(
        last_login__lte=cutoff,
        anonymized_at__isnull=True,
        deletion_requested_at__isnull=True,
        is_active=True,
        role="citoyen",  # Ne jamais anonymiser les agents/admins automatiquement
    )

    count = 0
    for user in users:
        user.anonymize()
        count += 1

    return f"{count} compte(s) inactif(s) anonymisé(s)."


@shared_task
def warn_users_before_anonymization():
    """Envoie un email d'avertissement 30 jours avant l'anonymisation automatique."""
    from .models import CustomUser
    from services.email_service import EmailService

    warn_date = timezone.now() - timedelta(days=(settings.RGPD_DATA_RETENTION_MONTHS * 30 - 30))
    users = CustomUser.objects.filter(
        last_login__lte=warn_date,
        anonymized_at__isnull=True,
        is_active=True,
        role="citoyen",
    )

    for user in users:
        EmailService.send_anonymization_warning(user)

    return f"Avertissement envoyé à {users.count()} utilisateur(s)."
