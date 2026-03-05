from rest_framework.permissions import BasePermission


class IsAgent(BasePermission):
    """Agent municipal ou admin."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("agent", "admin")


class IsAdmin(BasePermission):
    """Administrateur seulement."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class IsOwnerOrAgent(BasePermission):
    """Propriétaire de la ressource ou agent/admin."""
    def has_object_permission(self, request, view, obj):
        if request.user.role in ("agent", "admin"):
            return True
        user_field = getattr(obj, "user", None)
        return user_field == request.user
