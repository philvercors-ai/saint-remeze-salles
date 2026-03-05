from django.http import JsonResponse
from django.urls import path
from django.db import connection


def health_check(request):
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False

    return JsonResponse({
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "error",
        "version": "1.0.0",
    }, status=200)  # Toujours 200 — Render exige 200 pour valider le health check


urlpatterns = [
    path("", health_check, name="health-check"),
]
