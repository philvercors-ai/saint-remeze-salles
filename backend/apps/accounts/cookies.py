"""
Le refresh token JWT est transporté dans un cookie httpOnly plutôt que dans le
corps JSON — inaccessible à JavaScript, donc invulnérable au vol par XSS
(contrairement au stockage en localStorage utilisé jusqu'à la v1.9.0).

Le frontend et le backend sont sur des sous-domaines *.onrender.com distincts,
traités comme des sites différents par les navigateurs (onrender.com fait
partie de la Public Suffix List) : le cookie doit donc être SameSite=None
en production pour être transmis sur les requêtes cross-site, ce qui impose
Secure=True (obligatoire par les navigateurs dès que SameSite=None est utilisé).
"""
from django.conf import settings

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/auth/"
REFRESH_COOKIE_MAX_AGE = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())


def set_refresh_cookie(response, token: str):
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )


def clear_refresh_cookie(response):
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
