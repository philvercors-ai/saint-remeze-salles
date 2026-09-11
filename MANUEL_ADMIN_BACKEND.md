# Manuel Administrateur & Backend — Salles Communales de Saint Remèze

> Documentation technique à l'usage des administrateurs système et développeurs
> Version 1.12.1 — Septembre 2026
> Consultable aussi dans l'application via l'icône « Manuel administrateur » du bandeau (réservée au rôle admin, rendu à `/manuel-admin`).

---

## Table des matières

1. [Architecture technique](#1-architecture-technique)
2. [Installation et démarrage](#2-installation-et-démarrage)
3. [Variables d'environnement](#3-variables-denvironnement)
4. [Django Admin (/admin/)](#4-django-admin-admin)
5. [API REST — Référence complète](#5-api-rest--référence-complète)
6. [Gestion des salles](#6-gestion-des-salles)
7. [Gestion des utilisateurs et rôles](#7-gestion-des-utilisateurs-et-rôles)
8. [Workflow de validation des demandes](#8-workflow-de-validation-des-demandes)
9. [Tâches planifiées Celery (RGPD)](#9-tâches-planifiées-rgpd--redis-celery-et-automatisation)
10. [Service email (Resend)](#10-service-email-resend)
10-bis. [Mise en place des emails en production](#10-bis-mise-en-place-des-emails-en-production-resend)
11. [Journal d'audit](#11-journal-daudit)
12. [Sécurité et JWT](#12-sécurité-et-jwt)
13. [Déploiement Docker](#13-déploiement-docker)
14. [Déploiement Render (cloud)](#14-déploiement-render-cloud)
15. [Opérations de maintenance](#15-opérations-de-maintenance)
16. [Architecture globale — portail et applications](#16-architecture-globale--portail-et-applications)
17. [Lexique technique — traduction en français](#17-lexique-technique--traduction-et-explication-en-français)

---

## 1. Architecture technique

### Vue d'ensemble — déploiement Docker local

En développement local ou sur un VPS avec Docker, tous les services tournent ensemble derrière Nginx :

```
  Navigateur / Application mobile
            │
            ▼
   ┌─────────────────┐
   │     Nginx       │  :80 (HTTP) / :443 (HTTPS + SSL Let's Encrypt)
   │  (reverse proxy)│  Aiguille les requêtes selon l'URL
   └────────┬────────┘
            │
      /api/* │                   /* (tout le reste)
            │                         │
            ▼                         ▼
   ┌─────────────────┐       ┌─────────────────┐
   │    Backend      │       │    Frontend      │
   │  Django / DRF   │       │  React / Vite    │
   │  Gunicorn :8000 │       │  (PWA statique)  │
   └────────┬────────┘       └─────────────────┘
            │
     ┌──────┼──────────────┐
     ▼      ▼              ▼
┌────────┐ ┌────────┐ ┌──────────────┐
│MongoDB │ │ Redis  │ │    Celery    │
│        │ │        │ │  worker+beat │
│Stockage│ │Boîte   │ │Tâches RGPD  │
│données │ │lettres │ │planifiées   │
└────────┘ └────────┘ └──────────────┘
```

### Vue d'ensemble — déploiement Render (cloud, production)

Sur Render, il n'y a **pas de Nginx** : c'est Render qui assure le routage et le SSL. Le frontend est un site statique indépendant du backend.

```
  Navigateur / Application mobile
            │
   ┌────────┴──────────────────────────┐
   │          Render (infrastructure)  │
   │  SSL automatique + routing HTTPS  │
   └──────┬──────────────┬─────────────┘
          │              │
          ▼              ▼
  salles.saint-remeze.fr/api/*    salles.saint-remeze.fr/*
          │              │
          ▼              ▼
  ┌──────────────┐  ┌───────────────┐
  │  Web Service  │  │  Static Site  │
  │  Django/DRF   │  │  React/Vite   │
  │  Gunicorn     │  │  (PWA)        │
  │  WhiteNoise   │  └───────────────┘
  └──────┬────────┘
         │
  ┌──────┼────────────────┐
  ▼      ▼                ▼
┌──────────────┐  ┌──────┐  ┌───────────────┐
│ MongoDB Atlas│  │Redis │  │ Celery worker │
│  (cloud M0)  │  │Upst. │  │ (optionnel,   │
│              │  │(free)│  │  plan payant) │
└──────────────┘  └──────┘  └───────────────┘
```

---

### Rôle de chaque outil — explications en français

#### Django + Django REST Framework (DRF)
**Ce que c'est :** Django est le **framework web** principal écrit en Python. Il gère toute la logique de l'application : les routes URL, les règles métier, la sécurité, l'accès à la base de données.

**Ce qu'il fait concrètement ici :**
- Reçoit les requêtes HTTP (ex : "affiche les réservations de la semaine")
- Vérifie que l'utilisateur est authentifié et a le bon rôle
- Interroge MongoDB pour récupérer ou enregistrer les données
- Renvoie la réponse JSON au frontend

Django REST Framework (DRF) est une extension de Django qui facilite la création d'une **API REST** : c'est lui qui transforme les données en JSON, gère la pagination, les filtres, et génère la documentation Swagger automatiquement.

> Sans Django, il n'y a pas d'application — c'est le cœur du système.

---

#### MongoDB
**Ce que c'est :** MongoDB est la **base de données** de l'application. C'est là que toutes les données sont stockées de façon permanente.

**Ce qu'il stocke concrètement ici :**
- Les comptes utilisateurs (email, mot de passe hashé, rôle, téléphone…)
- Les salles communales (nom, capacité, équipements, tarif…)
- Les réservations (qui réserve quoi, quand, statut, commentaires…)
- Les manifestations, les notifications, le journal d'audit

MongoDB est une base de données dite **NoSQL** : contrairement à PostgreSQL ou MySQL, elle stocke les données sous forme de **documents JSON** (appelés BSON) plutôt que dans des tableaux avec des lignes et colonnes. Cela offre plus de flexibilité pour des structures de données variables.

**Pourquoi MongoDB et pas PostgreSQL ?** Ce projet utilise le driver `django-mongodb-backend` qui permet à Django — habituellement conçu pour des bases relationnelles — de fonctionner avec MongoDB. En local, MongoDB tourne dans Docker. En production sur Render, c'est **MongoDB Atlas** (service cloud géré) qui est utilisé.

> Sans MongoDB, aucune donnée n'est persistée — tout se perd au redémarrage.

> ⚠️ La migration de MongoDB impose deux contraintes : `token_blacklist` (blackliste JWT) et `django_celery_beat` (planificateur Celery en base) sont **désactivés** car ils utilisent des types de champs incompatibles avec MongoDB. Voir les commentaires dans `base.py`.

---

#### Redis
**Ce que c'est :** Redis est une **base de données en mémoire** ultra-rapide, utilisée ici comme **intermédiaire de communication** entre Django et Celery.

**Comment ça fonctionne concrètement :**
Quand Django veut lancer une tâche en arrière-plan (ex : "anonymise cet utilisateur dans 30 jours"), il ne l'exécute pas lui-même. Il **dépose un message** dans Redis, comme une lettre dans une boîte aux lettres. Celery lit cette boîte, prend la lettre et exécute la tâche.

```
Django               Redis               Celery
  │                    │                    │
  │── "fais tâche X" ─►│                    │
  │                    │── "voilà tâche X" ─►│
  │                    │                    │── exécute X
```

Redis stocke également les **résultats** des tâches Celery.

> Sans Redis, Celery ne peut pas recevoir de tâches et ne fonctionne pas.
> En local : Redis tourne dans Docker. En production : **Upstash Redis** (service cloud gratuit).

---

#### Celery (worker + beat)
**Ce que c'est :** Celery est le **gestionnaire de tâches asynchrones**. Il exécute des opérations en arrière-plan, sans bloquer Django, et peut les planifier à des horaires précis.

**Ce qu'il fait concrètement ici :**
- Exécute les tâches RGPD automatiquement (anonymisation des comptes inactifs ou supprimés)
- Peut envoyer des emails en différé sans ralentir la réponse API

Celery se compose de deux parties qui tournent dans le même processus (commande `-B`) :
- **Celery Worker** : exécute les tâches dès qu'elles arrivent dans Redis
- **Celery Beat** : le planificateur — il déclenche les tâches récurrentes aux heures programmées (ex : "tous les jours à 2h, lance l'anonymisation")

> Sans Celery, les tâches RGPD planifiées ne s'exécutent jamais automatiquement.
> En local : Celery tourne dans un conteneur Docker séparé. Sur Render Free, il **n'est pas disponible** — les tâches doivent être déclenchées manuellement.

---

#### Gunicorn
**Ce que c'est :** Gunicorn (Green Unicorn) est le **serveur WSGI** qui fait tourner Django en production.

Django tout seul (`runserver`) ne peut gérer qu'une seule requête à la fois — c'est suffisant en développement mais pas en production. Gunicorn lance **plusieurs processus workers** en parallèle, chacun capable de traiter une requête indépendamment.

```
                    Gunicorn
               ┌───────────────┐
  Requête 1 ──►│  Worker 1     │  (Django)
  Requête 2 ──►│  Worker 2     │  (Django)
  Requête 3 ──►│  Worker 3     │  (Django)
               └───────────────┘
```

> Sans Gunicorn, Django ne peut pas tourner en production de façon fiable.

---

#### Nginx (déploiement Docker uniquement)
**Ce que c'est :** Nginx est le **serveur web / reverse proxy** qui se trouve devant tous les autres services.

**Ce qu'il fait concrètement ici :**
- Reçoit toutes les requêtes entrantes (port 80/443)
- Redirige `/api/*` vers Gunicorn (backend Django)
- Sert directement les fichiers du frontend React (HTML, CSS, JS)
- Gère le **SSL/HTTPS** avec les certificats Let's Encrypt
- Sert les fichiers statiques Django (`/static/`) et médias (`/media/`)

> Nginx est présent **uniquement en déploiement Docker**. Sur Render, c'est l'infrastructure Render qui joue ce rôle.

---

#### WhiteNoise (déploiement Render uniquement)
**Ce que c'est :** WhiteNoise est un **middleware Django** qui permet à Django de servir lui-même ses fichiers statiques (CSS, JS, images) sans avoir besoin de Nginx.

Sur Render, il n'y a pas de Nginx pour servir les fichiers statiques du backend (`/static/`). WhiteNoise comble ce manque : il intercepte les requêtes vers les fichiers statiques directement dans Django, avec compression automatique.

> Sans WhiteNoise sur Render, l'interface Django Admin serait sans CSS/JS.

---

#### Resend (service email externe)
**Ce que c'est :** Resend est le **service d'envoi d'emails** utilisé par l'application. C'est un service cloud externe (SaaS).

Django délègue tous les envois d'emails à l'API Resend (via `services/email_service.py`). Resend se charge de la délivrabilité, du suivi des envois, et de la gestion du domaine SPF/DKIM.

**Emails envoyés via Resend :** vérification d'email à l'inscription, confirmation/refus de réservation, réinitialisation de mot de passe, avertissements RGPD.

> Sans Resend configuré, les emails ne sont pas envoyés (ou uniquement à l'adresse du compte Resend en mode test). Voir section 10-bis.

---

#### Let's Encrypt / Certbot (déploiement Docker uniquement)
**Ce que c'est :** Let's Encrypt est une **autorité de certification gratuite** qui émet des certificats SSL. Certbot est l'outil automatique qui renouvelle ces certificats.

En déploiement Docker, un conteneur `certbot` tourne en permanence et renouvelle automatiquement le certificat SSL toutes les 12 heures (si nécessaire). Le certificat est partagé avec Nginx via un volume Docker.

> Sur Render, le SSL est géré automatiquement par la plateforme — Let's Encrypt n'est pas nécessaire.

---

### Stack technique complète

| Composant | Technologie | Version | Environnement |
|---|---|---|---|
| Framework web | Django | ≥ 5.2 | Tous |
| API REST | Django REST Framework | ≥ 3.15 | Tous |
| Authentification JWT | djangorestframework-simplejwt | ≥ 5.3 | Tous |
| Base de données | MongoDB (via django-mongodb-backend) | 7 | Tous |
| Driver MongoDB | django-mongodb-backend | ≥ 5.2 | Tous |
| File de tâches | Celery | ≥ 5.4 | Tous |
| Broker de messages | Redis | 7 | Tous |
| Fichiers statiques (cloud) | WhiteNoise | ≥ 6.7 | Render |
| Emails | Resend API | ≥ 2.0 | Tous |
| Serveur WSGI | Gunicorn | ≥ 22 | Tous |
| Reverse proxy | Nginx Alpine | — | Docker uniquement |
| Certificat SSL | Let's Encrypt / Certbot | — | Docker uniquement |
| Documentation API | drf-spectacular (OpenAPI) | ≥ 0.27 | Tous |

> ⚠️ **Note MongoDB :** deux modules Django standards sont **désactivés** pour cause d'incompatibilité avec MongoDB :
> - `rest_framework.authtoken` / `token_blacklist` → la sécurité JWT repose sur la courte durée de vie des access tokens (15 min) et la rotation des refresh tokens
> - `django_celery_beat` → Celery Beat utilise le planificateur en mémoire (`PersistentScheduler`) avec un fichier `celerybeat-schedule`
>
> **`QuerySet.prefetch_related()` n'est pas supporté** par `django-mongodb-backend` (`NotSupportedError` à l'exécution) — contrairement à `select_related()`, qui fonctionne normalement. Sur une relation ManyToMany ou une FK inverse consultée en boucle (ex : `room.allowed_groups.exists()` par salle dans une liste), chaque accès reste donc une requête séparée ; pas de solution d'optimisation équivalente à ce jour sur ce backend.
>
> **Un singleton Django classique (`self.pk = 1` forcé dans `save()`) casse aussi** sur ce backend : la clé primaire (`ObjectIdAutoField`) rejette un entier comme "1" (`ValidationError: "1" is not a valid Object Id`) — même famille de piège que les PK entiers dans les fixtures (section Dépannage). Pour un modèle singleton (ex. `ManifestationSettings`), utiliser un champ dédié `unique=True` (ex. `key`) comme clé de `get_or_create()`, jamais le pk.
>
> **L'action native Django Admin « Supprimer les éléments sélectionnés » (suppression groupée) ne fonctionne sur aucun modèle** sur ce backend : `QuerySet.delete()` lève `NotSupportedError: Cannot use QuerySet.delete() when querying across multiple collections on MongoDB.` — plantage en 500 dès qu'on sélectionne une ou plusieurs lignes et qu'on confirme la suppression groupée, sur n'importe quel modèle (constaté sur Réservations, reproductible partout). Corrigé une bonne fois via `apps/compat/admin.MongoBulkDeleteMixin` (supprime chaque objet individuellement au lieu d'un `queryset.delete()` groupé), appliqué à tous les `ModelAdmin` du projet. **Pour un nouveau modèle admin à l'avenir : hériter aussi de ce mixin**, sinon la suppression groupée replantera.

---

### Applications Django

```
backend/
├── config/
│   ├── settings/
│   │   ├── base.py          # Paramètres communs (MongoDB, JWT, Celery, RGPD)
│   │   ├── development.py   # Dev local (DEBUG=True, CORS open)
│   │   └── production.py    # Production (HTTPS forcé, logs JSON, CORS restrictif)
│   ├── urls.py              # Routage principal
│   ├── celery.py            # Config Celery + planification Beat
│   └── wsgi.py              # Point d'entrée Gunicorn
└── apps/
    ├── accounts/            # Utilisateurs, auth JWT, RGPD, réinitialisation MDP
    ├── rooms/               # Salles communales (CRUD, disponibilité, fixtures)
    ├── reservations/        # Réservations (workflow, récurrence, anti-chevauchement)
    ├── manifestations/      # Dossiers de manifestation (GPS, budget, équipements)
    ├── notifications/       # Services municipaux + historique des envois
    ├── audit/               # Journal d'audit (toutes les actions API)
    └── compat/              # Adaptateurs MongoDB (auto_field, renderer JSON, auth)
```

---

## 2. Installation et démarrage

### Développement local

**Prérequis** : Docker, Docker Compose, Python 3.12+

```bash
# Cloner le dépôt
git clone <repo>
cd saint-remeze-salles

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs (voir section 3)

# Démarrer tous les services
docker compose up -d

# Créer un superutilisateur Django admin
docker compose exec backend python manage.py createsuperuser

# Charger les données initiales (salles + services municipaux)
docker compose exec backend python manage.py loaddata \
  apps/rooms/fixtures.json \
  apps/notifications/fixtures.json
```

L'application est disponible sur `http://localhost`.
L'API Django admin sur `http://localhost/admin/`.

### Sans Docker (backend seul)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Variables d'environnement
export DJANGO_SETTINGS_MODULE=config.settings.development
export MONGODB_URI=mongodb://localhost:27017/saint_remeze
export SECRET_KEY=dev-secret-key

# Migrations et démarrage
python manage.py migrate
python manage.py runserver

# Worker Celery (dans un autre terminal)
celery -A config worker -B --loglevel=info
```

### Vérification de santé

```bash
curl http://localhost/api/health/
# Réponse attendue : {"status": "ok"}
```

---

## 3. Variables d'environnement

### Variables requises en production

| Variable | Description | Exemple |
|---|---|---|
| `SECRET_KEY` | Clé secrète Django (min. 50 chars) | `django-insecure-...` |
| `MONGODB_URI` | URI de connexion MongoDB | `mongodb+srv://user:pass@cluster/db` |
| `MONGODB_DB` | Nom de la base de données | `saint_remeze` |
| `RESEND_API_KEY` | Clé API Resend pour les emails | `re_xxxx` |
| `FROM_EMAIL` | Adresse d'expédition des emails | `mairie@saintremeze.fr` |
| `FRONTEND_URL` | URL du frontend (pour les liens dans les emails) | `https://salles.saint-remeze.fr` |
| `REDIS_URL` | URI Redis (broker Celery) | `redis://redis:6379/0` |

### Variables optionnelles

| Variable | Défaut | Description |
|---|---|---|
| `ALLOWED_HOSTS` | `""` | Hôtes autorisés, séparés par des virgules |
| `CORS_ALLOWED_ORIGINS` | `""` | Origines CORS autorisées |
| `DEBUG` | `False` | Mode debug (jamais `True` en prod) |
| `DJANGO_SETTINGS_MODULE` | — | Module de settings à charger |

### Paramètres RGPD (dans `base.py`)

| Constante | Valeur par défaut | Description |
|---|---|---|
| `RGPD_POLICY_VERSION` | `"1.0"` | Version de la politique de confidentialité |
| `RGPD_DATA_RETENTION_MONTHS` | `36` | Mois d'inactivité avant anonymisation auto |
| `RGPD_DELETION_DELAY_DAYS` | `30` | Délai (jours) avant anonymisation après demande |
| `RGPD_LEGAL_RETENTION_YEARS` | `5` | Conservation légale des données contractuelles |

### JWT (dans `base.py`)

| Paramètre | Valeur | Description |
|---|---|---|
| `ACCESS_TOKEN_LIFETIME` | 15 minutes | Durée de vie de l'access token |
| `REFRESH_TOKEN_LIFETIME` | 7 jours | Durée de vie du refresh token |
| `ROTATE_REFRESH_TOKENS` | `True` | Rotation à chaque renouvellement |

---

## 4. Django Admin (`/admin/`)

L'interface d'administration native Django est accessible à `/admin/` avec les identifiants d'un superutilisateur.

> ⚠️ Cet accès est réservé à l'administration technique. Les agents municipaux utilisent l'interface `/admin` de l'application.

### Modèles administrables

#### Utilisateurs (`accounts`)

**CustomUser** — Liste : email, nom complet, rôle, email vérifié, actif, date d'inscription.
- Filtres : rôle, email vérifié, actif
- Recherche : email, prénom, nom
- Sections additionnelles : Saint Remèze (téléphone, association, rôle, email vérifié), RGPD (dates de consentement, suppression, anonymisation)
- **Action** : `Anonymiser les utilisateurs sélectionnés (RGPD)` — déclenche l'anonymisation immédiate

**RGPDConsent** — Lecture seule. Registre de tous les consentements (inscription, cookies, export, suppression).

**PasswordResetToken** — Lecture seule. Tokens de réinitialisation de mot de passe (actifs/utilisés).

#### Salles (`rooms`)

**Room** — Gestion complète des salles.
- Édition inline de `is_active`, `daily_rate_individual` et `daily_rate_association` depuis la liste
- Filtres : active, admin uniquement
- Champs : nom, capacité, surface, tarif journalier particuliers, tarif journalier associations, équipements (liste), description, emoji, couleur, active, réservation admin uniquement

> **Soft delete** : supprimer une salle via l'API passe `is_active = False`. Elle n'apparaît plus dans l'application mais ses données historiques sont conservées.

#### Réservations (`reservations`)

Gestion complète des réservations. Visible dans Django admin mais la validation se fait depuis l'interface `/admin` de l'application.

#### Manifestations (`manifestations`)

Idem réservations.

#### Notifications (`notifications`)

**MunicipalService** — Services municipaux destinataires des notifications (nom, email, emoji, actif).

**Notification** — Historique des notifications envoyées (expéditeur, services, message, priorité, emails envoyés).

#### Journal d'audit (`audit`)

**AuditLog** — Lecture seule. Toutes les actions API enregistrées (action, type d'objet, ID, IP, user-agent, horodatage).

---

## 5. API REST — Référence complète

**Base URL** : `/api/`
**Documentation interactive** : `/api/schema/swagger-ui/`
**Format** : JSON
**Pagination** : 20 éléments par page (`?page=2`)
**Authentification** : `Authorization: Bearer <access_token>`

### Authentification (`/api/auth/`)

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register/` | Non | Inscription. Envoie un email de vérification |
| `POST` | `/verify-email/` | Non | Vérification de l'email avec le token reçu |
| `POST` | `/resend-verification/` | Non | Renvoie l'email de vérification |
| `POST` | `/login/` | Non | Connexion. Retourne `access`, `refresh`, `user` |
| `POST` | `/logout/` | Oui | Déconnexion (côté client) |
| `POST` | `/token/refresh/` | Non | Renouvelle l'access token avec le refresh token |
| `GET` | `/me/` | Oui | Profil de l'utilisateur connecté |
| `PATCH` | `/me/` | Oui | Mise à jour du profil |
| `POST` | `/change-password/` | Oui | Changement de mot de passe |
| `POST` | `/forgot-password/` | Non | Demande de réinitialisation (email envoyé) |
| `POST` | `/reset-password/` | Non | Réinitialisation avec token |

**Payload login :**
```json
{ "email": "user@example.com", "password": "motdepasse" }
```

**Réponse login :**
```json
{
  "access": "eyJ...",
  "refresh": "eyJ...",
  "user": { "id": "...", "email": "...", "role": "citoyen", ... }
}
```

> **Anti-énumération** : les endpoints `/forgot-password/` et `/resend-verification/` retournent toujours le même message qu'un compte existe ou non.

---

### Salles (`/api/rooms/`)

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Non | Liste des salles actives |
| `POST` | `/` | Admin | Créer une salle |
| `GET` | `/{id}/` | Non | Détail d'une salle |
| `PATCH` | `/{id}/` | Admin | Modifier une salle |
| `DELETE` | `/{id}/` | Admin | Désactiver une salle (soft delete) |
| `GET` | `/{id}/availability/?date=YYYY-MM-DD` | Non | Créneaux occupés pour une date |

**Réponse availability :**
```json
{
  "date": "2026-03-15",
  "room": "Salle des fêtes",
  "booked_slots": [
    { "start_time": "14:00:00", "end_time": "18:00:00", "title": "Mariage", "status": "approved" }
  ]
}
```

**Champs Room :**

| Champ | Type | Description |
|---|---|---|
| `name` | string | Nom de la salle |
| `capacity` | int | Capacité en personnes |
| `area_sqm` | int | Surface en m² |
| `daily_rate_individual` | decimal | Tarif journalier particuliers en € (0 = gratuit) |
| `daily_rate_association` | decimal | Tarif journalier associations en € (0 = gratuit) |
| `applicable_daily_rate` | decimal (lecture seule) | Tarif journalier applicable au viewer courant, déterminé par ses groupes de réservation (« Particulier »/« Association » — le plus avantageux si membre des deux), particulier par défaut si non connecté ou sans groupe — voir section « Groupes automatiques Particulier / Association » plus bas |
| `can_reserve` | bool (lecture seule) | Le viewer courant peut-il réserver cette salle (groupes/admin-only) |
| `restricted_groups` | array (lecture seule) | Noms des groupes de réservation autorisés — `[]` si ouverte à tous |
| `equipment` | array | Liste des équipements disponibles |
| `description` | string | Description |
| `image_emoji` | string | Emoji représentatif |
| `color` | string | Couleur hex (#rrggbb) — utilisée pour la tuile de la salle dans le Planning (voir ci-dessous) |
| `is_active` | bool | Salle visible dans l'application |
| `requires_admin_only` | bool | Réservation réservée aux admins |

> **Couleur des tuiles du Planning (bug corrigé v1.11.4)** : le Planning affichait
> auparavant une couleur générée automatiquement par salle (palette fixe assignée
> par ordre d'affichage), en ignorant totalement le champ `color` défini sur la
> fiche de la salle — modifier la couleur dans Django Admin n'avait donc aucun
> effet visible. `PlanningPage.jsx` utilise désormais directement `room.color`
> (renvoyé par `GET /api/rooms/` et par `room_color` sur l'endpoint planning) :
> changer la couleur d'une salle ou d'un lieu dans Django Admin met immédiatement
> à jour sa couleur sur le Planning.

---

### Réservations (`/api/reservations/`)

| Méthode | Endpoint | Auth | Permission | Description |
|---|---|---|---|---|
| `GET` | `/` | Oui | Agent | Liste toutes les réservations |
| `POST` | `/` | Non | — | Créer une réservation |
| `GET` | `/my/` | Oui | Utilisateur | Mes réservations |
| `GET` | `/planning/` | Non | — | Réservations de la semaine |
| `GET` | `/export_csv/` | Oui | Agent | Export CSV |
| `GET` | `/{id}/` | Oui | Owner/Agent | Détail |
| `PATCH` | `/{id}/` | Oui | Owner/Agent | Modifier |
| `DELETE` | `/{id}/` | Oui | Owner/Agent | Annuler |
| `POST` | `/{id}/approve/` | Oui | Agent | Approuver |
| `POST` | `/{id}/reject/` | Oui | Agent | Refuser |
| `POST` | `/recurring/` | Non | — | Créer une série récurrente |
| `POST` | `/approve_group/` | Oui | Agent | Approuver toute une série |
| `POST` | `/reject_group/` | Oui | Agent | Refuser toute une série |

**Paramètres GET `/` :**
- `?status=pending|approved|rejected|cancelled`
- `?room=<room_id>`
- `?ordering=date|-date|created_at|-created_at`

**Paramètres GET `/planning/` :**
- `?week=2026-W10` (format ISO, lundi au dimanche)
- `?start=2026-09-01&end=2026-09-30` (plage explicite, prioritaire sur `week` — utilisé par l'Agenda pour afficher au-delà d'une seule semaine)
- `?room=<room_id>`
- Sans aucun paramètre : **semaine courante uniquement** (piège classique — un appel sans `start`/`end` ni `week` ne renverra jamais un événement hors de la semaine en cours).
- Champs calculés par réservation, selon le viewer courant : `subject_visible` (sujet réel visible ?) et `can_edit` (peut modifier/supprimer depuis le Planning ?) — voir section dédiée plus bas.

**Payload création réservation :**
```json
{
  "room": "<room_id>",
  "title": "Réunion annuelle",
  "association": "Association des parents d'élèves",
  "contact_name": "Jean Dupont",
  "contact_email": "jean@example.com",
  "contact_phone": "06 00 00 00 00",
  "date": "2026-04-15",
  "start_time": "14:00",
  "end_time": "18:00",
  "attendees": 50,
  "notes": "Besoin d'un vidéoprojecteur",
  "is_public": true
}
```

**Payload série récurrente :**
```json
{
  "room": "<room_id>",
  "title": "Cours de yoga",
  "contact_name": "Marie Martin",
  "contact_email": "marie@example.com",
  "date": "2026-04-01",
  "start_time": "09:00",
  "end_time": "10:00",
  "attendees": 15,
  "recurrence_type": "weekly",
  "recurrence_end_date": "2026-06-30",
  "is_public": true
}
```

**Valeurs `recurrence_type`** : `weekly`, `biweekly`, `monthly`
**Limite** : 52 occurrences maximum par série.

**Réponse série récurrente :**
```json
{
  "created": 13,
  "skipped": ["2026-05-01"],
  "group_id": "550e8400-e29b-41d4-a716-446655440000",
  "reservations": [...]
}
```

**Payload approve/reject :**
```json
{ "comment": "Commentaire optionnel visible par le demandeur" }
```

**Payload approve_group / reject_group :**
```json
{
  "group_id": "550e8400-e29b-41d4-a716-446655440000",
  "comment": "Commentaire optionnel"
}
```

**Validation anti-chevauchement** : le modèle `Reservation.clean()` interdit tout chevauchement entre réservations `pending` ou `approved` sur la même salle/date. Un créneau déjà existant retourne `HTTP 400`.

**Colonnes CSV export :**
ID, Salle, Titre, Association, Contact, Email, Téléphone, Date, Début, Fin, Participants, Statut, Groupe récurrence, Créé le

### Le Planning : visibilité, réservations privées, modification (v1.12.0)

Le Planning (`PlanningPage.jsx`, `GET /api/reservations/planning/`) affiche les
réservations de la semaine en cours, une tuile par réservation, colorée selon
`Room.color` (voir plus haut).

**Plage horaire affichée (v1.12.1)** : la grille couvre 07:00 à minuit
(`HOURS` dans `utils/dates.js`, `DAY_START_MIN`/`DAY_END_MIN` dans
`PlanningPage.jsx`). Une réservation se terminant tard en soirée (ex. 23h45)
s'affiche donc entièrement, sans être coupée en bas de grille. Le formulaire
de réservation citoyen (`ReservationPage.jsx`) plafonne quant à lui toujours
les horaires à 21:00 (`<input type="time" max="21:00">`) — une réservation
allant au-delà ne peut donc être créée que depuis Django Admin ou l'API
directement (par un agent, par exemple), pas via le formulaire public.

**Visibilité — jamais filtrée par groupe.** Le Planning est accessible à tous
(`AllowAny`) et n'est **jamais** filtré par `Room.allowed_groups` : même une
salle réservée à un groupe spécifique (ex. « Conseil Municipal ») affiche ses
réservations à tout le monde sur le Planning — seule la *création* d'une
réservation est soumise à cette restriction (`Room.user_can_reserve()`).
Un utilisateur qui ne peut pas réserver une salle peut donc toujours consulter
son planning.

**Réservations privées (`is_public=False`)** : la tuile conserve la couleur de
la salle (elle ne devient plus grise), mais son sujet est masqué et remplacé
par **« PRIVATISÉE »** pour qui n'y a pas droit. Ont accès au sujet réel, en
plus de la mention « Privatisée » affichée sous le titre :
- le propriétaire de la réservation ;
- les agents et administrateurs ;
- les membres du groupe de réservation **« Conseil Municipal »**.

Calculé côté serveur par `PlanningReservationSerializer` (champ
`subject_visible`, jamais par nom de groupe côté frontend) — le frontend ne
fait qu'afficher `title` (déjà masqué ou non par le serveur) et le badge
« 🔒 Privatisée » quand `subject_visible` est vrai pour une réservation privée.

**Modifier/supprimer depuis le Planning (v1.12.0)** : cliquer sur une tuile
ouvre une fenêtre de modification (titre, date, horaires, participants, notes,
visibilité publique/privée) avec un bouton Supprimer — uniquement si
`can_edit` est vrai pour l'utilisateur connecté, c'est-à-dire s'il est
**propriétaire de la réservation, agent ou administrateur** (même règle que
l'API `PATCH`/`DELETE /api/reservations/{id}/`, déjà en place via
`IsOwnerOrAgent` — le Planning ne fait qu'exposer cette capacité existante
dans l'interface). Un administrateur peut ainsi supprimer n'importe quelle
réservation directement depuis le Planning.

> ⚠️ **Bug corrigé en même temps** : `ReservationSerializer` ne validait le
> chevauchement de créneaux (`Reservation.clean()`, via `full_clean()`) qu'à
> la **création** — une modification (`PATCH`) pouvait donc déplacer une
> réservation sur un créneau déjà occupé sans être bloquée. Corrigé par une
> surcharge de `update()` appelant aussi `full_clean()`. Par ailleurs,
> `full_clean()` lève `django.core.exceptions.ValidationError`, que le
> gestionnaire d'exceptions par défaut de DRF ne convertit **pas** en réponse
> `400` (il ne reconnaît que `rest_framework.exceptions.ValidationError`) — un
> chevauchement provoquait donc un plantage `500` au lieu d'un message
> d'erreur exploitable, aussi bien à la création qu'à la modification. Les
> deux sont maintenant systématiquement convertis en `400` avec le détail de
> l'erreur.

### Un seul email pour toute une série récurrente (v1.12.0)

`POST /approve_group/` et `POST /reject_group/` envoyaient auparavant un email
par occurrence de la série (ex. 12 emails pour une série hebdomadaire sur 3
mois) — remplacé par un **unique email de synthèse**, envoyé une fois toute la
série traitée, qui résume la récurrence en une ligne, par exemple :

> lundi de 15h00 à 18h00 du 01/01/2027 au 31/12/2027 (52 séances)

Implémenté par `EmailService.send_recurring_reservation_approved()` /
`send_recurring_reservation_rejected()` (nouvelle méthode `_recurrence_summary()`,
basée sur la première et la dernière occurrence de la série). Les emails
d'approbation/refus au cas par cas (`POST /{id}/approve/`, `/{id}/reject/`,
pour une réservation isolée hors série) sont inchangés.

---

### Manifestations (`/api/manifestations/`)

| Méthode | Endpoint | Auth | Permission | Description |
|---|---|---|---|---|
| `GET` | `/` | Non/Oui | — | Liste (approuvées pour visiteurs, toutes pour agents) |
| `POST` | `/` | Non | — | Créer une manifestation (bloqué si désactivé, voir ci-dessous) |
| `GET` | `/config/` | Non | — | `{"is_enabled": bool}` — fonctionnalité active ou en pause |
| `GET` | `/my/` | Oui | Utilisateur | Mes manifestations |
| `GET` | `/export_csv/` | Oui | Agent | Export CSV |
| `GET` | `/equipment_availability/` | Non | — | Disponibilité logistique par date |
| `GET` | `/{id}/` | Non | — | Détail |
| `PATCH` | `/{id}/` | Oui | Owner/Agent | Modifier |
| `DELETE` | `/{id}/` | Oui | Owner/Agent | Supprimer |
| `POST` | `/{id}/approve/` | Oui | Agent | Approuver |
| `POST` | `/{id}/reject/` | Oui | Agent | Refuser |

**Paramètres GET `/` :**
- `?status=pending|approved|rejected`

**Disponibilité logistique** `GET /equipment_availability/?date_start=X&date_end=Y` :

Retourne pour chaque équipement le nombre d'unités disponibles en tenant compte de toutes les demandes en attente ou approuvées sur la période. Accessible sans authentification (affiché en temps réel dans le formulaire citoyen).

```json
[
  { "name": "Tables",        "total": 30,  "reserved": 10, "available": 20 },
  { "name": "Chaises",       "total": 100, "reserved": 40, "available": 60 },
  { "name": "Estrade",       "total": 1,   "reserved": 1,  "available": 0  },
  { "name": "Sono",          "total": 2,   "reserved": 0,  "available": 2  },
  { "name": "Vidéoprojecteur","total": 2,  "reserved": 1,  "available": 1  },
  { "name": "Éclairage",     "total": 1,   "reserved": 0,  "available": 1  }
]
```

**Payload création :**
```json
{
  "title": "Fête de la lavande",
  "association": "Comité des fêtes",
  "contact_name": "Pierre Blanc",
  "contact_email": "pierre@example.com",
  "contact_phone": "06 12 34 56 78",
  "date_start": "2026-07-14",
  "date_end": "2026-07-15",
  "location_type": "exterior",
  "location": "Place du village",
  "gps_lat": 44.3911,
  "gps_lng": 4.5092,
  "expected_attendees": 500,
  "description": "Fête annuelle avec animations...",
  "budget": 2500.00,
  "equipment_quantities": { "Tables": 20, "Chaises": 80, "Sono": 1 },
  "is_public": true
}
```

> `equipment_quantities` : dictionnaire `{nom: quantité}`. Le champ `equipment_needs` (liste simple) est dérivé automatiquement par le backend.

**Pour une salle communale** (`location_type = "room"`) :
```json
{
  "location_type": "room",
  "room": "<room_id>",
  "location": "",
  "gps_lat": null,
  "gps_lng": null
}
```

**Colonnes CSV export :**
ID, Titre, Association, Contact, Email, Téléphone, Date début, Date fin, Lieu, GPS Lat, GPS Lng, Participants, Budget, Équipements, Statut, Créé le

### Activer/désactiver la fonctionnalité Manifestation (v1.11.0)

Django Admin → **Paramètres — Manifestations** → case **Manifestations activées**.

Décochée :
- La page `/manifestation` de l'application affiche un message d'indisponibilité au
  lieu du formulaire, et le lien disparaît du menu et du bandeau bas (mobile).
- `POST /api/manifestations/` est bloqué (400) — y compris via un appel API direct,
  pas seulement côté interface.
- Les manifestations déjà **approuvées** restent visibles dans l'Agenda et sur le
  planning : décocher ne les cache pas, ça empêche seulement d'en déposer de nouvelles.
- Les agents peuvent toujours consulter/approuver/refuser les demandes déjà déposées.

Réglage stocké dans `ManifestationSettings` (une seule ligne toujours présente,
créée automatiquement au premier accès — `ManifestationSettings.load()`).

> ⚠️ **Piège MongoDB évité ici** : un singleton Django classique force `pk=1` à la
> sauvegarde. Ça casse sur ce backend car la clé primaire est un `ObjectIdAutoField`
> qui rejette un entier comme "1" (même bug que les anciennes fixtures — voir
> Dépannage). L'unicité repose donc sur un champ `key` dédié, jamais sur le pk.

**Effet sur la page d'accueil (v1.11.2)** : la section « Nos lieux » du tableau de
bord n'est affichée que si les manifestations sont **activées**. En effet, les salles
de catégorie « lieu » (espaces extérieurs, ex. terrain municipal) ne sont réservables
qu'au travers du formulaire de manifestation — les proposer sur l'accueil alors que
ce formulaire est désactivé aurait affiché des tuiles menant à une page indisponible.
Les sections « Salles disponibles pour les particuliers »/« Salles pour les
associations » (catégorie « salle », réservables directement) restent toujours visibles.

---

### Stocks logistiques (`EquipmentStock`)

Modèle géré via le Django Admin (`/admin/manifestations/equipmentstock/`).

| Équipement | Quantité par défaut | Ajustable |
|---|---|---|
| Tables | 30 | Oui |
| Chaises | 100 | Oui |
| Estrade | 1 | Oui |
| Sono | 2 | Oui |
| Vidéoprojecteur | 2 | Oui |
| Éclairage | 1 | Oui |

**La liste est chargée dynamiquement depuis le backend** : le formulaire citoyen appelle `GET /api/manifestations/equipment_availability/` au chargement de la page, puis à chaque changement de date. La liste affichée est donc toujours exactement ce qui est défini dans `EquipmentStock` — aucun redéploiement n'est nécessaire pour ajouter, supprimer ou renommer un équipement.

**Pour modifier les stocks :** aller dans `/admin/manifestations/equipmentstock/` et ajuster la valeur `Quantité totale`. L'effet est immédiat pour tous les nouveaux visiteurs du formulaire.

**Pour ajouter un équipement :** cliquer sur « Ajouter Stock logistique », saisir le nom et la quantité. Il apparaît aussitôt dans le formulaire citoyen.

**Pour retirer un équipement :** le supprimer dans le Django Admin. Il disparaît du formulaire sans toucher au code.

**Calcul de la disponibilité :** `disponible = total − somme des quantités demandées dans les manifestations pending/approved sur les dates sélectionnées`.

---

### Notifications (`/api/notifications/`)

| Méthode | Endpoint | Auth | Permission | Description |
|---|---|---|---|---|
| `GET` | `/services/` | Oui | Agent | Liste des services municipaux |
| `POST` | `/send/` | Oui | Agent | Envoyer une notification |
| `GET` | `/history/` | Oui | Agent | Historique des notifications |

**Payload envoi notification :**
```json
{
  "service_ids": ["<id1>", "<id2>"],
  "message": "Nouvelle manifestation à valider pour le 14 juillet.",
  "priority": "normal"
}
```

**Valeurs `priority`** : `low` (normale), `normal` (importante), `high` (urgente)

---

### RGPD (`/api/rgpd/`)

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/my-data/` | Oui | Export données en JSON (Art. 15) |
| `POST` | `/my-data/download-csv/` | Oui | Export données en CSV (Art. 20) |
| `POST` | `/request-deletion/` | Oui | Demande de suppression du compte (Art. 17) |
| `POST` | `/consent/` | Oui | Enregistrer un consentement |

---

### Santé (`/api/health/`)

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Non | Vérification de disponibilité du service |

**Réponse :** `{"status": "ok"}`
Utilisé par Render pour les health checks automatiques.

---

## 6. Gestion des salles

### Créer une salle

Via Django Admin (`/admin/rooms/room/add/`) ou via API :

```bash
curl -X POST /api/rooms/ \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Salle du conseil",
    "capacity": 30,
    "area_sqm": 60,
    "daily_rate_individual": 15.00,
    "daily_rate_association": 8.00,
    "equipment": ["Vidéoprojecteur", "Tableau blanc", "Climatisation"],
    "description": "Salle de réunion municipale",
    "image_emoji": "🏛️",
    "color": "#1a3a5a",
    "is_active": true,
    "requires_admin_only": false
  }'
```

### Désactiver une salle

La suppression est un **soft delete** : `is_active` passe à `false`. La salle disparaît de l'application mais toutes les réservations historiques sont conservées.

```bash
curl -X DELETE /api/rooms/<id>/ \
  -H "Authorization: Bearer <admin_token>"
```

### Restreindre une salle à certains groupes d'utilisateurs

Une salle peut être réservée par tout le monde par défaut. Pour la réserver aux membres
d'un ou plusieurs groupes (ex : seul le groupe « Conseil Municipal » peut réserver la
salle du conseil) :

1. Créer le(s) groupe(s) si besoin : Django Admin → **Groupes d'utilisateurs** → Ajouter.
2. Ouvrir la fiche de la salle (Django Admin → Salles) → champ **Groupes autorisés à
   réserver** → sélectionner le ou les groupes.
3. Ajouter les utilisateurs concernés à ce groupe : fiche utilisateur → section
   « Saint Remèze » → champ **Groupes de réservation**.

**Règles (voir `Room.user_can_reserve()` dans `apps/rooms/models.py`) :**
- Un compte **admin** peut toujours tout réserver, quels que soient les groupes.
- Une salle **sans aucun groupe défini** (le cas par défaut) reste ouverte à tous,
  y compris aux visiteurs non connectés.
- Une salle avec des groupes définis n'est réservable que par un utilisateur connecté
  membre d'au moins un de ces groupes.
- Le champ historique **« Réservation admin uniquement »** reste prioritaire sur les
  groupes : s'il est coché, seul un admin peut réserver, même un membre d'un groupe autorisé.
- La restriction est vérifiée à la fois à l'affichage (champ `can_reserve` renvoyé par
  `GET /api/rooms/`, utilisé par le formulaire de réservation pour ne proposer que les
  salles accessibles) et à la création de la réservation (`POST /api/reservations/` et
  `/api/reservations/recurring/`, qui refusent la demande avec un message explicite
  si la règle n'est pas respectée — la vérification serveur est celle qui compte,
  le filtrage côté formulaire n'est qu'un confort d'usage).
- Cette restriction ne s'applique pas automatiquement aux **agents** : un agent qui
  n'est pas membre du groupe requis ne peut pas non plus réserver la salle (seul admin
  passe toujours). Ajoutez l'agent au groupe concerné si nécessaire.
- **Page d'accueil (revu v1.11.6)** : le tableau de bord présente désormais deux
  sections dédiées, dans cet ordre : **« Salles disponibles pour les particuliers »**
  puis **« Salles pour les associations »**. Une salle apparaît dans l'une de ces
  sections si elle est ouverte à tous (aucun groupe défini) **ou** explicitement
  restreinte au groupe correspondant (« Particulier » ou « Association »), et jamais
  si « Réservation admin uniquement » est coché. Une salle réservée à un autre groupe
  (ex. « Conseil Municipal ») n'apparaît dans **aucune** des deux sections — elle reste
  réservable normalement par ses membres via le formulaire de réservation, simplement
  sans être mise en avant sur l'accueil public. « Nos lieux » (catégorie « lieu »,
  ouverts à tous) reste affichée séparément, sous réserve que les manifestations
  soient activées (voir plus haut). Logique dans `DashboardPage.jsx`
  (`isOpenOrRestrictedTo()`), basée sur `RoomSerializer.restricted_groups` et
  `requires_admin_only`.

> ⚠️ **Bug corrigé (v1.11.8)** : la tuile de chaque salle affichait
> `applicable_daily_rate` — le tarif calculé pour le **viewer connecté**,
> unique par salle — dans les deux sections. Une salle ouverte à tous apparaît
> dans les deux sections à la fois ; un particulier connecté y voyait donc son
> propre tarif particulier répété sur la tuile « associations » au lieu du
> tarif association réel. Corrigé : la section particuliers affiche
> `daily_rate_individual`, la section associations affiche
> `daily_rate_association` — les deux tarifs bruts de la salle, indépendants
> du viewer connecté (prop `rateField` de `RoomSection`).

### Fixtures initiales

Les salles et services municipaux par défaut sont dans :
- `backend/apps/rooms/fixtures.json`
- `backend/apps/notifications/fixtures.json`

Elles sont chargées automatiquement **une seule fois**, au tout premier démarrage
sur une base vide, par la commande `python manage.py load_initial_fixtures`
(appelée depuis le startCommand Render et docker-compose, à chaque démarrage du
service, mais sans effet si des salles ou services existent déjà).

> ⚠️ **Bug corrigé (v1.11.3)** : avant cette commande, le startCommand appelait
> directement `loaddata apps/rooms/fixtures.json` à **chaque** redémarrage du
> service (déploiement, crash, restart manuel). Or `loaddata` réinsère chaque
> objet avec son pk fixe s'il n'existe plus — une salle supprimée volontairement
> par un administrateur depuis Django Admin ("Salle des Fêtes", "Salle
> Polyvalente", "Terrain de Sport"...) réapparaissait donc à chaque redémarrage.
> `load_initial_fixtures` (`apps/rooms/management/commands/`) vérifie d'abord
> que la collection est vide avant de charger quoi que ce soit.

Pour forcer un rechargement manuel (écrase les personnalisations existantes, à
utiliser seulement pour réinitialiser une base de test) :
```bash
python manage.py loaddata apps/rooms/fixtures.json apps/notifications/fixtures.json
```

---

## 7. Gestion des utilisateurs et rôles

### Modèle `CustomUser`

Hérite de `AbstractUser`. Champs additionnels :

| Champ | Description |
|---|---|
| `email` | Identifiant unique (USERNAME_FIELD) |
| `phone` | Téléphone (optionnel) |
| `account_type` | `particulier` / `association` (choisi à l'inscription) |
| `association` | Nom de l'association — requis si `account_type = association` |
| `rna_number` | Numéro RNA (format `W` + 9 chiffres) — requis si `account_type = association` |
| `role` | `citoyen` / `agent` / `admin` |
| `email_verified` | Email confirmé ? |
| `email_verify_token` | Token de vérification (durée 24h) |
| `rgpd_consent_date` | Date du consentement RGPD |
| `deletion_requested_at` | Date de demande de suppression |
| `anonymized_at` | Date d'anonymisation effective |
| `reservation_groups` | Groupes d'utilisateurs (M2M vers `UserGroup`) — voir [Restreindre une salle à certains groupes](#restreindre-une-salle-à-certains-groupes-dutilisateurs) |

> `UserGroup` (modèle séparé, `apps/accounts/models.py`) n'a **aucun rapport** avec
> `django.contrib.auth.models.Group` (le système de groupes/permissions Django standard),
> volontairement inutilisé sur ce projet. Le menu natif Django « Authentification et
> autorisation → Groups » est **masqué** (`admin.site.unregister(Group)` dans
> `apps/accounts/admin.py`) précisément pour éviter de créer un groupe au mauvais
> endroit — ça s'est déjà produit une fois (le groupe créé dans `auth_group` restait
> invisible partout dans l'app, qui ne lit que la collection `accounts_usergroup`).

### Groupes automatiques « Particulier » / « Association » (v1.11.2, revu v1.11.5/v1.11.7)

Deux `UserGroup` sont créés et maintenus automatiquement, en miroir du champ
`account_type` de chaque utilisateur : **« Particulier »** et **« Association »**.

> ⚠️ **Principe important** : la distinction particulier/association — pour le
> tarif journalier applicable et pour l'accès aux salles restreintes — se fait
> **uniquement sur l'appartenance aux groupes de réservation**
> (`reservation_groups`), jamais sur le champ `account_type` lui-même. Le champ
> `account_type` ne sert qu'à **initialiser/forcer** cette appartenance ; ce
> n'est qu'un raccourci de saisie, pas la source de vérité pour les droits.

**Quand `CustomUser.sync_account_type_group()` s'exécute** (ajoute le groupe
correspondant au nouvel `account_type`, **et retire l'autre** — ce couple reste
mutuellement exclusif via ce mécanisme) :
- à l'inscription (`RegisterSerializer.create()`) ;
- lorsqu'un administrateur modifie `account_type` depuis la fiche utilisateur
  (Django Admin) — mais **seulement si le champ a réellement changé** dans cette
  sauvegarde ;
- lorsque l'utilisateur modifie son type de compte depuis son profil — même
  condition : seulement si la valeur a réellement changé.

Cette exécution conditionnée au changement réel est essentielle : elle permet à
un administrateur de cocher **manuellement** les deux groupes « Particulier » et
« Association » sur la fiche d'un utilisateur (ex. élu du Conseil Municipal,
traité à la fois comme particulier et comme représentant associatif) sans que
cet ajout ne soit défait à la sauvegarde suivante — tant que `account_type`
lui-même n'est pas modifié dans la même opération, `sync_account_type_group()`
n'est pas appelée et les deux groupes restent en place. Un tel utilisateur
bénéficie alors des **droits des deux** :
- **Tarif** : `Room.daily_rate_for()` renvoie le tarif le plus avantageux des deux
  (le minimum entre le tarif particulier et le tarif association de la salle).
- **Accès aux salles restreintes** : `Room.user_can_reserve()` autorise dès qu'il
  est membre d'*au moins un* des groupes autorisés — donc l'accès réservé aux
  particuliers ET l'accès réservé aux associations, simultanément.

**Rattrapage automatique au démarrage** : la commande
`python manage.py resync_account_type_groups` (exécutée à chaque démarrage du
serveur, Render et docker-compose) ajoute à chaque utilisateur le groupe
correspondant à son `account_type` s'il en est dépourvu — via
`CustomUser.ensure_account_type_group()`, **purement additif** (jamais de
retrait, contrairement à `sync_account_type_group()`), donc sans danger à
exécuter en continu : elle ne peut jamais défaire un second groupe accordé
manuellement à un élu du Conseil Municipal. Elle corrige notamment le cas d'un
utilisateur créé directement depuis Django Admin (sans passer par
l'inscription) et qui se serait retrouvé sans aucun groupe de réservation — son
tarif affiché ne correspondait alors plus à son type de compte.

Les comptes déjà existants avant l'introduction de ces groupes ont initialement
été affectés par la migration `accounts/0005_create_account_type_groups.py`.

Ces deux groupes fonctionnent exactement comme n'importe quel autre `UserGroup` :
ils peuvent être utilisés dans le champ **Groupes autorisés à réserver** d'une salle
(voir [Restreindre une salle à certains groupes](#restreindre-une-salle-à-certains-groupes-dutilisateurs))
pour réserver une salle aux seuls particuliers, ou aux seules associations.

### Changer le rôle d'un utilisateur

Via Django Admin → Utilisateurs → sélectionner l'utilisateur → champ "Rôle".

Ou en base directement (MongoDB) :
```javascript
db.accounts_customuser.updateOne(
  { email: "agent@mairie.fr" },
  { $set: { role: "agent" } }
)
```

### Permissions par rôle

| Action | Citoyen | Agent | Admin |
|---|---|---|---|
| Créer une réservation | ✅ | ✅ | ✅ |
| Voir ses réservations | ✅ | ✅ | ✅ |
| Voir toutes les réservations | ❌ | ✅ | ✅ |
| Approuver/refuser une réservation | ❌ | ✅ | ✅ |
| Créer/modifier/supprimer une salle | ❌ | ❌ | ✅ |
| Exporter CSV | ❌ | ✅ | ✅ |
| Envoyer des notifications | ❌ | ✅ | ✅ |
| Accéder au Django Admin | ❌ | ❌ | ✅ (superuser) |

### Classes de permission DRF

```python
# apps/accounts/permissions.py
IsAdmin       # role == "admin"
IsAgent       # role in ("agent", "admin")
IsOwnerOrAgent  # user == obj.user OR IsAgent
```

---

## 8. Workflow de validation des demandes

### Diagramme d'état

```
Soumission
    │
    ▼
[pending] ──── agent approve ────► [approved]  → email confirmation
    │
    └────── agent reject ─────────► [rejected]  → email refus avec commentaire
    │
    └────── owner cancel ──────────► [cancelled]
```

### Règles métier

- Seules les réservations/manifestations au statut `pending` peuvent être approuvées ou refusées
- Une réservation approuvée ou refusée ne peut plus être modifiée via les actions approve/reject
- L'agent qui traite la demande est enregistré dans `reviewed_by` avec l'horodatage `reviewed_at`
- Le commentaire de l'agent est stocké dans `admin_comment` (visible par le demandeur dans l'email)
- La détection de chevauchement bloque `pending` ET `approved` (un créneau en attente est considéré occupé)

### Réservations récurrentes

Chaque occurrence est un objet `Reservation` indépendant, relié aux autres par `recurrence_group` (UUID v4 partagé).

Actions groupées disponibles :
- `POST /api/reservations/approve_group/` avec `{ "group_id": "<uuid>" }`
- `POST /api/reservations/reject_group/` avec `{ "group_id": "<uuid>", "comment": "..." }`

Seules les occurrences en statut `pending` sont concernées par les actions groupées.

---

## 9. Tâches planifiées RGPD — Redis, Celery et automatisation

### Pourquoi Redis et Celery pour le RGPD ?

Le RGPD impose des **obligations d'effacement automatique** des données personnelles :
- Un utilisateur qui demande la suppression de son compte doit être anonymisé sous 30 jours
- Un compte inactif depuis 3 ans doit être anonymisé automatiquement
- L'utilisateur doit être prévenu 30 jours avant cette suppression

Ces opérations doivent tourner **en tâche de fond**, sans intervention manuelle, même la nuit. C'est le rôle de **Celery**, qui a besoin de **Redis** pour fonctionner.

### Comment s'articulent Redis et Celery ?

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chaque nuit / semaine                    │
│                                                                 │
│  Celery Beat          Redis              Celery Worker          │
│  (planificateur)      (file d'attente)   (exécuteur)           │
│                                                                 │
│  "Il est 2h00,   →   [tâche déposée] →  Lit la tâche         │
│   lancer la tâche     dans Redis         Connecte à MongoDB    │
│   d'anonymisation"                       Anonymise les comptes │
│                                          Écrit les logs        │
└─────────────────────────────────────────────────────────────────┘
```

- **Redis** est la boîte aux lettres : Django y dépose des messages, Celery les lit
- **Celery Beat** est le planificateur : il déclenche les tâches aux heures programmées
- **Celery Worker** est l'exécuteur : il fait vraiment le travail (accès MongoDB, envoi d'emails)

> Sans Redis, Celery ne peut pas fonctionner. Sans Celery Worker, les tâches RGPD
> ne s'exécutent jamais, même si elles sont programmées.

### Les 3 tâches RGPD et leur rôle

#### `anonymize_pending_deletions` — Tous les jours à 2h00

Un citoyen clique "Supprimer mon compte" dans son profil. Le RGPD impose un délai
de rétractation de 30 jours avant l'effacement effectif. Cette tâche vérifie chaque
nuit si ce délai est écoulé et anonymise les comptes concernés.

```
Utilisateur clique          30 jours           Tâche s'exécute
"Supprimer mon compte"      s'écoulent         automatiquement
        │                       │                     │
        ▼                       ▼                     ▼
deletion_requested_at   [nuits passées]      user.anonymize()
sauvé en base                                → données effacées
```

#### `warn_users_before_anonymization` — Chaque lundi à 3h00

Avant d'anonymiser un compte inactif (tâche suivante), l'application envoie
un email d'avertissement 30 jours à l'avance. L'utilisateur peut se reconnecter
pour conserver son compte.

#### `anonymize_inactive_users` — Le 1er de chaque mois à 4h00

Un compte citoyen qui n'a pas été utilisé depuis **36 mois** est anonymisé
automatiquement, conformément à l'article 5 du RGPD (limitation de la durée
de conservation). Les agents et admins ne sont jamais concernés par cette règle.

> Les 3 tâches s'exécutent dans cet ordre intentionnel : d'abord les avertissements
> (lundi), ensuite les suppressions demandées (tous les jours), enfin les suppressions
> pour inactivité (1er du mois).

### Planification (Celery Beat)

La planification est définie dans `config/celery.py` :

```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    "anonymize-pending-deletions": {
        "task": "apps.accounts.tasks.anonymize_pending_deletions",
        "schedule": crontab(hour=2, minute=0),  # Tous les jours à 2h
    },
    "warn-before-anonymization": {
        "task": "apps.accounts.tasks.warn_users_before_anonymization",
        "schedule": crontab(hour=3, minute=0, day_of_week=1),  # Chaque lundi
    },
    "anonymize-inactive-users": {
        "task": "apps.accounts.tasks.anonymize_inactive_users",
        "schedule": crontab(hour=4, minute=0, day_of_month=1),  # 1er du mois
    },
}
```

### Mise en place sur Render (production)

Le `render.yaml` ne déclare pas encore de worker Celery. Pour activer l'automatisation
RGPD complète, il faut ajouter deux services dans le dashboard Render :

#### 1 — Redis (Upstash — gratuit)

1. Créer un compte sur [upstash.com](https://upstash.com)
2. Créer une base Redis (région Frankfurt, plan gratuit)
3. Copier l'URL de connexion (format `redis://default:xxx@xxx.upstash.io:6379`)
4. Dans Render → service `saint-remeze-backend` → Environment → ajouter :
   ```
   REDIS_URL = redis://default:xxx@xxx.upstash.io:6379
   ```

#### 2 — Worker Celery (Render Background Worker)

Dans le dashboard Render → **New** → **Background Worker** :

| Paramètre | Valeur |
|---|---|
| Name | `saint-remeze-celery` |
| Runtime | Python |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `celery -A config worker -B --loglevel=info` |

Ajouter les mêmes variables d'environnement que le backend :
`SECRET_KEY`, `MONGODB_URI`, `MONGODB_DB`, `REDIS_URL`, `RESEND_API_KEY`,
`FROM_EMAIL`, `FRONTEND_URL`, `DJANGO_SETTINGS_MODULE`

> Le `-B` dans la commande de démarrage intègre Celery Beat directement dans
> le worker — un seul service suffit pour les deux rôles.

> ⚠️ Sur le plan gratuit Render, le Background Worker s'endort après inactivité.
> Pour les tâches RGPD nocturnes, un **plan payant (7 $/mois)** est nécessaire
> pour garantir l'exécution. Sinon, déclencher manuellement (voir ci-dessous).

### Exécuter une tâche manuellement

Via la console Render (onglet **Shell** du service backend) ou en Docker local :

```bash
# Depuis Docker local
docker compose exec backend python manage.py shell -c \
  "from apps.accounts.tasks import anonymize_pending_deletions; print(anonymize_pending_deletions())"

# Depuis la console Render (Shell)
python manage.py shell -c \
  "from apps.accounts.tasks import anonymize_pending_deletions; print(anonymize_pending_deletions())"
```

### Vérifier l'état du worker

```bash
# En Docker local
docker compose exec celery celery -A config inspect active
docker compose logs celery --tail=50

# Sur Render : consulter les logs du service saint-remeze-celery
```

### Processus d'anonymisation

Quand `user.anonymize()` est appelée :
```
first_name  → "Anonyme"
last_name   → ""
email       → "deleted_<id>@anonymized.invalid"
username    → "deleted_<id>"
phone       → ""
association → ""
is_active   → False
anonymized_at → now()
```
Les réservations et manifestations associées conservent les champs `contact_name`, `contact_email` copiés au moment de la création (conservation légale 5 ans).

---

## 10. Service email (Resend)

Tous les emails sont envoyés via l'API Resend (`services/email_service.py`).

### Emails envoyés automatiquement

| Événement | Destinataire | Contenu |
|---|---|---|
| Inscription | Nouvel utilisateur | Lien de vérification email (valide 24h) |
| Réservation reçue | Contact de la réservation | Accusé de réception |
| Réservation approuvée | Contact | Confirmation avec détails |
| Réservation refusée | Contact | Refus avec commentaire agent |
| Manifestation approuvée | Contact | Confirmation |
| Manifestation refusée | Contact | Refus avec commentaire |
| Mot de passe oublié | Utilisateur | Lien de réinitialisation (valide 15 min) |
| Changement de mot de passe | Utilisateur | Notification de sécurité |
| Avertissement anonymisation | Utilisateur inactif | Alerte 30j avant suppression |

### Renvoyer un email de vérification

L'utilisateur dispose d'un bouton **« Renvoyer l'email de vérification »** sur l'écran de connexion, affiché automatiquement quand la tentative échoue avec « Veuillez vérifier votre adresse email ». Il appelle `POST /api/auth/resend-verification/` (`{email}`), qui génère un nouveau token et renvoie l'email — sans jamais révéler si le compte existe (protection contre l'énumération d'adresses).

---

## 10-bis. Mise en place des emails en production (Resend)

> Ce chapitre explique pas à pas comment configurer l'envoi d'emails vers
> **n'importe quel destinataire** en production. Sans cette configuration,
> les emails ne sont envoyés qu'à l'adresse du propriétaire du compte Resend.

### Pourquoi une configuration spéciale est-elle nécessaire ?

Resend fonctionne en deux modes :

| Mode | Adresse `from` | Destinataires possibles | Usage |
|---|---|---|---|
| **Test** (défaut) | `onboarding@resend.dev` | Uniquement votre email Resend | Développement |
| **Production** | `noreply@votre-domaine.fr` | N'importe qui | Production |

En mode test, toute tentative d'envoyer à un autre email retourne :
```json
{
  "name": "validation_error",
  "message": "You can only send testing emails to your own email address.
               To send emails to other recipients, please verify a domain
               at resend.com/domains."
}
```

La solution : **vérifier le domaine `saintremeze.fr`** auprès de Resend.

---

### Étape 1 — Créer un compte Resend

1. Aller sur [resend.com](https://resend.com) → **Sign Up**
2. Confirmer votre email
3. L'offre gratuite permet **3 000 emails/mois** — suffisant pour cette application

---

### Étape 2 — Vérifier le domaine `saintremeze.fr`

C'est l'étape clé. Resend doit prouver que vous contrôlez le domaine.

#### 2.1 — Ajouter le domaine dans Resend

1. Dans le dashboard Resend → **Domains** → **Add Domain**
2. Saisir : `saintremeze.fr`
3. Cliquer **Add**

Resend affiche alors **3 enregistrements DNS** à créer.

#### 2.2 — Ajouter les enregistrements DNS chez votre hébergeur

Connectez-vous à l'interface DNS de votre registrar (OVH, Gandi, Infomaniak, etc.)
et créez les 3 enregistrements suivants (les valeurs exactes viennent du dashboard Resend) :

**Enregistrement 1 — SPF (TXT)**
```
Type  : TXT
Nom   : saintremeze.fr   (ou @)
Valeur: v=spf1 include:amazonses.com ~all
TTL   : 3600 (ou défaut)
```

**Enregistrement 2 — DKIM (CNAME)**
```
Type  : CNAME
Nom   : resend._domainkey.saintremeze.fr
Valeur: (fournie par Resend — ressemble à resend._domainkey.xxxxxxx.dkim.amazonses.com)
TTL   : 3600 (ou défaut)
```

**Enregistrement 3 — DMARC (TXT)** *(optionnel mais recommandé)*
```
Type  : TXT
Nom   : _dmarc.saintremeze.fr
Valeur: v=DMARC1; p=none;
TTL   : 3600 (ou défaut)
```

> ⚠️ **Attention chez OVH** : ne pas inclure le nom de domaine dans le champ "Sous-domaine".
> Pour `resend._domainkey.saintremeze.fr`, saisir uniquement `resend._domainkey` dans
> le champ sous-domaine — OVH ajoute `.saintremeze.fr` automatiquement.

#### 2.3 — Attendre la propagation DNS

La propagation DNS prend en général **5 à 30 minutes** (peut monter à 24h).

Dans le dashboard Resend → Domains → cliquer **Verify** pour déclencher la vérification.
Le statut passe de `Pending` à `Verified` (✅) quand c'est bon.

> Pour vérifier manuellement depuis un terminal :
> ```bash
> dig TXT saintremeze.fr +short
> # Doit contenir : "v=spf1 include:amazonses.com ~all"
>
> dig CNAME resend._domainkey.saintremeze.fr +short
> # Doit retourner l'adresse DKIM fournie par Resend
> ```

---

### Étape 3 — Créer une clé API Resend

1. Dashboard Resend → **API Keys** → **Create API Key**
2. Nom : `saint-remeze-production`
3. Permission : **Sending access** (pas besoin de Full access)
4. Domain : sélectionner `saintremeze.fr` *(restreint la clé à ce domaine)*
5. Cliquer **Add** → **copier la clé immédiatement** (elle ne sera plus affichée)

La clé ressemble à : `re_AbCdEfGh_123456789`

---

### Étape 4 — Configurer les variables d'environnement

#### Sur Render (production)

Dans le dashboard Render → service `saint-remeze-backend` → **Environment** :

| Variable | Valeur à saisir |
|---|---|
| `RESEND_API_KEY` | `re_AbCdEfGh_123456789` (votre clé) |
| `FROM_EMAIL` | `Mairie de Saint Remèze <noreply@saintremeze.fr>` |

> Le format `"Nom affiché <email@domaine.fr>"` est recommandé pour un affichage
> professionnel dans les boîtes mail des destinataires.

Cliquer **Save Changes** → Render redémarre le service automatiquement.

#### En Docker local (`.env`)

```bash
RESEND_API_KEY=re_AbCdEfGh_123456789
FROM_EMAIL=Mairie de Saint Remèze <noreply@saintremeze.fr>
```

---

### Étape 5 — Vérifier que tout fonctionne

#### Test rapide via l'API

Créer un compte test dans l'application et vérifier que l'email de vérification arrive.

#### Test via curl

```bash
curl -X POST https://saint-remeze-backend-ic8p.onrender.com/api/auth/resend-verification/ \
  -H "Content-Type: application/json" \
  -d '{"email": "votre-email@domaine.fr"}'
```

#### Vérifier les logs Render

Dashboard Render → `saint-remeze-backend` → **Logs**

Un envoi réussi affiche :
```json
{"level": "INFO", "message": "[EMAIL] Envoyé à ['destinataire@gmail.com'] | id=abc123"}
```

Un échec affiche :
```json
{"level": "ERROR", "message": "[EMAIL] Échec Resend — destinataire=... | erreur=..."}
{"level": "ERROR", "message": "[REGISTER] Email de vérification NON envoyé pour ..."}
```

---

### Récapitulatif et erreurs fréquentes

| Symptôme | Cause | Solution |
|---|---|---|
| Email reçu uniquement par le propriétaire du compte Resend | `FROM_EMAIL` utilise `onboarding@resend.dev` | Vérifier le domaine et changer `FROM_EMAIL` |
| `validation_error` dans les logs | Domaine non vérifié sur Resend | Compléter l'étape 2 |
| `403` dans les logs | Clé API invalide ou expirée | Regénérer la clé dans Resend |
| Email en spam | SPF/DKIM mal configurés | Vérifier les enregistrements DNS (étape 2) |
| Aucun log d'erreur, aucun email | `RESEND_API_KEY` vide sur Render | Vérifier la variable dans le dashboard Render |
| `FRONTEND_URL` incorrect dans le lien | Variable mal configurée | `FRONTEND_URL=https://saint-remeze-frontend-ic8p.onrender.com` |

---

### Architecture du service email

```
RegisterView.post()
    │
    ├─ user.generate_email_verify_token()   # génère un token 32 bytes, sauvé en DB
    │
    └─ EmailService.send_email_verification(user, token)
           │
           ├─ Vérification RESEND_API_KEY   # si vide → log ERROR, return False
           │
           ├─ resend.Emails.send({          # appel API Resend
           │    "from": FROM_EMAIL,
           │    "to":   [user.email],
           │    "html": template HTML
           │  })
           │
           ├─ Succès → log INFO avec l'ID Resend de l'email
           └─ Échec  → log ERROR avec le message d'erreur Resend
```

Le `RegisterView` retourne toujours `HTTP 201` (sécurité : ne pas révéler si un email existe).
En cas d'échec, l'erreur est visible **uniquement dans les logs serveur**.

---

## 11. Journal d'audit

Toutes les requêtes API sont enregistrées par le middleware `AuditLogMiddleware`.

### Modèle `AuditLog`

| Champ | Description |
|---|---|
| `user` | Utilisateur connecté (null si anonyme) |
| `action` | Ex : `reservation.approved`, `user.login` |
| `object_type` | Ex : `Reservation`, `Manifestation` |
| `object_id` | ID MongoDB de l'objet concerné |
| `details` | Données JSON supplémentaires |
| `ip_address` | Adresse IP de la requête |
| `user_agent` | Navigateur / client HTTP |
| `timestamp` | Horodatage (auto) |

### Consulter les logs

Via Django Admin → Journal d'audit (lecture seule).

Ou directement en MongoDB :
```javascript
// 20 dernières actions d'un agent
db.audit_auditlog.find(
  { "user": ObjectId("...") }
).sort({ timestamp: -1 }).limit(20)

// Toutes les approbations de réservations
db.audit_auditlog.find(
  { action: "reservation.approved" }
).sort({ timestamp: -1 })
```

---

## 12. Sécurité et JWT

### Authentification JWT

- **Access token** : durée de vie 15 minutes, transmis dans le header `Authorization: Bearer <token>`, gardé en mémoire côté frontend (store Zustand, jamais persisté sur disque)
- **Refresh token** : durée de vie 7 jours, transporté dans un **cookie httpOnly** `refresh_token` (`apps/accounts/cookies.py`) — jamais exposé au JSON de réponse, donc invisible et inaccessible à JavaScript (protection contre le vol par XSS). Avant la v1.9.1, il était dupliqué dans le `localStorage`, lisible par n'importe quel script injecté en cas de faille XSS future.
- **Rotation** : chaque renouvellement émet un nouveau refresh token et invalide le précédent
- **Pas de blacklist** : `token_blacklist` Django est incompatible MongoDB. La sécurité repose sur la courte durée de l'access token et la rotation du refresh token — un refresh token déjà émis reste donc valable jusqu'à 7 jours même après une déconnexion ou un changement de mot de passe volontaire (voir recommandations restantes plus bas).

**Cookie cross-site** : le frontend et le backend sont sur des sous-domaines
`*.onrender.com` distincts, traités comme des sites différents par les
navigateurs (`onrender.com` est sur la Public Suffix List). Le cookie est donc
`SameSite=None; Secure` en production (`REFRESH_COOKIE_SAMESITE`/`_SECURE` dans
`production.py`), et `SameSite=Lax` sans `Secure` en dev local (`base.py`) où
frontend et backend sont sur `localhost`, un seul et même site. `CORS_ALLOW_CREDENTIALS = True`
est nécessaire pour que le navigateur transmette le cookie sur les requêtes
cross-origin — sans danger ici car `CORS_ALLOWED_ORIGINS` reste une liste
explicite (jamais de wildcard combiné à des credentials).

### Renouvellement automatique côté frontend

L'intercepteur Axios (`frontend/src/api/client.js`, `withCredentials: true`)
gère automatiquement :
1. Détection d'un 401
2. Tentative de renouvellement — `POST /api/auth/token/refresh/` sans corps,
   le cookie `refresh_token` suffit (envoyé automatiquement par le navigateur)
3. File d'attente des requêtes en cours pendant le renouvellement
4. Retry automatique avec le nouvel access token
5. Déconnexion automatique si le refresh échoue (401 → pas de cookie ou expiré)

### Sécurité HTTPS (production)

```python
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### Hachage des mots de passe

Django utilise PBKDF2 avec SHA-256 par défaut (recommandation NIST).

### Validateurs de mot de passe

- Similarité avec les attributs utilisateur
- Longueur minimum : 8 caractères
- Non présent dans la liste des mots de passe courants
- Non entièrement numérique

### Rate limiting (anti brute-force / email bombing)

Depuis la v1.9.0, les endpoints sensibles sont limités via `DEFAULT_THROTTLE_CLASSES`
(DRF) — voir `config/settings/base.py` :

| Endpoint | Limite |
|---|---|
| `POST /api/auth/login/` | 10/minute |
| `POST /api/auth/register/` | 5/heure |
| `POST /api/auth/forgot-password/`, `/reset-password/` | 5/heure |
| `POST /api/auth/resend-verification/`, `/verify-email/` | 5/heure |
| Reste de l'API (par IP anonyme / par utilisateur) | 100/h anonyme, 1000/h connecté |

Sans ça, rien n'empêchait un brute-force de mot de passe, ni un spam qui vide le
quota gratuit Resend (3000 emails/mois) en déclenchant `forgot-password` ou
`resend-verification` en boucle.

### Audit de sécurité — 2026-09

Un audit complet a été mené (application destinée à une commune). **Corrigé** :

- **Clé API Resend exposée** — `old.env`, committé en clair sur le dépôt GitHub
  **public** depuis le commit initial, contenait une vraie clé Resend. Révoquée
  côté Resend, fichier supprimé, `.gitignore` renforcé. *(La présence passée
  dans l'historique git n'a plus d'impact : une clé révoquée est inoffensive.)*
- **axios** 1.13.6 → 1.20.0 : plusieurs CVE haute sévérité (SSRF, pollution de
  prototype, injection CRLF).
- **`IsOwnerOrAgent`** plantait en 500 (au lieu de 401) pour tout accès anonyme
  direct à une réservation/manifestation par son ID.
- **`SECRET_KEY`** : la prod refuse maintenant de démarrer si la variable est
  absente, au placeholder de `.env.example`, ou trop courte.
- **CORS** : retrait du wildcard `*.onrender.com` (partagé par tous les projets
  Render, pas seulement les nôtres) — `CORS_ALLOWED_ORIGINS` explicite suffit.
- **Injection HTML dans les emails** : les champs saisis par les citoyens
  (nom, titre, commentaire admin, message de notification) étaient interpolés
  bruts dans le HTML des emails. Échappés via `django.utils.html.escape()`.
- **Historique des notifications** (`/api/notifications/history/`) cassé par
  le même `prefetch_related()` non supporté que `RoomViewSet`.

**Corrigé également (validé avec l'utilisateur avant modification)** :

- **Refresh token en `localStorage`** → migré en cookie `httpOnly` (v1.9.1,
  voir plus haut) — protection en profondeur contre le vol par XSS.
- **`/api/docs/` et `/api/schema/`** (Swagger) → restreints au rôle agent/admin
  (`IsAgent`, `config/urls.py`). Note pratique : comme ce projet utilise des
  JWT en header et non des sessions/cookies pour l'API, une simple navigation
  au navigateur ne peut pas s'authentifier — il faut joindre le token d'accès
  manuellement (ex. extension REST client) pour consulter la doc.

**Recommandations restantes (arbitrage produit, pas corrigées d'office)** :

- **Pas d'invalidation des sessions existantes** au changement de mot de passe
  ou à la demande de suppression de compte — un refresh token déjà émis reste
  valable jusqu'à 7 jours même après un changement volontaire de mot de passe
  suite à une suspicion de piratage. Nécessiterait une liste de révocation
  maison (le module `token_blacklist` officiel est incompatible MongoDB, mais
  un modèle simple type `PasswordResetToken` referait l'affaire).
- **`react-router-dom`** : vulnérabilité de redirection ouverte, corrigée
  uniquement en v7 (migration majeure depuis la v6 actuelle, à tester
  séparément — pas de correctif dans la branche 6.x).
- **Vite/esbuild** : vulnérabilité modérée (serveur de dev uniquement, pas le
  site déployé) ; correctif nécessite Vite 8, changement majeur.
- **Réservations concurrentes** : la détection de chevauchement de créneau se
  fait par une requête puis un enregistrement séparés, sans verrou — deux
  réservations simultanées pour le même créneau peuvent théoriquement passer
  toutes les deux (race condition). Risque pratique faible vu le trafic
  attendu.
- **MongoDB Atlas** : accès réseau `0.0.0.0/0` nécessaire (Render free n'a pas
  d'IP fixe) — la sécurité repose entièrement sur des identifiants robustes,
  pas sur une restriction réseau.

---

## 13. Déploiement Docker

### Démarrage complet

```bash
# Production
docker compose up -d

# Voir les logs de tous les services
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f backend
docker compose logs -f celery
```

### Services Docker

| Service | Image | Rôle | Port interne |
|---|---|---|---|
| `mongodb` | mongo:7 | Base de données | 27017 |
| `redis` | redis:7-alpine | Broker Celery | 6379 |
| `backend` | custom build | API Django + Gunicorn | 8000 |
| `celery` | custom build | Worker + Beat | — |
| `frontend` | custom build | SPA React compilée | — |
| `nginx` | nginx:alpine | Reverse proxy + SSL | 80, 443 |
| `certbot` | certbot/certbot | Renouvellement SSL | — |

### Commandes utiles

```bash
# Exécuter des migrations
docker compose exec backend python manage.py migrate

# Créer un superutilisateur
docker compose exec backend python manage.py createsuperuser

# Shell Django
docker compose exec backend python manage.py shell

# Shell MongoDB
docker compose exec mongodb mongosh saint_remeze

# Redémarrer un service
docker compose restart backend

# Mettre à jour après un nouveau build
docker compose up -d --build backend frontend
```

### Certificat SSL (Let's Encrypt)

Le renouvellement est automatique via le service `certbot` (toutes les 12 heures).

Pour l'initialisation (première fois) :
```bash
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d salles.saint-remeze.fr \
  --email admin@saintremeze.fr \
  --agree-tos --no-eff-email
```

---

## 14. Déploiement Render (cloud)

Le projet inclut un fichier `render.yaml` pour déploiement sur [render.com](https://render.com).

> **Plan utilisé : Free** — le service backend dort après 15 min d'inactivité (cold start ~30 s). Celery n'est pas disponible sur ce plan.

### Services Render

- **Web Service** : backend Django (Gunicorn)
- **Static Site** : frontend React (gratuit permanent)

> Les services Celery et Redis managé Render nécessitent un plan payant. En production, utiliser **Upstash Redis** (gratuit) comme broker.

### Variables à configurer dans le dashboard Render

```
SECRET_KEY
MONGODB_URI              # MongoDB Atlas (ex: mongodb+srv://...)
MONGODB_DB               # saint_remeze
REDIS_URL                # Upstash Redis (ex: redis://...)
RESEND_API_KEY
FROM_EMAIL               # Ex: "Mairie de Saint Remèze <mairie@saintremeze.fr>"
FRONTEND_URL             # https://saint-remeze-frontend-ic8p.onrender.com
ALLOWED_HOSTS            # .onrender.com,localhost
CORS_ALLOWED_ORIGINS     # https://saint-remeze-frontend-ic8p.onrender.com
DJANGO_SUPERUSER_EMAIL   # email du compte admin (ex: philvercors@gmail.com)
DJANGO_SUPERUSER_PASSWORD # mot de passe du compte admin
```

### Compte administrateur — création et réinitialisation du mot de passe

Au démarrage, la commande `ensure_superuser` est exécutée automatiquement. Elle crée le compte si inexistant, et **force la mise à jour du mot de passe** depuis les variables d'environnement.

> ⚠️ **Ce comportement est volontaire (filet de sécurité pour ne jamais perdre l'accès admin), mais il a une conséquence importante :** `ensure_superuser` s'exécute à **chaque démarrage du processus**, pas seulement lors d'un déploiement Git — un simple réveil après mise en veille (plan Free, 15 min d'inactivité) suffit à le redéclencher. Si le mot de passe du compte `DJANGO_SUPERUSER_EMAIL` est changé **via l'application** (page de connexion → « Mot de passe oublié », ou profil → « Changer le mot de passe »), ce changement sera **écrasé silencieusement** au prochain redémarrage et remplacé par la valeur de `DJANGO_SUPERUSER_PASSWORD` sur Render. Pour changer durablement ce mot de passe, il faut modifier la variable d'environnement elle-même (voir ci-dessous), pas passer par l'application. Un avertissement à ce sujet s'affiche dans l'app pour ce compte (voir `ResetPasswordPage.jsx` et `ProfilePage.jsx`), et le **Django Admin bloque directement** la tentative, à deux endroits (`apps/accounts/admin.py`) : le lien « Change password » sur la fiche de ce compte (`CustomUserAdmin.user_change_password`) et le lien « Change password » du bandeau d'en-tête, présent sur toutes les pages admin (`admin.site.password_change` surchargé) — les deux redirigent sans effectuer le changement, avec un message d'avertissement.

**Pour réinitialiser le mot de passe en production (plan Free — sans accès Shell) :**

1. Dashboard Render → service `saint-remeze-backend` → onglet **Environment**
2. Modifier `DJANGO_SUPERUSER_EMAIL` et `DJANGO_SUPERUSER_PASSWORD` avec les nouvelles valeurs
3. Sauvegarder — Render redémarre automatiquement
4. Au démarrage, `ensure_superuser` met à jour le mot de passe

### Health check Render

L'endpoint `/api/health/` est utilisé par Render pour vérifier la disponibilité du service. Si le service ne répond pas, Render redémarre automatiquement l'instance.

### Dépannage — pannes fréquentes

#### `pymongo.errors.OperationFailure: bad auth : authentication failed`

Le backend crash au démarrage (`ensure_superuser` ou toute requête) avec ce message. C'est un problème d'identifiants **MongoDB Atlas**, pas un bug de code — le mot de passe de l'utilisateur DB référencé par `MONGODB_URI` ne correspond plus à ce qu'attend Atlas (rotation manuelle, caractère spécial non encodé...).

**Correction :**
1. Atlas → **Database Access** → éditer l'utilisateur DB → **Edit Password** → **Autogenerate Secure Password** → copier le nouveau mot de passe.
2. Atlas → **Database** → **Connect** → **Drivers** → copier l'URI, remplacer `<password>`, ajouter `/saint_remeze` avant les paramètres (`?retryWrites=...`).
   ⚠️ Si le mot de passe contient `@ : / ? # % &`, il doit être encodé en URL (ex. `@` → `%40`) — sinon régénérer un mot de passe sans caractère spécial.
3. Render → service backend → **Environment** → mettre à jour `MONGODB_URI` avec la nouvelle URI → **Save Changes** (redéploiement automatique).
4. Vérifier aussi **Atlas → Network Access** : `0.0.0.0/0` doit être autorisé (Render free n'a pas d'IP fixe).

#### `TypeError: cannot use '__fake__.ContentType' as a set element` au démarrage

Apparaît à chaque (re)démarrage pendant `python manage.py migrate --noinput` (signal `post_migrate` → `create_permissions`, incompatible avec `django-mongodb-backend`). **Sans gravité** : le `startCommand` du `render.yaml` chaîne `fix_migration_history` et `migrate` avec `;` (pas `&&`), donc l'échec de cette étape n'empêche pas `ensure_superuser` et `gunicorn` de démarrer normalement juste après.

#### Un compte reste bloqué sur « Veuillez vérifier votre adresse email »

L'utilisateur peut cliquer sur **Renvoyer l'email de vérification** depuis l'écran de connexion (voir [section 10](#10-service-email-resend)). Si l'email n'arrive toujours pas, vérifier en base que `email_verified = false` puis suivre la piste email ci-dessous ; en dernier recours, cocher `email_verified` manuellement dans le Django Admin (`/admin/` → Comptes → section "Saint Remèze") pour débloquer l'accès immédiatement, sans attendre l'email.

---

## 15. Opérations de maintenance

### Sauvegarder la base MongoDB

```bash
# Dump complet
docker compose exec mongodb mongodump \
  --db saint_remeze \
  --out /tmp/backup_$(date +%Y%m%d)

# Copier hors du conteneur
docker compose cp mongodb:/tmp/backup_20260308 ./backups/
```

### Restaurer depuis une sauvegarde

```bash
docker compose cp ./backups/backup_20260308 mongodb:/tmp/
docker compose exec mongodb mongorestore \
  --db saint_remeze /tmp/backup_20260308/saint_remeze
```

### Vider les données de test

```bash
docker compose exec backend python manage.py shell -c "
from apps.reservations.models import Reservation
from apps.manifestations.models import Manifestation
print(f'Réservations : {Reservation.objects.count()}')
print(f'Manifestations : {Manifestation.objects.count()}')
"
```

### Corriger un statut en base

```javascript
// Via mongosh — approuver manuellement une réservation bloquée
db.reservations_reservation.updateOne(
  { _id: ObjectId("...") },
  { $set: { status: "approved", reviewed_at: new Date() } }
)
```

### Surveiller les logs en production

```bash
# Erreurs backend uniquement
docker compose logs backend 2>&1 | grep '"level": "ERROR"'

# Envois d'emails (succès ET échecs — logger "services" au niveau INFO)
docker compose logs backend 2>&1 | grep "\[EMAIL\]"

# Tâches Celery
docker compose logs celery 2>&1 | tail -100
```

Sur Render, faire de même via le dashboard (onglet **Logs**) ou en filtrant sur `[EMAIL]`. Une ligne `[EMAIL] Envoyé à [...] | id=...` confirme que Resend a accepté l'envoi ; `[EMAIL] Échec Resend...` ou `[EMAIL] RESEND_API_KEY non configurée` signale un problème de configuration.

> Le logger `services` (dans `config/settings/production.py`) est au niveau `INFO` depuis la v1.7.1 — avant cette version, seuls les échecs d'envoi remontaient dans les logs, rendant impossible de confirmer qu'un email avait bien été envoyé.

### Regénérer les fichiers statiques

```bash
docker compose exec backend python manage.py collectstatic --noinput
```

### Vérifier la documentation API

La documentation OpenAPI interactive est disponible à :
- Swagger UI : `/api/schema/swagger-ui/`
- Schéma brut : `/api/schema/`

---

---

## 16. Architecture globale — portail et applications

La commune de Saint Remèze dispose de **deux services numériques indépendants** et d'un **portail d'accueil** qui les regroupe.

### Vue d'ensemble

```
                     ┌──────────────────────────────┐
                     │   Portail Web Services        │
                     │  saint-remeze-WEB Services    │
                     │  → services.saint-remeze.fr   │
                     │  (React — site statique)      │
                     └──────────────┬───────────────┘
                                    │  liens externes
               ┌────────────────────┴──────────────────────┐
               ▼                                           ▼
  ┌──────────────────────────┐             ┌──────────────────────────┐
  │  Votre Avis Compte       │             │  Salles Communales       │
  │  (Remarques Citoyennes)  │             │  saint-remeze-salles     │
  │  → avis.saint-remeze.fr  │             │  → salles.saint-remeze.fr│
  │                          │             │                          │
  │  Frontend : React (CRA)  │             │  Frontend : React (Vite) │
  │  Backend  : Node.js      │             │  Backend  : Django/DRF   │
  │  BDD      : MongoDB      │             │  BDD      : MongoDB      │
  │  Déploiement : Vercel    │             │  Déploiement : Render    │
  └──────────────────────────┘             └──────────────────────────┘
```

### Les trois dépôts Git

| Dépôt | Rôle | URL de prod |
|---|---|---|
| `saint-remeze-WEB Services` | Portail d'accueil — 2 cartes de navigation | `services.saint-remeze.fr` |
| `saint-remeze-COMPLET-v7.2` | App "Votre Avis Compte" (signalements citoyens) | `avis.saint-remeze.fr` |
| `saint-remeze-salles` | App "Salles Communales" (réservations) — **ce dépôt** | `salles.saint-remeze.fr` |

### Principe d'architecture

- Le **portail** (`saint-remeze-WEB Services`) est une **SPA React pure**, sans backend ni appels API. Il présente deux cartes cliquables qui ouvrent chacune le service correspondant dans un nouvel onglet.
- Chaque **application** (remarques, salles) est totalement indépendante : backend propre, base de données propre, authentification propre.
- Il n'y a **aucun partage de base de données ou d'API** entre les deux applications.

### Variables d'environnement du portail

Le portail `saint-remeze-WEB Services` utilise deux variables Vite injectées au build :

| Variable | Description | Exemple |
|---|---|---|
| `VITE_AVIS_URL` | URL de l'app "Votre Avis Compte" | `https://saint-remeze-avis.vercel.app` |
| `VITE_SALLES_URL` | URL de l'app "Salles Communales" | `https://salles.saint-remeze.fr` |

Ces variables doivent être renseignées dans les **Environment Variables** du service Render Static Site correspondant.

### Déploiement du portail (Render Static Site)

Le `render.yaml` du dépôt `saint-remeze-WEB Services` déclare un service de type `static` :

```yaml
- type: web
  name: saint-remeze-frontend
  runtime: static
  rootDir: frontend
  buildCommand: "npm ci && npm run build"
  staticPublishPath: dist
  envVars:
    - key: VITE_AVIS_URL
      value: https://saint-remeze-avis.vercel.app   # à adapter
    - key: VITE_SALLES_URL
      value: https://salles.saint-remeze.fr
```

> Le portail est un site 100 % statique : il ne nécessite ni backend, ni base de données, ni Redis, ni Celery.

---

---

## 17. Lexique technique — traduction et explication en français

Glossaire des termes techniques utilisés dans ce manuel et dans le code source. Les termes sont regroupés par thème.

---

### Authentification et sécurité

**Token** *(jeton)*
Un token est une **chaîne de caractères chiffrée** qui prouve l'identité d'un utilisateur sans avoir à retransmettre son mot de passe à chaque requête. Dans cette application, on utilise des tokens JWT (voir ci-dessous).

**JWT — JSON Web Token** *(jeton web JSON)*
Format standard de token composé de trois parties encodées en Base64 séparées par des points : `en-tête.charge_utile.signature`. La charge utile contient l'ID utilisateur, son rôle et la date d'expiration. La signature garantit que personne n'a modifié le contenu. Aucune donnée n'est stockée côté serveur — tout est dans le token lui-même.

**Access Token** *(jeton d'accès)*
Token JWT à courte durée de vie (ici **15 minutes**) envoyé dans chaque requête API dans le header `Authorization: Bearer <token>`. Sa courte durée de vie limite les risques en cas de vol.

**Refresh Token** *(jeton de renouvellement)*
Token JWT à longue durée de vie (ici **7 jours**), stocké côté client. Il sert uniquement à obtenir un nouvel access token quand le précédent a expiré. À chaque renouvellement, un nouveau refresh token est émis et l'ancien est invalidé (rotation).

**Token Rotation** *(rotation de jeton)*
Mécanisme de sécurité : à chaque fois qu'un refresh token est utilisé pour renouveler l'access token, le refresh token lui-même est remplacé par un nouveau. Ainsi, un refresh token volé ne peut être utilisé qu'une seule fois avant d'être invalidé.

**Token Blacklist** *(liste noire de jetons)*
Mécanisme qui consiste à stocker en base les tokens invalidés (déconnexion, changement de mot de passe). **Non utilisé ici** car incompatible avec MongoDB — la sécurité repose sur la courte durée des access tokens et la rotation des refresh tokens.

**Hash / Hachage**
Transformation irréversible d'un mot de passe en une chaîne de caractères illisible. Django utilise PBKDF2-SHA256 : même l'administrateur ne peut pas lire les mots de passe — il ne peut que les réinitialiser.

**CORS — Cross-Origin Resource Sharing** *(partage de ressources entre origines)*
Mécanisme de sécurité des navigateurs qui interdit par défaut à une page web d'interroger une API sur un autre domaine. En production, seul `https://salles.saint-remeze.fr` est autorisé à appeler l'API. En développement, toutes les origines sont acceptées.

**CSRF — Cross-Site Request Forgery** *(falsification de requête inter-sites)*
Attaque où un site malveillant déclenche des actions à l'insu de l'utilisateur sur un autre site. Django intègre une protection automatique via un cookie `csrftoken`. Activé en production avec `CSRF_COOKIE_SECURE = True`.

**SSL / HTTPS** *(Secure Sockets Layer / HyperText Transfer Protocol Secure)*
Protocole de chiffrement des communications entre le navigateur et le serveur. Le cadenas dans la barre d'adresse du navigateur. En Docker, géré par Nginx + Let's Encrypt. Sur Render, automatique.

**HSTS — HTTP Strict Transport Security**
En-tête HTTP qui indique au navigateur de **toujours** utiliser HTTPS pour ce domaine, même si l'utilisateur tape `http://`. Configuré avec `SECURE_HSTS_SECONDS = 31536000` (1 an).

---

### Celery et tâches asynchrones

**Worker** *(ouvrier / processus de travail)*
Processus Celery en attente permanente de tâches à exécuter. Quand une tâche arrive dans Redis, le worker la prend en charge et l'exécute. Dans Docker, c'est le service `celery`. Sur Render, c'est un Background Worker séparé. Sans worker, aucune tâche ne s'exécute jamais.

**Beat** *(batteur / planificateur)*
Composant Celery qui joue le rôle d'**horloge**. Il consulte la planification configurée dans `celery.py` et déclenche les tâches récurrentes aux horaires définis (ex : tous les jours à 2h). Lancé avec le flag `-B` dans la commande de démarrage, il s'exécute dans le même processus que le worker.

**Broker** *(courtier / intermédiaire)*
Le broker est l'intermédiaire entre Django (qui produit des tâches) et Celery (qui les consomme). Dans cette application, c'est **Redis** qui joue ce rôle. Django dépose les tâches dans Redis, Celery les lit.

**Queue / File de messages** *(file d'attente)*
Liste ordonnée de tâches en attente d'exécution, stockée dans Redis. Les tâches sont traitées dans l'ordre d'arrivée (FIFO — First In, First Out).

**Task / Tâche**
Fonction Python décorée avec `@shared_task` qui peut être exécutée de façon asynchrone par Celery. Dans ce projet : `anonymize_pending_deletions`, `warn_users_before_anonymization`, `anonymize_inactive_users`.

**Crontab / Cron**
Format de planification issu du monde Unix. Une expression crontab définit quand une tâche se répète : `crontab(hour=2, minute=0)` signifie "tous les jours à 2h00". Utilisé par Celery Beat pour déclencher les tâches RGPD.

**Persistent Scheduler** *(planificateur persistant)*
Planificateur de Celery Beat qui sauvegarde son état dans un fichier local (`celerybeat-schedule`). Utilisé ici à la place de `django_celery_beat` (incompatible MongoDB) — il redémarre donc au bon endroit même après un arrêt du service.

---

### API et web

**API REST — Application Programming Interface Representational State Transfer**
Interface standardisée permettant à deux logiciels de communiquer via HTTP. L'API de cette application répond en JSON à des requêtes du type `GET /api/rooms/`, `POST /api/reservations/`, etc. Le frontend React l'utilise pour toutes ses opérations.

**Endpoint** *(point d'accès / route API)*
Une URL précise de l'API qui répond à un type d'action. Exemple : `POST /api/auth/login/` est l'endpoint de connexion. Chaque endpoint accepte une ou plusieurs méthodes HTTP (GET, POST, PATCH, DELETE).

**Payload** *(charge utile / données envoyées)*
Les données JSON envoyées dans le corps d'une requête HTTP. Exemple : pour créer une réservation, le payload contient le nom de la salle, la date, l'horaire, le nombre de participants, etc.

**HTTP Methods / Méthodes HTTP**

| Méthode | Sens | Utilisation typique |
|---|---|---|
| `GET` | Lire | Récupérer une liste ou un détail |
| `POST` | Créer | Créer une nouvelle ressource |
| `PATCH` | Modifier partiellement | Mettre à jour quelques champs |
| `PUT` | Remplacer entièrement | Rarement utilisé ici |
| `DELETE` | Supprimer | Supprimer ou désactiver |

**Serializer** *(sérialiseur)*
Composant DRF qui traduit les données dans les deux sens : objet Python → JSON (pour la réponse), et JSON → objet Python (pour la validation des données reçues). Il vérifie aussi que les données sont valides avant de les enregistrer en base.

**ViewSet**
Classe DRF qui regroupe toutes les opérations CRUD d'une ressource (liste, détail, création, modification, suppression) en un seul endroit. Equivalent d'un contrôleur dans d'autres frameworks.

**Middleware** *(couche intermédiaire)*
Code qui s'exécute automatiquement **pour chaque requête HTTP**, avant et après la vue Django. Dans ce projet : `CorsMiddleware` (gère CORS), `WhiteNoiseMiddleware` (sert les statics), `AuditLogMiddleware` (enregistre chaque action dans le journal d'audit).

**Reverse Proxy** *(mandataire inverse)*
Serveur placé devant les applications web qui reçoit toutes les requêtes et les redistribue vers le bon service. Dans ce projet : Nginx (Docker) ou Render (cloud). Le client ne communique jamais directement avec Gunicorn ou le conteneur frontend.

**Health Check** *(vérification de santé)*
Endpoint léger (`GET /api/health/`) qui répond `{"status": "ok"}` pour indiquer que le service fonctionne. Render l'appelle automatiquement toutes les 30 secondes — si le service ne répond pas, Render le redémarre.

**Pagination**
Mécanisme qui découpe les résultats d'une liste en pages de 20 éléments. Évite de renvoyer des milliers de résultats en une seule fois. La page suivante s'obtient avec `?page=2`.

**OpenAPI / Swagger**
Standard de documentation automatique pour les API REST. `drf-spectacular` génère le schéma OpenAPI depuis le code Django. La documentation interactive est consultable à `/api/schema/swagger-ui/`.

---

### Base de données et données

**ORM — Object-Relational Mapper** *(ici : Object-Document Mapper)*
Couche d'abstraction entre le code Python et la base de données. Permet d'écrire `Reservation.objects.filter(status="pending")` au lieu de requêtes MongoDB brutes. `django-mongodb-backend` adapte l'ORM Django, conçu pour les bases relationnelles, à MongoDB.

**Migration**
Fichier Python généré automatiquement par Django (`python manage.py makemigrations`) qui décrit une modification de la structure de la base de données (ajout d'un champ, création d'une collection…). Les migrations s'appliquent avec `python manage.py migrate`.

**Fixture** *(données initiales)*
Fichier JSON contenant des données à charger dans la base au démarrage (`loaddata`). Dans ce projet : `apps/rooms/fixtures.json` contient les salles communales par défaut, `apps/notifications/fixtures.json` contient les services municipaux.

**Soft Delete** *(suppression douce)*
Suppression "virtuelle" : au lieu d'effacer définitivement un enregistrement, on passe son champ `is_active` à `False`. La salle disparaît de l'application mais ses données et l'historique des réservations associées sont conservés. Permet de retrouver les données en cas d'erreur.

**UUID — Universally Unique Identifier** *(identifiant universel unique)*
Chaîne de 36 caractères (`550e8400-e29b-41d4-a716-446655440000`) générée aléatoirement, garantie unique dans le monde entier. Utilisé ici pour identifier les groupes de réservations récurrentes (`recurrence_group`).

**ObjectId**
Identifiant unique généré automatiquement par MongoDB pour chaque document (équivalent de l'auto-increment en SQL). Format hexadécimal de 24 caractères : `507f1f77bcf86cd799439011`.

**CRUD**
Acronyme des quatre opérations de base sur les données : **C**reate (créer), **R**ead (lire), **U**pdate (modifier), **D**elete (supprimer).

**Index**
Structure de données accélérant les recherches en base. Sans index, MongoDB lit tous les documents de la collection pour trouver celui qui correspond. Avec index, il va directement au bon endroit.

---

### Serveurs et déploiement

**WSGI — Web Server Gateway Interface**
Standard Python qui définit comment un serveur web (Nginx, Gunicorn) communique avec une application web Python (Django). Gunicorn implémente ce standard pour faire tourner Django en production.

**Static Files / Fichiers statiques**
Fichiers servis tels quels sans traitement dynamique : CSS, JavaScript, images, polices de caractères. Pour Django Admin : icônes et feuilles de style. Collectés avec `python manage.py collectstatic` dans le dossier `staticfiles/`. Servis par WhiteNoise sur Render, par Nginx en Docker.

**Media Files / Fichiers médias**
Fichiers uploadés par les utilisateurs (photos, documents). Stockés dans `media/`. Non utilisés dans la version actuelle de cette application.

**Build** *(construction)*
Processus de compilation et préparation d'une application avant déploiement. Pour le frontend React : `npm run build` transforme le code source JSX/Vite en fichiers HTML/CSS/JS optimisés dans `dist/`. Pour le backend : installation des dépendances via `pip install`.

**Deploy / Déploiement**
Mise en ligne d'une nouvelle version de l'application sur le serveur de production. Sur Render avec `autoDeploy: true`, chaque push sur la branche `main` du dépôt Git déclenche automatiquement un nouveau déploiement.

**Cold Start** *(démarrage à froid)*
Sur Render Free, le service backend s'endort après 15 minutes d'inactivité pour économiser des ressources. La prochaine requête doit "réveiller" le serveur, ce qui prend environ 30 secondes. Les utilisateurs voient l'application répondre lentement à la première connexion de la journée.

**Environment Variables / Variables d'environnement**
Variables de configuration stockées en dehors du code source (dans un fichier `.env` ou dans le dashboard Render). Permettent d'avoir des valeurs différentes entre développement et production (ex : URL de base de données, clés API) sans modifier le code.

**Container / Conteneur** *(Docker)*
Environnement isolé et reproductible qui contient tout ce qu'il faut pour faire tourner un service : code, dépendances, configuration système. Les conteneurs Docker sont définis dans `docker-compose.yml` et garantissent que l'application tourne de façon identique sur tous les environnements.

**Image Docker**
Modèle en lecture seule à partir duquel sont créés les conteneurs. Le `Dockerfile` du backend décrit comment construire l'image : partir de Python 3.12, copier le code, installer les dépendances, exposer le port 8000.

**Volume Docker**
Stockage persistant partagé entre un conteneur et la machine hôte. Dans ce projet : `mongo_data` (données MongoDB), `redis_data` (données Redis), `static_files` (fichiers statiques collectés). Sans volumes, toutes les données sont perdues à chaque redémarrage de conteneur.

**Network / Réseau Docker**
Réseau virtuel privé entre conteneurs. Le réseau `internal` permet à Nginx, Django, MongoDB, Redis et Celery de communiquer entre eux par leurs noms de service (`mongodb`, `redis`, `backend`…) sans exposer ces services à l'extérieur.

---

### Frontend et interface

**PWA — Progressive Web App** *(application web progressive)*
Application web qui peut être installée sur l'écran d'accueil d'un téléphone comme une app native, fonctionner hors-ligne et recevoir des notifications. Rendue possible par le `service worker` et le fichier `manifest.json`. Dans ce projet, générée par `vite-plugin-pwa`.

**Service Worker** *(travailleur de service)*
Script JavaScript qui s'exécute en arrière-plan dans le navigateur, indépendamment de la page web. Il intercepte les requêtes réseau pour les mettre en cache (fonctionnement hors-ligne), reçoit les notifications push et gère la mise à jour de l'application.

**SPA — Single Page Application** *(application à page unique)*
Application web dont toute l'interface est chargée une seule fois au démarrage. La navigation entre pages ne recharge pas le navigateur — React met à jour uniquement les parties de la page qui changent. Cela donne une expérience fluide proche d'une application native.

**Bundle** *(paquet)*
Fichier JavaScript unique généré par Vite qui contient tout le code de l'application React, ses dépendances et ses styles. `dist/assets/index-xxxx.js` est le bundle principal livré au navigateur.

**Vite**
Outil de build et serveur de développement ultra-rapide pour les applications JavaScript modernes. Remplace Create React App. Transforme les fichiers JSX, TypeScript, CSS en assets optimisés pour la production.

**Cache**
Mécanisme de mémorisation temporaire de données pour éviter de les recalculer ou de les retélécharger. Dans ce projet, le service worker met en cache les fichiers statiques (PWA hors-ligne) et les réponses API fréquentes (planning, liste des salles).

---

### RGPD et données personnelles

**Anonymisation**
Processus irréversible qui remplace les données personnelles d'un utilisateur par des données neutres (`Anonyme`, `deleted_xxx@anonymized.invalid`). Différent de la suppression : les réservations et manifestations associées sont conservées (obligation légale 5 ans) mais déliées de l'identité.

**Consentement / Consent**
Accord explicite donné par l'utilisateur pour le traitement de ses données. Enregistré dans la table `RGPDConsent` avec la date et la version de la politique de confidentialité acceptée. Requis à l'inscription.

**Droit à l'oubli** *(Art. 17 RGPD)*
Droit de l'utilisateur de demander la suppression de ses données. Dans cette application, la demande est enregistrée (`deletion_requested_at`) et l'anonymisation effective intervient 30 jours plus tard (délai de rétractation), exécutée automatiquement par Celery.

**DPO — Data Protection Officer** *(délégué à la protection des données)*
Personne responsable de la conformité RGPD au sein de l'organisation. Contact : `dpo@saintremeze.fr`.

---

*Document mis à jour le 11 septembre 2026 (v1.12.1) — Mairie de Saint Remèze*
*Contact technique : philvercors@gmail.com*
