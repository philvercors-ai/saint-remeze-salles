"""
JSONRenderer personnalisé pour DRF + django-mongodb-backend.

bson.ObjectId n'est pas JSON-sérialisable par défaut. Les champs FK
retournent l'ObjectId brut via PrimaryKeyRelatedField.to_representation()
avant d'atteindre le serializer de champ — le fix doit être au niveau
du renderer JSON.
"""
import json
from bson import ObjectId
from rest_framework.renderers import JSONRenderer


class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)


class MongoJSONRenderer(JSONRenderer):
    encoder_class = MongoJSONEncoder
