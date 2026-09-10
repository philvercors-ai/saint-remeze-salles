from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts.permissions import IsAgent

urlpatterns = [
    path("admin/", admin.site.urls),
    # API
    path("api/auth/", include("apps.accounts.urls")),
    path("api/rooms/", include("apps.rooms.urls")),
    path("api/reservations/", include("apps.reservations.urls")),
    path("api/manifestations/", include("apps.manifestations.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/rgpd/", include("apps.accounts.rgpd_urls")),
    # OpenAPI / Swagger — réservé aux agents/admin (expose toute la structure de l'API)
    path("api/schema/", SpectacularAPIView.as_view(permission_classes=[IsAgent]), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[IsAgent]), name="swagger-ui"),
    # Health check
    path("api/health/", include("apps.audit.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
