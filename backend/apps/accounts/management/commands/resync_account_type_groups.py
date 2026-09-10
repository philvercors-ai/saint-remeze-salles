"""
Ajoute chaque utilisateur au groupe de réservation ("Particulier" ou
"Association") correspondant à son account_type actuel, s'il n'y est pas déjà
— purement additif (CustomUser.ensure_account_type_group()), jamais de
retrait. Sans danger à exécuter à chaque démarrage : ne peut jamais défaire un
second groupe accordé manuellement à un utilisateur (ex. élu du Conseil
Municipal coché à la fois "Particulier" et "Association").

Pourquoi c'est nécessaire : avant correction, un utilisateur créé ou modifié
sans passer par l'inscription (création directe via Django Admin, ou
account_type édité sans que le groupe associé ne soit mis à jour) pouvait se
retrouver sans aucun groupe de réservation, et donc facturé au tarif par
défaut (particulier) même si son compte est enregistré comme association —
le tarif affiché ne correspondait alors plus au profil. Cette commande
rattrape ces cas au démarrage, en plus des resyncs désormais déclenchés à
l'inscription et à chaque modification d'account_type (profil, Django Admin).
"""
from django.core.management.base import BaseCommand

from apps.accounts.models import CustomUser


class Command(BaseCommand):
    help = "Ajoute chaque utilisateur au groupe de réservation correspondant à son account_type, si absent (additif, sans effet de bord)"

    def handle(self, *args, **options):
        count = 0
        for user in CustomUser.objects.all():
            user.ensure_account_type_group()
            count += 1
        self.stdout.write(self.style.SUCCESS(
            f"resync_account_type_groups: {count} utilisateur(s) vérifié(s)."
        ))
