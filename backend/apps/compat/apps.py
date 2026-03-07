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
        # Patch ContentType.__hash__ pour django-mongodb-backend :
        # lors du signal post_migrate, Django met des instances ContentType
        # dans un set() avant qu'elles aient un PK (ObjectId). Sans PK,
        # Model.__hash__ lève TypeError. On retombe sur (app_label, model)
        # comme clé de hachage naturelle et unique.
        from django.contrib.contenttypes.models import ContentType

        def _ct_hash(self):
            if self.pk is not None:
                return hash(self.pk)
            return hash((self.app_label, self.model))

        ContentType.__hash__ = _ct_hash
