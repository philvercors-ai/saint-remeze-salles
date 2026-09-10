"""
Charge les fixtures initiales (salles, services municipaux) — uniquement
lors du tout premier déploiement sur une base vide, jamais ensuite.

Bug corrigé : le startCommand (Render + docker-compose) exécutait
`loaddata apps/rooms/fixtures.json` à CHAQUE redémarrage du service, y
compris sur une base déjà peuplée. `loaddata` réinsère chaque objet avec
son pk fixe s'il n'existe plus — une salle supprimée intentionnellement
par un administrateur (ex. "Salle des Fêtes", "Salle Polyvalente",
"Terrain de Sport") réapparaissait donc à chaque redéploiement/restart.

Idempotent : ne recharge une fixture que si la collection correspondante
est totalement vide (première initialisation), jamais si elle contient
déjà au moins un enregistrement (même un seul, ajouté ou laissé par un
administrateur).
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.notifications.models import MunicipalService
from apps.rooms.models import Room


class Command(BaseCommand):
    help = "Charge les fixtures initiales une seule fois, sur une base vide uniquement"

    def handle(self, *args, **options):
        if Room.objects.exists():
            self.stdout.write("load_initial_fixtures: salles déjà présentes, ignoré.")
        else:
            call_command("loaddata", "apps/rooms/fixtures.json")
            self.stdout.write(self.style.SUCCESS(
                "load_initial_fixtures: salles chargées (première initialisation)."
            ))

        if MunicipalService.objects.exists():
            self.stdout.write("load_initial_fixtures: services municipaux déjà présents, ignoré.")
        else:
            call_command("loaddata", "apps/notifications/fixtures.json")
            self.stdout.write(self.style.SUCCESS(
                "load_initial_fixtures: services municipaux chargés (première initialisation)."
            ))
