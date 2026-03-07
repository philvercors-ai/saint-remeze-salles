"""
Crée un superuser si DJANGO_SUPERUSER_EMAIL et DJANGO_SUPERUSER_PASSWORD
sont définis en variable d'environnement. Idempotent — ignoré si le compte
existe déjà.

Usage (startCommand Render) :
    python manage.py ensure_superuser
"""
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Crée le superuser depuis les variables d'environnement (idempotent)"

    def handle(self, *args, **options):
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")

        if not email or not password:
            self.stdout.write("ensure_superuser: DJANGO_SUPERUSER_EMAIL/PASSWORD non définis, ignoré.")
            return

        if User.objects.filter(email=email).exists():
            self.stdout.write(f"ensure_superuser: {email} existe déjà, ignoré.")
            return

        User.objects.create_superuser(
            username=email,
            email=email,
            password=password,
            email_verified=True,
            role="admin",
        )
        self.stdout.write(self.style.SUCCESS(f"ensure_superuser: superuser {email} créé."))
