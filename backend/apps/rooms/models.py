from django.db import models
from django_mongodb_backend.fields import ArrayField

from apps.accounts.models import UserGroup


class Room(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nom")
    capacity = models.PositiveIntegerField(verbose_name="Capacité (personnes)")
    area_sqm = models.PositiveIntegerField(verbose_name="Surface (m²)")
    daily_rate_individual = models.DecimalField(
        max_digits=8, decimal_places=2, default=0, verbose_name="Tarif journalier — Particuliers (€)",
    )
    daily_rate_association = models.DecimalField(
        max_digits=8, decimal_places=2, default=0, verbose_name="Tarif journalier — Associations (€)",
    )
    equipment = ArrayField(models.CharField(max_length=100), blank=True, default=list, verbose_name="Équipements")
    description = models.TextField(blank=True, verbose_name="Description")
    image_emoji = models.CharField(max_length=10, default="🏛️", verbose_name="Emoji")
    color = models.CharField(max_length=7, default="#1a3a5a", verbose_name="Couleur")
    CATEGORY_SALLE = "salle"
    CATEGORY_LIEU  = "lieu"
    CATEGORY_CHOICES = [
        (CATEGORY_SALLE, "Salle"),
        (CATEGORY_LIEU,  "Lieu"),
    ]
    category = models.CharField(
        max_length=10,
        choices=CATEGORY_CHOICES,
        default=CATEGORY_SALLE,
        verbose_name="Catégorie",
    )
    is_active = models.BooleanField(default=True, verbose_name="Active")
    requires_admin_only = models.BooleanField(default=False, verbose_name="Réservation admin uniquement")
    allowed_groups = models.ManyToManyField(
        UserGroup, blank=True, related_name="allowed_rooms", verbose_name="Groupes autorisés à réserver",
        help_text="Laisser vide pour autoriser tout le monde. Sans effet si « Réservation admin uniquement » est coché.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Salle"
        verbose_name_plural = "Salles"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def reservation_count(self, status="approved"):
        return self.reservation_set.filter(status=status).count()

    def daily_rate_for(self, user):
        """Tarif journalier applicable à cet utilisateur (association si le
        compte est enregistré comme tel, particulier sinon — y compris pour
        un visiteur non connecté)."""
        if user and getattr(user, "is_authenticated", False) and user.account_type == "association":
            return self.daily_rate_association
        return self.daily_rate_individual

    def user_can_reserve(self, user):
        """Un admin peut toujours tout réserver. Sinon, une salle en accès
        libre (aucun groupe défini, pas admin-only) est ouverte à tous —
        y compris aux visiteurs non connectés. Une salle restreinte
        (admin-only, ou groupes définis) exige d'être connecté et, le cas
        échéant, membre d'au moins un des groupes autorisés."""
        is_authenticated = bool(user and getattr(user, "is_authenticated", False))
        if is_authenticated and user.role == "admin":
            return True
        if self.requires_admin_only:
            return False
        if not self.allowed_groups.exists():
            return True
        if not is_authenticated:
            return False
        return user.reservation_groups.filter(
            pk__in=self.allowed_groups.values_list("pk", flat=True)
        ).exists()
