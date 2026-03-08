from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Reservation(models.Model):
    STATUS_CHOICES = [
        ("pending", "En attente"),
        ("approved", "Approuvée"),
        ("rejected", "Refusée"),
        ("cancelled", "Annulée"),
    ]

    room = models.ForeignKey("rooms.Room", on_delete=models.PROTECT, verbose_name="Salle")
    user = models.ForeignKey(
        "accounts.CustomUser", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Utilisateur"
    )

    # Infos contact (copiées pour conservation même si compte supprimé)
    title = models.CharField(max_length=200, verbose_name="Titre de l'événement")
    association = models.CharField(max_length=200, blank=True, verbose_name="Association / Organisme")
    contact_name = models.CharField(max_length=100, verbose_name="Nom du contact")
    contact_email = models.EmailField(verbose_name="Email du contact")
    contact_phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")

    # Date et horaires
    date = models.DateField(verbose_name="Date")
    start_time = models.TimeField(verbose_name="Heure de début")
    end_time = models.TimeField(verbose_name="Heure de fin")
    attendees = models.PositiveIntegerField(default=0, verbose_name="Nombre de participants")

    # Workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", verbose_name="Statut")
    notes = models.TextField(blank=True, verbose_name="Notes de l'organisateur")
    admin_comment = models.TextField(blank=True, verbose_name="Commentaire de la mairie")
    reviewed_by = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_reservations",
        verbose_name="Traité par",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name="Traité le")

    # Visibilité publique
    is_public = models.BooleanField(default=True, verbose_name="Réservation publique")

    # Récurrence — UUID partagé par toutes les occurrences d'une même série
    recurrence_group = models.CharField(max_length=36, blank=True, db_index=True, verbose_name="Groupe récurrence")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Réservation"
        verbose_name_plural = "Réservations"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["room", "date", "status"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["contact_email"]),
        ]

    def __str__(self):
        return f"{self.title} — {self.room.name} le {self.date}"

    def clean(self):
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError({"end_time": "L'heure de fin doit être après l'heure de début."})

        if self.room_id and self.date and self.start_time and self.end_time:
            overlaps = Reservation.objects.filter(
                room=self.room,
                date=self.date,
                status__in=["pending", "approved"],
            ).exclude(pk=self.pk).filter(
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
            )
            if overlaps.exists():
                raise ValidationError(
                    {"date": "Ce créneau est déjà occupé ou en attente de validation pour cette salle."}
                )

    def approve(self, agent):
        self.status = "approved"
        self.reviewed_by = agent
        self.reviewed_at = timezone.now()
        self.save(update_fields=["status", "reviewed_by", "reviewed_at"])

    def reject(self, agent, comment=""):
        self.status = "rejected"
        self.admin_comment = comment
        self.reviewed_by = agent
        self.reviewed_at = timezone.now()
        self.save(update_fields=["status", "admin_comment", "reviewed_by", "reviewed_at"])
