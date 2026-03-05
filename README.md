# Saint-Rémèze — Salles Communales

Application fullstack de gestion des réservations de salles communales.

## Stack

- **Backend** : Python 3.12 + Django 5.1 + DRF + PostgreSQL 16
- **Frontend** : React 18 + Vite 5 + PWA (installable)
- **Emails** : Resend API
- **Async** : Celery + Redis
- **Déploiement** : Docker Compose + Nginx + Let's Encrypt

## Démarrage rapide (développement)

### Prérequis
- Docker Desktop
- Node.js 20+ (pour le frontend en dev)

### 1. Configuration

```bash
cp .env.example .env
# Éditez .env avec vos valeurs (POSTGRES_PASSWORD, DJANGO_SECRET_KEY, RESEND_API_KEY)
```

### 2. Démarrer le backend

```bash
docker-compose up db redis backend -d
```

### 3. Créer le superutilisateur

```bash
docker-compose exec backend python manage.py createsuperuser
# Ou avec le script :
docker-compose exec backend python manage.py shell < scripts/create_superuser.py
```

### 4. Démarrer le frontend en mode dev

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Déploiement production

### 1. Sur le VPS

```bash
git clone ... saint-remeze-salles
cd saint-remeze-salles
cp .env.example .env
# Éditez .env
```

### 2. SSL avec Let's Encrypt (première fois)

```bash
# Démarrez d'abord Nginx en mode HTTP seul
docker-compose up nginx certbot -d

# Obtenez le certificat
docker-compose exec certbot certbot certonly --webroot \
  -w /var/www/certbot \
  -d salles.saint-remeze.fr \
  --email admin@saint-remeze.fr \
  --agree-tos --non-interactive
```

### 3. Démarrer toute l'application

```bash
docker-compose up -d --build
```

### 4. Charger les données initiales

Les fixtures (salles et services municipaux) sont chargées automatiquement au démarrage.

## Structure des rôles

| Rôle | Accès |
|------|-------|
| `citoyen` | Consultation, formulaires de réservation/manifestation |
| `agent` | + Approbation/refus, notifications services |
| `admin` | + Gestion des salles, exports, audit |

## API Documentation

Swagger UI disponible sur : `https://salles.saint-remeze.fr/api/docs/`

## RGPD

- Consentement explicite à l'inscription
- Bannière cookies
- Export des données (JSON/CSV) depuis le profil
- Droit à l'oubli (anonymisation différée 30 jours)
- Auto-anonymisation après 36 mois d'inactivité (tâche Celery)
- Contact DPO : dpo@saint-remeze.fr

## Générer les icônes PWA

```bash
cd frontend
# Placez votre logo source dans public/icons/source.png (512x512 minimum)
npm run generate-icons
```
