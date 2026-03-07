"""
Wrappers AppConfig pour les apps Django built-in.

Django lit DEFAULT_AUTO_FIELD comme fallback, mais django-mongodb-backend
exige que le champ soit défini explicitement sur le AppConfig pour les apps
qui ne le déclarent pas (admin, auth, contenttypes).

Ces classes remplacent "django.contrib.admin/auth/contenttypes" dans
INSTALLED_APPS — elles héritent du comportement complet (auto-discovery, etc.)
en ajoutant seulement default_auto_field = ObjectIdAutoField.
"""
from django.contrib.admin.apps import AdminConfig as _AdminConfig
from django.contrib.auth.apps import AuthConfig as _AuthConfig
from django.contrib.contenttypes.apps import ContentTypesConfig as _ContentTypesConfig

_MONGO = "django_mongodb_backend.fields.ObjectIdAutoField"


class AdminConfig(_AdminConfig):
    default_auto_field = _MONGO


class AuthConfig(_AuthConfig):
    default_auto_field = _MONGO


class ContentTypesConfig(_ContentTypesConfig):
    default_auto_field = _MONGO

    def ready(self):
        super().ready()
        # Patch Model.__hash__ pour django-mongodb-backend :
        # lors du signal post_migrate, Django crée des modèles "fake" historiques
        # (__fake__.ContentType) sans PK (ObjectId non encore assigné) et les met
        # dans un set(). Ces classes fake héritent de Model mais ne sont pas la
        # vraie classe ContentType, donc patcher ContentType ne suffit pas.
        # On patche Model (classe de base) pour retomber sur l'identité objet
        # quand pk est None — cohérent avec Model.__eq__ qui fait "self is other"
        # quand pk est None.
        from django.db.models.base import Model

        def _safe_model_hash(self):
            if self.pk is not None:
                return hash(self.pk)
            return object.__hash__(self)

        Model.__hash__ = _safe_model_hash
