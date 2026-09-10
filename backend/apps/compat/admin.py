"""
Wrappers Django Admin pour compatibilité MongoDB.
"""


class MongoBulkDeleteMixin:
    """L'action native "Supprimer les éléments sélectionnés" de Django Admin
    appelle QuerySet.delete() sur la sélection en une seule requête groupée —
    non supporté par django-mongodb-backend :
    "Cannot use QuerySet.delete() when querying across multiple collections
    on MongoDB." (même famille de limitation que prefetch_related, voir
    MANUEL_ADMIN_BACKEND.md). Supprimer chaque objet individuellement
    fonctionne : c'est un DELETE simple par _id, pas une requête groupée."""

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            obj.delete()
