from django.core.exceptions import ImproperlyConfigured

from .base import *

DEBUG = False

_INSECURE_SECRET_KEYS = {"changeme-in-production", "changeme-generate-with-python-secrets"}
if SECRET_KEY in _INSECURE_SECRET_KEYS or len(SECRET_KEY) < 32:
    raise ImproperlyConfigured(
        "SECRET_KEY absent, non généré (valeur de repli/placeholder copiée depuis "
        ".env.example) ou trop court — refus de démarrer en production avec une "
        "clé devinable. Générer une vraie valeur : "
        "python3 -c \"import secrets; print(secrets.token_urlsafe(50))\""
    )

ALLOWED_HOSTS = [h for h in os.environ.get("ALLOWED_HOSTS", "").split(",") if h]

# Render injecte RENDER_EXTERNAL_HOSTNAME automatiquement (ex: saint-remeze-backend-ic8p.onrender.com)
# Cela évite de devoir connaître le suffixe généré à l'avance.
if _render_host := os.environ.get("RENDER_EXTERNAL_HOSTNAME"):
    ALLOWED_HOSTS.append(_render_host)

CORS_ALLOWED_ORIGINS = [o for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o]

# Pas de wildcard *.onrender.com ici : ce sous-domaine est partagé par tous les
# projets hébergés sur Render (pas seulement les nôtres) — l'autoriser en bloc
# permettrait à n'importe quelle autre app onrender.com de faire des requêtes
# cross-origin vers cette API. CORS_ALLOWED_ORIGINS (explicite, ci-dessus) suffit.

# Sécurité HTTPS
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": '{"time": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}',
        }
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        "apps": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "apps.accounts": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        "services": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
