import secrets
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

rna_validator = RegexValidator(
    r"^W\d{9}$",
    "Le numéro RNA doit être au format W suivi de 9 chiffres (ex. W123456789).",
)


class UserGroup(models.Model):
    """Groupe métier (ex : « Conseil Municipal ») utilisé pour restreindre
    la réservation de certaines salles à leurs membres. Sans rapport avec
    le système de groupes/permissions Django (django.contrib.auth.Group),
    volontairement non utilisé sur ce projet — voir Room.allowed_groups."""
    name = models.CharField(max_length=100, unique=True, verbose_name="Nom")
    description = models.TextField(blank=True, verbose_name="Description")

    class Meta:
        verbose_name = "Groupe d'utilisateurs"
        verbose_name_plural = "Groupes d'utilisateurs"
        ordering = ["name"]

    def __str__(self):
        return self.name


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ("citoyen", "Citoyen"),
        ("agent", "Agent municipal"),
        ("admin", "Administrateur"),
    ]

    ACCOUNT_TYPE_CHOICES = [
        ("particulier", "Particulier"),
        ("association", "Association"),
    ]
    # Noms des UserGroup miroir de chaque type de compte (créés si besoin) —
    # permet de restreindre une salle aux particuliers ou aux associations
    # via le même mécanisme que n'importe quel autre groupe (Room.allowed_groups).
    ACCOUNT_TYPE_GROUP_NAMES = dict(ACCOUNT_TYPE_CHOICES)

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    account_type = models.CharField(
        max_length=20, choices=ACCOUNT_TYPE_CHOICES, default="particulier", verbose_name="Type de compte",
    )
    association = models.CharField(max_length=200, blank=True, verbose_name="Nom de l'association")
    rna_number = models.CharField(
        max_length=10, blank=True, verbose_name="Numéro RNA", validators=[rna_validator],
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="citoyen")
    reservation_groups = models.ManyToManyField(
        UserGroup, blank=True, related_name="members", verbose_name="Groupes de réservation",
    )

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

    def sync_account_type_group(self):
        """Ajoute l'utilisateur au groupe de réservation ("Particulier" ou
        "Association", créé si besoin) correspondant à son account_type
        actuel, et le retire de l'autre. Nécessite que l'utilisateur soit
        déjà enregistré (pk existant)."""
        target_name = self.ACCOUNT_TYPE_GROUP_NAMES.get(self.account_type)
        if not target_name:
            return
        for name in self.ACCOUNT_TYPE_GROUP_NAMES.values():
            group, _ = UserGroup.objects.get_or_create(name=name)
            if name == target_name:
                self.reservation_groups.add(group)
            else:
                self.reservation_groups.remove(group)

    def anonymize(self):
        """Anonymise les données personnelles (droit à l'oubli RGPD)."""
        self.first_name = "Anonyme"
        self.last_name = ""
        self.email = f"deleted_{self.pk}@anonymized.invalid"
        self.username = f"deleted_{self.pk}"
        self.phone = ""
        self.association = ""
        self.rna_number = ""
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
