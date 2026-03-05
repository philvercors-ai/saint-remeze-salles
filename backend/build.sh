#!/usr/bin/env bash
# Script de build exécuté par Render avant chaque déploiement.
# Render le lance depuis le répertoire rootDir (backend/).
set -euo pipefail

echo "==> Installation des dépendances Python"
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Collecte des fichiers statiques"
python manage.py collectstatic --noinput

# Les migrations et fixtures sont exécutées au démarrage (startCommand)
# car MONGODB_URI doit être disponible à ce moment-là.

echo "==> Build terminé"
