from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ManifestationViewSet

router = DefaultRouter()
router.register("", ManifestationViewSet, basename="manifestation")

urlpatterns = [path("", include(router.urls))]
