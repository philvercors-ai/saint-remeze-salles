from django.db import models
from django_mongodb_backend.fields import ArrayField


class Room(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nom")
    capacity = models.PositiveIntegerField(verbose_name="Capacité (personnes)")
    area_sqm = models.PositiveIntegerField(verbose_name="Surface (m²)")
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0, verbose_name="Tarif horaire (€)")
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
