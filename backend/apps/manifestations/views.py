import csv

from django.http import HttpResponse
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsAgent, IsOwnerOrAgent
from .models import Manifestation
from .serializers import ManifestationSerializer, ManifestationAdminSerializer, ManifestationApproveSerializer


class ManifestationViewSet(viewsets.ModelViewSet):
    queryset = Manifestation.objects.select_related("user", "reviewed_by").all()

    def get_serializer_class(self):
        if self.request.user.is_authenticated and self.request.user.role in ("agent", "admin"):
            return ManifestationAdminSerializer
        return ManifestationSerializer

    def get_permissions(self):
        if self.action in ("approve", "reject", "export_csv"):
            return [IsAgent()]
        if self.action in ("update", "partial_update", "destroy", "retrieve", "my"):
            return [IsOwnerOrAgent()]
        if self.action == "list":
            return [AllowAny()]
        return [AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        # Public : seulement les manifestations approuvées
        if not (self.request.user.is_authenticated and self.request.user.role in ("agent", "admin")):
            if self.action == "list":
                qs = qs.filter(status="approved")

        status_param = self.request.query_params.get("status")
        if status_param and self.request.user.is_authenticated:
            qs = qs.filter(status=status_param)

        return qs

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my(self, request):
        qs = Manifestation.objects.filter(user=request.user).order_by("-created_at")
        return Response(ManifestationSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAgent])
    def approve(self, request, pk=None):
        obj = self.get_object()
        s = ManifestationApproveSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if obj.status != "pending":
            return Response({"detail": "Seules les demandes en attente peuvent être approuvées."}, status=status.HTTP_400_BAD_REQUEST)
        obj.approve(request.user, s.validated_data.get("comment", ""))
        return Response(ManifestationAdminSerializer(obj).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAgent])
    def reject(self, request, pk=None):
        obj = self.get_object()
        s = ManifestationApproveSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if obj.status != "pending":
            return Response({"detail": "Seules les demandes en attente peuvent être refusées."}, status=status.HTTP_400_BAD_REQUEST)
        obj.reject(request.user, s.validated_data.get("comment", ""))
        return Response(ManifestationAdminSerializer(obj).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAgent])
    def export_csv(self, request):
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = "attachment; filename=manifestations.csv"
        response.write("\ufeff")
        writer = csv.writer(response)
        writer.writerow(["ID", "Titre", "Association", "Contact", "Email", "Date début", "Date fin", "Lieu", "Participants", "Budget", "Statut"])
        for m in self.get_queryset():
            writer.writerow([m.id, m.title, m.association, m.contact_name, m.contact_email, m.date_start, m.date_end, m.location, m.expected_attendees, m.budget, m.get_status_display()])
        return response
