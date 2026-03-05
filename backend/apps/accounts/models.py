import secrets
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ("citoyen", "Citoyen"),
        ("agent", "Agent municipal"),
        ("admin", "Administrateur"),
    ]

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    association = models.CharField(max_length=200, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="citoyen")

    # Email verification
    email_verified = models.BooleanField(default=False)
    email_verify_token = models.CharField(max_length=64, blank=True)
    email_verify_token_created = models.DateTimeField(null=True, blank=True)

    # RGPD
    rgpd_consent_date = models.DateTimeField(null=True, blank=True)
    anonymized_at = models.DateTimeField(null=True, blank=True)
    deletion_requested_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}>"

    def generate_email_verify_token(self):
        self.email_verify_token = secrets.token_urlsafe(32)
        self.email_verify_token_created = timezone.now()
        self.save(update_fields=["email_verify_token", "email_verify_token_created"])
        return self.email_verify_token

    @property
    def is_email_token_valid(self):
        if not self.email_verify_token_created:
            return False
        return (timezone.now() - self.email_verify_token_created).total_seconds() < 86400  # 24h

    def anonymize(self):
        """Anonymise les données personnelles (droit à l'oubli RGPD)."""
        self.first_name = "Anonyme"
        self.last_name = ""
        self.email = f"deleted_{self.pk}@anonymized.invalid"
        self.username = f"deleted_{self.pk}"
        self.phone = ""
        self.association = ""
        self.is_active = False
        self.anonymized_at = timezone.now()
        self.save()


class RGPDConsent(models.Model):
    CONSENT_TYPES = [
        ("registration", "Inscription"),
        ("cookies", "Cookies"),
        ("newsletter", "Newsletter"),
        ("data_export", "Export données"),
        ("data_delete", "Suppression compte"),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="consents")
    consent_type = models.CharField(max_length=30, choices=CONSENT_TYPES)
    granted = models.BooleanField()
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    policy_version = models.CharField(max_length=10, default="1.0")

    class Meta:
        verbose_name = "Consentement RGPD"
        verbose_name_plural = "Consentements RGPD"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.user.email} — {self.consent_type} ({'+' if self.granted else '-'})"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="reset_tokens")
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Token de réinitialisation"
        verbose_name_plural = "Tokens de réinitialisation"

    def __str__(self):
        return f"{self.user.email} — {'utilisé' if self.used else 'actif'}"

    @property
    def is_valid(self):
        return not self.used and timezone.now() < self.expires_at

    @classmethod
    def create_for_user(cls, user):
        from datetime import timedelta
        cls.objects.filter(user=user, used=False).update(used=True)  # Invalide les anciens
        return cls.objects.create(
            user=user,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(minutes=15),
        )
