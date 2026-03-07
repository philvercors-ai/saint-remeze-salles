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

    def ready(self):
        super().ready()
        # Patch DRF field mapping : ObjectIdAutoField → CharField
        # (DRF mappe AutoField → IntegerField par défaut, int(bson.ObjectId) lève TypeError)
        try:
            from rest_framework import serializers
            from django_mongodb_backend.fields import ObjectIdAutoField
            serializers.ModelSerializer.serializer_field_mapping[ObjectIdAutoField] = (
                serializers.CharField
            )
        except ImportError:
            pass


class AuthConfig(_AuthConfig):
    default_auto_field = _MONGO


class ContentTypesConfig(_ContentTypesConfig):
    default_auto_field = _MONGO
