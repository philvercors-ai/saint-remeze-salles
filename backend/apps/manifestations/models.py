from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django_mongodb_backend.fields import ArrayField


class Manifestation(models.Model):
    STATUS_CHOICES = [
        ("pending", "En attente"),
        ("approved", "Approuvée"),
        ("rejected", "Refusée"),
    ]

    user = models.ForeignKey(
        "accounts.CustomUser", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Utilisateur"
    )
    title = models.CharField(max_length=200, verbose_name="Titre")
    association = models.CharField(max_length=200, verbose_name="Association / Organisme")
    contact_name = models.CharField(max_length=100, verbose_name="Responsable")
    contact_email = models.EmailField(verbose_name="Email")
    contact_phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")

    date_start = models.DateField(verbose_name="Date de début")
    date_end = models.DateField(verbose_name="Date de fin")
    location = models.CharField(max_length=200, verbose_name="Lieu")
    expected_attendees = models.PositiveIntegerField(default=0, verbose_name="Participants attendus")
    description = models.TextField(verbose_name="Description")
    budget = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Budget estimé (€)")
    equipment_needs = ArrayField(
        models.CharField(max_length=100), blank=True, default=list, verbose_name="Besoins logistiques"
    )

    is_public = models.BooleanField(default=True, verbose_name="Manifestation publique")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", verbose_name="Statut")
    admin_comment = models.TextField(blank=True, verbose_name="Commentaire mairie")
    reviewed_by = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_manifestations",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Manifestation"
        verbose_name_plural = "Manifestations"
        ordering = ["date_start"]

    def __str__(self):
        return f"{self.title} ({self.date_start})"

    def clean(self):
        if self.date_start and self.date_end and self.date_start > self.date_end:
            raise ValidationError({"date_end": "La date de fin doit être après la date de début."})

    def approve(self, agent, comment=""):
        self.status = "approved"
        self.admin_comment = comment
        self.reviewed_by = agent
        self.reviewed_at = timezone.now()
        self.save(update_fields=["status", "admin_comment", "reviewed_by", "reviewed_at"])

    def reject(self, agent, comment=""):
        self.status = "rejected"
        self.admin_comment = comment
        self.reviewed_by = agent
        self.reviewed_at = timezone.now()
        self.save(update_fields=["status", "admin_comment", "reviewed_by", "reviewed_at"])
