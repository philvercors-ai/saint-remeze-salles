"""
Script de création du premier superutilisateur (admin).
Usage : python manage.py shell < scripts/create_superuser.py
Ou bien : python manage.py createsuperuser
"""
import os
from django.contrib.auth import get_user_model

User = get_user_model()

email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@saint-remeze.fr")
password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "changeme!")

if not User.objects.filter(email=email).exists():
    user = User.objects.create_superuser(
        username=email,
        email=email,
        password=password,
        first_name="Admin",
        last_name="Mairie",
        role="admin",
        email_verified=True,
    )
    print(f"Superutilisateur créé : {email}")
else:
    print(f"Superutilisateur existe déjà : {email}")
