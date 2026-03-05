#!/usr/bin/env bash
# Script de build exécuté par Render avant chaque déploiement.
# Render le lance depuis le répertoire rootDir (backend/).
set -euo pipefail

echo "==> Installation des dépendances Python"
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Collecte des fichiers statiques"
python manage.py collectstatic --noinput

echo "==> Migrations MongoDB"
python manage.py migrate --noinput

echo "==> Chargement des fixtures initiales (ignoré si déjà présentes)"
python manage.py loaddata apps/rooms/fixtures.json apps/notifications/fixtures.json 2>/dev/null || true

echo "==> Build terminé"
