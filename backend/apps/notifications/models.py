from django.db import models


class MunicipalService(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nom du service")
    email = models.EmailField(verbose_name="Email")
    icon = models.CharField(max_length=10, default="🏢", verbose_name="Emoji")
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Service municipal"
        verbose_name_plural = "Services municipaux"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Notification(models.Model):
    PRIORITY_CHOICES = [
        ("low", "Normale"),
        ("normal", "Importante"),
        ("high", "Urgente"),
    ]

    sent_by = models.ForeignKey(
        "accounts.CustomUser", on_delete=models.SET_NULL, null=True, verbose_name="Envoyé par"
    )
    services = models.ManyToManyField(MunicipalService, verbose_name="Services destinataires")
    message = models.TextField(verbose_name="Message")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="normal", verbose_name="Priorité")
    sent_at = models.DateTimeField(auto_now_add=True)
    email_sent = models.BooleanField(default=False, verbose_name="Email envoyé")
    email_count = models.PositiveIntegerField(default=0, verbose_name="Nombre d'emails envoyés")

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-sent_at"]

    def __str__(self):
        return f"Notification {self.get_priority_display()} — {self.sent_at:%d/%m/%Y %H:%M}"
