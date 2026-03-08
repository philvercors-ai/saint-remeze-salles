from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed


class SilentJWTAuthentication(JWTAuthentication):
    """
    Comme JWTAuthentication, mais retourne None (anonyme) si le token est
    invalide ou expiré, au lieu de lever une exception 401.

    Cela permet aux endpoints AllowAny d'être accessibles même quand le client
    envoie un token périmé. Les endpoints protégés (IsAuthenticated) reçoivent
    toujours un 401 car l'utilisateur est traité comme anonyme.
    """

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (InvalidToken, AuthenticationFailed):
            return None
