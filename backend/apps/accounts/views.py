import logging

from django.conf import settings
from django.contrib.auth import update_session_auth_hash
from rest_framework import status

logger = logging.getLogger(__name__)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from services.email_service import EmailService
from .models import CustomUser, RGPDConsent, PasswordResetToken
from .serializers import (
    RegisterSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    RGPDConsentSerializer,
    CustomTokenObtainPairSerializer,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Enregistre le consentement RGPD
        RGPDConsent.objects.create(
            user=user,
            consent_type="registration",
            granted=True,
            ip_address=self._get_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            policy_version=settings.RGPD_POLICY_VERSION,
        )

        # Envoie email de vérification
        token = user.generate_email_verify_token()
        email_sent = EmailService.send_email_verification(user, token)
        if not email_sent:
            logger.error(
                "[REGISTER] Email de vérification NON envoyé pour %s — "
                "vérifier RESEND_API_KEY et FROM_EMAIL (%s) dans les variables d'environnement.",
                user.email, settings.DEFAULT_FROM_EMAIL,
            )

        return Response(
            {"detail": "Compte créé. Vérifiez votre email pour activer votre compte."},
            status=status.HTTP_201_CREATED,
        )

    def _get_ip(self, request):
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded:
            return x_forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"detail": "Token manquant."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email_verify_token=token, email_verified=False)
        except CustomUser.DoesNotExist:
            return Response({"detail": "Token invalide ou déjà utilisé."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_email_token_valid:
            return Response({"detail": "Token expiré. Demandez un nouvel email de vérification."}, status=status.HTTP_400_BAD_REQUEST)

        user.email_verified = True
        user.email_verify_token = ""
        user.save(update_fields=["email_verified", "email_verify_token"])

        # Génère JWT directement
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserProfileSerializer(user).data,
        })


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    # AllowAny : aucune opération serveur réelle (pas de blacklist JWT,
    # incompatible MongoDB). La sécurité repose sur la courte durée de
    # l'access token (15 min) et la rotation des refresh tokens.
    # IsAuthenticated causait un 401 inutile si le token était expiré.
    permission_classes = [AllowAny]

    def post(self, request):
        return Response({"detail": "Déconnexion réussie."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["current_password"]):
            return Response({"current_password": "Mot de passe actuel incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        EmailService.send_password_changed(request.user)
        return Response({"detail": "Mot de passe modifié avec succès."})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        # Réponse identique que l'email existe ou non (anti-énumération)
        try:
            user = CustomUser.objects.get(email=email, is_active=True)
            reset_token = PasswordResetToken.create_for_user(user)
            EmailService.send_password_reset(user, reset_token.token)
        except CustomUser.DoesNotExist:
            pass

        return Response({"detail": "Si cet email existe, un lien de réinitialisation vous a été envoyé."})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reset_token = serializer.validated_data["reset_token"]
        user = reset_token.user
        user.set_password(serializer.validated_data["password"])
        user.save()

        reset_token.used = True
        reset_token.save(update_fields=["used"])

        EmailService.send_password_changed(user)
        return Response({"detail": "Mot de passe réinitialisé. Vous pouvez maintenant vous connecter."})


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        try:
            user = CustomUser.objects.get(email=email, email_verified=False)
            token = user.generate_email_verify_token()
            EmailService.send_email_verification(user, token)
        except CustomUser.DoesNotExist:
            pass
        return Response({"detail": "Si un compte non vérifié existe, un email a été envoyé."})
