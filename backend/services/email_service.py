"""
Wrapper Resend pour tous les emails de l'application.
"""
import logging
import resend
from django.conf import settings

logger = logging.getLogger(__name__)


class EmailService:

    @classmethod
    def _send(cls, to: str | list, subject: str, html: str) -> bool:
        """Envoi générique via l'API Resend."""
        if not settings.RESEND_API_KEY:
            logger.error(
                "[EMAIL] RESEND_API_KEY non configurée — email NON envoyé à %s | sujet: %s",
                to, subject,
            )
            return False

        resend.api_key = settings.RESEND_API_KEY
        recipients = to if isinstance(to, list) else [to]
        try:
            params = {
                "from": settings.DEFAULT_FROM_EMAIL,
                "to": recipients,
                "subject": subject,
                "html": html,
            }
            result = resend.Emails.send(params)
            email_id = result.get("id") if isinstance(result, dict) else getattr(result, "id", str(result))
            logger.info("[EMAIL] Envoyé à %s | id=%s", recipients, email_id)
            return True
        except Exception as exc:
            logger.error(
                "[EMAIL] Échec Resend — destinataire=%s | from=%s | erreur=%s",
                recipients, settings.DEFAULT_FROM_EMAIL, exc,
            )
            return False

    # ── Auth ──────────────────────────────────────────────────────────────────

    @classmethod
    def send_email_verification(cls, user, token: str) -> bool:
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        html = cls._base_template(
            title="Vérifiez votre adresse email",
            body=f"""
                <p>Bonjour {user.first_name or user.email},</p>
                <p>Cliquez sur le bouton ci-dessous pour activer votre compte :</p>
                <a href="{verify_url}" style="{cls.BTN_STYLE}">Vérifier mon email</a>
                <p style="color:#666;font-size:13px;">Ce lien est valable 24 heures.</p>
                <p style="color:#666;font-size:13px;">Si vous n'avez pas créé de compte, ignorez cet email.</p>
            """,
        )
        return cls._send(user.email, "Activez votre compte — Saint Remèze", html)

    @classmethod
    def send_password_reset(cls, user, token: str) -> bool:
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        html = cls._base_template(
            title="Réinitialisation de votre mot de passe",
            body=f"""
                <p>Bonjour {user.first_name or user.email},</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
                <a href="{reset_url}" style="{cls.BTN_STYLE}">Réinitialiser mon mot de passe</a>
                <p style="color:#666;font-size:13px;">Ce lien expire dans <strong>15 minutes</strong>.</p>
                <p style="color:#666;font-size:13px;">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
            """,
        )
        return cls._send(user.email, "Réinitialisation de mot de passe — Saint Remèze", html)

    @classmethod
    def send_password_changed(cls, user) -> bool:
        html = cls._base_template(
            title="Mot de passe modifié",
            body=f"""
                <p>Bonjour {user.first_name or user.email},</p>
                <p>Votre mot de passe a été modifié avec succès.</p>
                <p style="color:#666;font-size:13px;">Si vous n'êtes pas à l'origine de cette modification,
                contactez immédiatement la mairie : <a href="mailto:mairie@saintremeze.fr">mairie@saintremeze.fr</a></p>
            """,
        )
        return cls._send(user.email, "Mot de passe modifié — Saint Remèze", html)

    # ── Réservations ──────────────────────────────────────────────────────────

    @classmethod
    def send_reservation_received(cls, reservation) -> bool:
        html = cls._base_template(
            title="Demande de réservation reçue",
            body=f"""
                <p>Bonjour {reservation.contact_name},</p>
                <p>Votre demande de réservation a bien été reçue :</p>
                {cls._reservation_summary(reservation)}
                <p>La mairie traitera votre demande sous 48 heures ouvrées.</p>
            """,
        )
        return cls._send(reservation.contact_email, "Demande de réservation reçue — Saint Remèze", html)

    @classmethod
    def send_reservation_approved(cls, reservation) -> bool:
        html = cls._base_template(
            title="Réservation approuvée ✓",
            body=f"""
                <p>Bonjour {reservation.contact_name},</p>
                <p>Bonne nouvelle ! Votre réservation a été <strong style="color:#065f46">approuvée</strong> :</p>
                {cls._reservation_summary(reservation)}
                {"<p><strong>Commentaire de la mairie :</strong> " + reservation.admin_comment + "</p>" if reservation.admin_comment else ""}
                <p>En cas de question, contactez-nous : <a href="mailto:mairie@saintremeze.fr">mairie@saintremeze.fr</a></p>
            """,
        )
        return cls._send(reservation.contact_email, "Réservation approuvée — Saint Remèze", html)

    @classmethod
    def send_reservation_rejected(cls, reservation) -> bool:
        html = cls._base_template(
            title="Réservation non accordée",
            body=f"""
                <p>Bonjour {reservation.contact_name},</p>
                <p>Nous ne pouvons malheureusement pas donner suite à votre demande de réservation :</p>
                {cls._reservation_summary(reservation)}
                {"<p><strong>Motif :</strong> " + reservation.admin_comment + "</p>" if reservation.admin_comment else ""}
                <p>Pour plus d'informations : <a href="mailto:mairie@saintremeze.fr">mairie@saintremeze.fr</a></p>
            """,
        )
        return cls._send(reservation.contact_email, "Réservation non accordée — Saint Remèze", html)

    # ── RGPD ──────────────────────────────────────────────────────────────────

    @classmethod
    def send_deletion_confirmation(cls, user) -> bool:
        html = cls._base_template(
            title="Demande de suppression enregistrée",
            body=f"""
                <p>Bonjour {user.first_name or user.email},</p>
                <p>Votre demande de suppression de compte a bien été enregistrée.</p>
                <p>Conformément au RGPD, votre compte sera anonymisé dans <strong>30 jours</strong>.</p>
                <p>Pendant ce délai, vous pouvez annuler cette demande en vous connectant à votre profil.</p>
                <p style="color:#666;font-size:13px;">Contact DPO : <a href="mailto:dpo@saintremeze.fr">dpo@saintremeze.fr</a></p>
            """,
        )
        return cls._send(user.email, "Demande de suppression — Saint Remèze", html)

    @classmethod
    def send_anonymization_warning(cls, user) -> bool:
        html = cls._base_template(
            title="Votre compte sera bientôt anonymisé",
            body=f"""
                <p>Bonjour,</p>
                <p>Votre compte Saint Remèze est inactif depuis longtemps.</p>
                <p>Conformément à notre politique de confidentialité, il sera <strong>anonymisé dans 30 jours</strong>.</p>
                <p>Pour conserver votre compte, connectez-vous avant cette date.</p>
                <p style="color:#666;font-size:13px;">Contact DPO : <a href="mailto:dpo@saintremeze.fr">dpo@saintremeze.fr</a></p>
            """,
        )
        return cls._send(user.email, "Votre compte sera anonymisé — Saint Remèze", html)

    # ── Notifications services ────────────────────────────────────────────────

    @classmethod
    def send_service_notification(cls, service_email: str, service_name: str, message: str, priority: str) -> bool:
        priority_label = {"low": "Normale", "normal": "Importante", "high": "URGENTE"}.get(priority, "Normale")
        priority_color = {"low": "#475569", "normal": "#c9a84c", "high": "#991b1b"}.get(priority, "#475569")
        html = cls._base_template(
            title=f"[{priority_label}] Notification — Mairie de Saint Remèze",
            body=f"""
                <p>Service {service_name},</p>
                <p style="padding:12px;border-left:4px solid {priority_color};background:#f8f8f8;">
                    {message}
                </p>
                <p style="color:#666;font-size:13px;">Priorité : <strong style="color:{priority_color}">{priority_label}</strong></p>
            """,
        )
        return cls._send(service_email, f"[{priority_label}] Notification mairie — Saint Remèze", html)

    # ── Templates ─────────────────────────────────────────────────────────────

    BTN_STYLE = (
        "display:inline-block;padding:12px 24px;background:#1a3a5a;color:#fff;"
        "text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;"
    )

    @staticmethod
    def _reservation_summary(reservation) -> str:
        return f"""
            <table style="border-collapse:collapse;width:100%;margin:12px 0;">
                <tr><td style="padding:8px;background:#f7f4ef;font-weight:600">Salle</td>
                    <td style="padding:8px;">{reservation.room.name}</td></tr>
                <tr><td style="padding:8px;background:#f7f4ef;font-weight:600">Événement</td>
                    <td style="padding:8px;">{reservation.title}</td></tr>
                <tr><td style="padding:8px;background:#f7f4ef;font-weight:600">Date</td>
                    <td style="padding:8px;">{reservation.date.strftime('%d/%m/%Y')}</td></tr>
                <tr><td style="padding:8px;background:#f7f4ef;font-weight:600">Horaires</td>
                    <td style="padding:8px;">{reservation.start_time.strftime('%H:%M')} – {reservation.end_time.strftime('%H:%M')}</td></tr>
                <tr><td style="padding:8px;background:#f7f4ef;font-weight:600">Participants</td>
                    <td style="padding:8px;">{reservation.attendees}</td></tr>
            </table>
        """

    @staticmethod
    def _base_template(title: str, body: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f7f4ef;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;padding:32px 0;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                <!-- Header -->
                <tr>
                  <td style="background:#1a3a5a;padding:24px 32px;">
                    <p style="margin:0;color:#c9a84c;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Mairie de Saint Remèze</p>
                    <h1 style="margin:8px 0 0;color:#fff;font-size:20px;">{title}</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:32px;color:#374151;font-size:15px;line-height:1.6;">
                    {body}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding:16px 32px;background:#f7f4ef;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">
                      Mairie de Saint Remèze — 07700 Saint Remèze<br>
                      <a href="mailto:mairie@saintremeze.fr" style="color:#1a3a5a;">mairie@saintremeze.fr</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """
