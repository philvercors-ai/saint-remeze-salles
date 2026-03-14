#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

# Charge le .env avant que Django ne lise os.environ.
# Sans cet appel, RESEND_API_KEY, MONGODB_URI… sont vides en développement
# direct (hors Docker Compose qui injecte les vars automatiquement).
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
