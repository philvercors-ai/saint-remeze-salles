"""
Wrappers AppConfig pour les apps Django built-in.

Django lit DEFAULT_AUTO_FIELD comme fallback, mais django-mongodb-backend
exige que le champ soit défini explicitement sur le AppConfig pour les apps
qui ne le déclarent pas (admin, auth, contenttypes).

Ces classes remplacent "django.contrib.admin/auth/contenttypes" dans
INSTALLED_APPS — elles héritent du comportement complet (auto-discovery, etc.)
en ajoutant seulement default_auto_field = ObjectIdAutoField.
"""
import sys

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
        # Workaround django-mongodb-backend : create_permissions (signal post_migrate
        # de django.contrib.auth) utilise les modèles "fake" historiques
        # (__fake__.ContentType) dont les PKs ObjectId ne sont pas encore assignés.
        # set(ctypes.values()) lève TypeError car ces instances sont unhashable.
        #
        # Solution : on remplace le handler par une version qui passe `apps=real_apps`
        # (le vrai registre) au lieu des apps historiques, pour que ContentType.objects
        # interroge MongoDB avec les vrais modèles et obtienne des PKs réels.
        from django.apps import apps as real_apps
        from django.contrib.auth.management import create_permissions
        from django.db.models.signals import post_migrate

        _UID = "django.contrib.auth.management.create_permissions"

        def safe_create_permissions(sender, **kwargs):
            kwargs["apps"] = real_apps
            try:
                create_permissions(sender, **kwargs)
            except Exception as exc:
                print(
                    f"[COMPAT] safe_create_permissions non-fatal error: {exc}",
                    file=sys.stderr,
                    flush=True,
                )

        # AuthConfig.ready() a déjà connecté create_permissions avec ce dispatch_uid.
        # On le remplace par notre wrapper.
        post_migrate.disconnect(dispatch_uid=_UID)
        post_migrate.connect(safe_create_permissions, dispatch_uid=_UID)
