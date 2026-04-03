"""
Crée ou met à jour le superuser depuis DJANGO_SUPERUSER_EMAIL/PASSWORD.
Idempotent — si le compte existe, force email_verified=True et role=admin.

Usage (startCommand Render) :
    python manage.py ensure_superuser
"""
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Crée ou met à jour le superuser depuis les variables d'environnement"

    def handle(self, *args, **options):
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")

        if not email or not password:
            self.stdout.write("ensure_superuser: DJANGO_SUPERUSER_EMAIL/PASSWORD non définis, ignoré.")
            return

        try:
            user = User.objects.get(email=email)
            # Met à jour les champs critiques pour garantir l'accès
            update_fields = []
            if not user.email_verified:
                user.email_verified = True
                update_fields.append("email_verified")
            if user.role != "admin":
                user.role = "admin"
                update_fields.append("role")
            if not user.is_staff:
                user.is_staff = True
                update_fields.append("is_staff")
            if not user.is_superuser:
                user.is_superuser = True
                update_fields.append("is_superuser")
            user.set_password(password)
            update_fields.append("password")
            user.save(update_fields=update_fields if update_fields else ["password"])
            self.stdout.write(self.style.SUCCESS(
                f"ensure_superuser: {email} mis à jour ({', '.join(update_fields)})."
            ))
        except User.DoesNotExist:
            User.objects.create_superuser(
                username=email,
                email=email,
                password=password,
                email_verified=True,
                role="admin",
            )
            self.stdout.write(self.style.SUCCESS(f"ensure_superuser: superuser {email} créé."))
