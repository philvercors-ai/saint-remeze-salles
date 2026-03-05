"""Middleware d'audit automatique des actions sensibles."""
import logging

logger = logging.getLogger("apps.audit")

AUDIT_PATHS = {
    "/api/auth/login/": "user.login",
    "/api/auth/logout/": "user.logout",
    "/api/auth/register/": "user.register",
    "/api/auth/forgot-password/": "user.forgot_password",
    "/api/auth/reset-password/": "user.reset_password",
    "/api/rgpd/request-deletion/": "rgpd.deletion_request",
}


class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        action = AUDIT_PATHS.get(request.path)
        if action and request.method == "POST" and response.status_code < 400:
            self._log(request, action)

        return response

    def _log(self, request, action: str):
        try:
            from .models import AuditLog
            user = request.user if request.user.is_authenticated else None
            AuditLog.objects.create(
                user=user,
                action=action,
                ip_address=self._get_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            )
        except Exception as exc:
            logger.error("Erreur AuditLog : %s", exc)

    def _get_ip(self, request):
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        return x_forwarded.split(",")[0].strip() if x_forwarded else request.META.get("REMOTE_ADDR")
