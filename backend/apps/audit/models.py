from django.db import models


class AuditLog(models.Model):
    user = models.ForeignKey(
        "accounts.CustomUser", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Utilisateur"
    )
    action = models.CharField(max_length=100, verbose_name="Action")  # ex: "reservation.approved"
    object_type = models.CharField(max_length=50, blank=True, verbose_name="Type d'objet")
    object_id = models.CharField(max_length=50, blank=True, verbose_name="ID de l'objet")
    details = models.JSONField(default=dict, verbose_name="Détails")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Journal d'audit"
        verbose_name_plural = "Journal d'audit"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "timestamp"]),
            models.Index(fields=["action"]),
        ]

    def __str__(self):
        return f"{self.action} — {self.timestamp:%d/%m/%Y %H:%M}"
