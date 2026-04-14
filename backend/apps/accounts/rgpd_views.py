import csv
import json
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from services.email_service import EmailService
from .models import RGPDConsent
from .serializers import RGPDConsentSerializer


class MyDataView(APIView):
    """Export JSON de toutes les données personnelles (Art. 15 + 20 RGPD)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = self._collect_user_data(user)

        # Log du consentement export
        RGPDConsent.objects.create(
            user=user,
            consent_type="data_export",
            granted=True,
            ip_address=self._get_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            policy_version=settings.RGPD_POLICY_VERSION,
        )

        return Response(data)

    def _collect_user_data(self, user):
        reservations = [
            {
                "id": r.id,
                "salle": r.room.name,
                "titre": r.title,
                "association": r.association,
                "date": str(r.date),
                "debut": str(r.start_time),
                "fin": str(r.end_time),
                "participants": r.attendees,
                "statut": r.status,
                "cree_le": r.created_at.isoformat(),
            }
            for r in user.reservation_set.all()
        ] if hasattr(user, "reservation_set") else []

        manifestations = [
            {
                "id": m.id,
                "titre": m.title,
                "association": m.association,
                "date_debut": str(m.date_start),
                "date_fin": str(m.date_end),
                "lieu": m.location,
                "statut": m.status,
                "cree_le": m.created_at.isoformat(),
            }
            for m in user.manifestation_set.all()
        ] if hasattr(user, "manifestation_set") else []

        consents = [
            {
                "type": c.consent_type,
                "accepte": c.granted,
                "date": c.timestamp.isoformat(),
                "version_politique": c.policy_version,
            }
            for c in user.consents.all()
        ]

        return {
            "compte": {
                "id": user.id,
                "email": user.email,
                "prenom": user.first_name,
                "nom": user.last_name,
                "telephone": user.phone,
                "association": user.association,
                "role": user.role,
                "date_inscription": user.date_joined.isoformat(),
                "email_verifie": user.email_verified,
                "consentement_rgpd": user.rgpd_consent_date.isoformat() if user.rgpd_consent_date else None,
            },
            "reservations": reservations,
            "manifestations": manifestations,
            "consentements": consents,
            "export_genere_le": timezone.now().isoformat(),
        }

    def _get_ip(self, request):
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        return x_forwarded.split(",")[0].strip() if x_forwarded else request.META.get("REMOTE_ADDR")


class MyDataCSVView(MyDataView):
    """Export CSV des données personnelles (portabilité Art. 20 RGPD)."""

    def get(self, request):
        user = request.user
        data = self._collect_user_data(user)

        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="mes-donnees-saint-remeze.csv"'
        response.write("\ufeff")  # BOM UTF-8 pour Excel

        writer = csv.writer(response)

        # Compte
        writer.writerow(["=== INFORMATIONS DU COMPTE ==="])
        for key, value in data["compte"].items():
            writer.writerow([key, value])
        writer.writerow([])

        # Réservations
        writer.writerow(["=== MES RÉSERVATIONS ==="])
        if data["reservations"]:
            writer.writerow(data["reservations"][0].keys())
            for r in data["reservations"]:
                writer.writerow(r.values())
        writer.writerow([])

        # Manifestations
        writer.writerow(["=== MES MANIFESTATIONS ==="])
        if data["manifestations"]:
            writer.writerow(data["manifestations"][0].keys())
            for m in data["manifestations"]:
                writer.writerow(m.values())
        writer.writerow([])

        # Consentements
        writer.writerow(["=== CONSENTEMENTS RGPD ==="])
        writer.writerow(["Type", "Accordé", "Date", "Version politique"])
        for c in data["consentements"]:
            writer.writerow([c["type"], c["accepte"], c["date"], c["version_politique"]])

        return response


class RequestDeletionView(APIView):
    """Demande de suppression/anonymisation du compte (Art. 17 RGPD)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.deletion_requested_at:
            return Response(
                {"detail": "Une demande de suppression est déjà en cours."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.deletion_requested_at = timezone.now()
        user.save(update_fields=["deletion_requested_at"])

        RGPDConsent.objects.create(
            user=user,
            consent_type="data_delete",
            granted=True,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            policy_version=settings.RGPD_POLICY_VERSION,
        )

        EmailService.send_deletion_confirmation(user)

        return Response({
            "detail": (
                f"Votre demande de suppression a été enregistrée. "
                f"Votre compte sera anonymisé dans {settings.RGPD_DELETION_DELAY_DAYS} jours."
            )
        })


class ConsentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        consents = request.user.consents.all()
        return Response(RGPDConsentSerializer(consents, many=True).data)

    def post(self, request):
        serializer = RGPDConsentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PrivacyPolicyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "version": settings.RGPD_POLICY_VERSION,
            "derniere_mise_a_jour": "2026-01-01",
            "responsable_traitement": "Mairie de Saint Remèze",
            "contact_dpo": "dpo@saintremeze.fr",
            "traitements": [
                {
                    "nom": "Gestion des réservations",
                    "finalite": "Gestion des demandes de réservation de salles communales",
                    "base_legale": "Exécution d'un contrat (Art. 6.1.b RGPD)",
                    "duree_conservation": "5 ans (archives légales)",
                    "destinataires": "Agents municipaux de Saint Remèze",
                },
                {
                    "nom": "Gestion des comptes utilisateurs",
                    "finalite": "Authentification et accès aux services en ligne",
                    "base_legale": "Exécution d'un contrat (Art. 6.1.b RGPD)",
                    "duree_conservation": "36 mois d'inactivité puis anonymisation",
                    "destinataires": "Administrateurs système",
                },
                {
                    "nom": "Envoi d'emails",
                    "finalite": "Confirmations de réservation, notifications de statut",
                    "base_legale": "Intérêt légitime (Art. 6.1.f RGPD)",
                    "duree_conservation": "Logs conservés 1 an",
                    "destinataires": "Resend (sous-traitant, US, SCC en vigueur)",
                },
            ],
            "droits": [
                "Droit d'accès (Art. 15) : export de vos données disponible dans votre profil",
                "Droit de rectification (Art. 16) : modification du profil en ligne",
                "Droit à l'effacement (Art. 17) : demande de suppression depuis votre profil",
                "Droit à la portabilité (Art. 20) : export CSV disponible dans votre profil",
                "Droit d'opposition (Art. 21) : contact dpo@saintremeze.fr",
                "Réclamation CNIL : www.cnil.fr",
            ],
        })
