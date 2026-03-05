from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser, RGPDConsent, PasswordResetToken


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT login qui vérifie l'email validé et enrichit le token."""

    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.email_verified:
            raise serializers.ValidationError(
                {"email": "Veuillez vérifier votre adresse email avant de vous connecter."}
            )
        data["user"] = UserProfileSerializer(self.user).data
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    rgpd_consent = serializers.BooleanField(write_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "email", "first_name", "last_name", "phone", "association",
            "password", "password_confirm", "rgpd_consent",
        ]

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})
        if not data.get("rgpd_consent"):
            raise serializers.ValidationError({"rgpd_consent": "Vous devez accepter la politique de confidentialité."})
        return data

    def create(self, validated_data):
        from django.utils import timezone
        validated_data.pop("password_confirm")
        validated_data.pop("rgpd_consent")
        email = validated_data["email"]
        user = CustomUser.objects.create_user(
            username=email,
            email=email,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            phone=validated_data.get("phone", ""),
            association=validated_data.get("association", ""),
            password=validated_data["password"],
            email_verified=False,
            rgpd_consent_date=timezone.now(),
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "phone", "association", "role", "email_verified",
            "rgpd_consent_date", "date_joined",
        ]
        read_only_fields = ["id", "email", "role", "email_verified", "date_joined", "rgpd_consent_date"]

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["first_name", "last_name", "phone", "association"]


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
    new_password_confirm = serializers.CharField()

    def validate(self, data):
        if data["new_password"] != data["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Les mots de passe ne correspondent pas."})
        return data


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(validators=[validate_password])
    password_confirm = serializers.CharField()

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})
        try:
            reset_token = PasswordResetToken.objects.select_related("user").get(token=data["token"])
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({"token": "Token invalide."})
        if not reset_token.is_valid:
            raise serializers.ValidationError({"token": "Token expiré ou déjà utilisé."})
        data["reset_token"] = reset_token
        return data


class RGPDConsentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RGPDConsent
        fields = ["id", "consent_type", "granted", "timestamp", "policy_version"]
        read_only_fields = ["id", "timestamp"]

    def create(self, validated_data):
        request = self.context["request"]
        return RGPDConsent.objects.create(
            user=request.user,
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            policy_version=settings.RGPD_POLICY_VERSION,
            **validated_data,
        )

    def _get_client_ip(self, request):
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded:
            return x_forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")
