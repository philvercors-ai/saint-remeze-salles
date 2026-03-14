from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True

# Logs en dev
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {
        "django.db.backends": {"handlers": ["console"], "level": "INFO"},
        # Affiche les erreurs d'envoi d'email dans la console de dev
        "services": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
    },
}
