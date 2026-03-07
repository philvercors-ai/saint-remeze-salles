"""
Corrige l'historique des migrations MongoDB pour les déploiements initiaux.

Problème : admin.0001_initial a été appliqué dans MongoDB avant que
accounts/migrations/ existait dans le repo. Django détecte maintenant
une InconsistentMigrationHistory.

Solution : enregistrer accounts.0001_initial via MigrationRecorder
directement, sans passer par `migrate` qui vérifie la cohérence d'abord.
Idempotent — ne fait rien si la migration est déjà enregistrée.
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder


class Command(BaseCommand):
    help = "Enregistre les migrations initiales manquantes (fix cohérence MongoDB)"

    MISSING = [
        ("accounts", "0001_initial"),
    ]

    def handle(self, *args, **options):
        recorder = MigrationRecorder(connection)
        recorder.ensure_schema()
        applied = recorder.applied_migrations()
        for app, name in self.MISSING:
            if (app, name) not in applied:
                recorder.record_applied(app, name)
                self.stdout.write(f"fix_migration_history: {app}.{name} marquée appliquée.")
            else:
                self.stdout.write(f"fix_migration_history: {app}.{name} déjà appliquée, ignorée.")
