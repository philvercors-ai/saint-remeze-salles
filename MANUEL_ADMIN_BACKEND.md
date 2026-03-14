# Manuel Administrateur & Backend — Salles Communales de Saint Remèze

> Documentation technique à l'usage des administrateurs système et développeurs
> Version 1.0 — Mars 2026

---

## Table des matières

1. [Architecture technique](#1-architecture-technique)
2. [Installation et démarrage](#2-installation-et-démarrage)
3. [Variables d'environnement](#3-variables-denvironnement)
4. [Django Admin (/django-admin/)](#4-django-admin-django-admin)
5. [API REST — Référence complète](#5-api-rest--référence-complète)
6. [Gestion des salles](#6-gestion-des-salles)
7. [Gestion des utilisateurs et rôles](#7-gestion-des-utilisateurs-et-rôles)
8. [Workflow de validation des demandes](#8-workflow-de-validation-des-demandes)
9. [Tâches planifiées Celery (RGPD)](#9-tâches-planifiées-celery-rgpd)
10. [Service email (Resend)](#10-service-email-resend)
10-bis. [Mise en place des emails en production](#10-bis-mise-en-place-des-emails-en-production-resend)
11. [Journal d'audit](#11-journal-daudit)
12. [Sécurité et JWT](#12-sécurité-et-jwt)
13. [Déploiement Docker](#13-déploiement-docker)
14. [Déploiement Render (cloud)](#14-déploiement-render-cloud)
15. [Opérations de maintenance](#15-opérations-de-maintenance)

---

## 1. Architecture technique

### Vue d'ensemble

```
                    ┌─────────────┐
                    │   Nginx     │  :80 / :443
                    │  (reverse   │  SSL + Let's Encrypt
                    │   proxy)    │
                    └──────┬──────┘
               ┌───────────┴───────────┐
               ▼                       ▼
        ┌─────────────┐         ┌─────────────┐
        │   Frontend  │         │   Backend   │
        │  React/Vite │         │  Django/DRF │
        │    (PWA)    │         │  Gunicorn   │
        └─────────────┘         └──────┬──────┘
                                       │
                          ┌────────────┼────────────┐
                          ▼            ▼             ▼
                   ┌───────────┐ ┌─────────┐ ┌───────────┐
                   │  MongoDB  │ │  Redis  │ │  Celery   │
                   │ (données) │ │(broker) │ │  worker   │
                   └───────────┘ └─────────┘ └───────────┘
```

### Stack technique

| Composant | Technologie | Version |
|---|---|---|
| Framework web | Django | 5.1 |
| API REST | Django REST Framework | 3.15 |
| Authentification | djangorestframework-simplejwt | JWT |
| Base de données | MongoDB | 7 |
| Driver MongoDB | django-mongodb-backend | — |
| File de tâches | Celery | 5.4 |
| Broker | Redis | 7 |
| Emails | Resend API | — |
| Serveur WSGI | Gunicorn | 22 |
| Serveur web | Nginx | Alpine |
| Certificat SSL | Let's Encrypt / Certbot | — |
| Documentation API | drf-spectacular (OpenAPI) | — |

### Applications Django

```
backend/
├── config/
│   ├── settings/
│   │   ├── base.py          # Paramètres communs
│   │   ├── development.py   # Dev local
│   │   └── production.py    # Production
│   ├── urls.py              # Routage principal
│   └── celery.py            # Config Celery
└── apps/
    ├── accounts/            # Utilisateurs, auth, RGPD
    ├── rooms/               # Salles communales
    ├── reservations/        # Réservations
    ├── manifestations/      # Manifestations
    ├── notifications/       # Notifications inter-services
    ├── audit/               # Journal d'audit
    └── compat/              # Adaptateurs MongoDB
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
L'API Django admin sur `http://localhost/django-admin/`.

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
| `FROM_EMAIL` | Adresse d'expédition des emails | `mairie@saint-remeze.fr` |
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

## 4. Django Admin (`/django-admin/`)

L'interface d'administration native Django est accessible à `/django-admin/` avec les identifiants d'un superutilisateur.

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
- Édition inline de `is_active` et `hourly_rate` depuis la liste
- Filtres : active, admin uniquement
- Champs : nom, capacité, surface, tarif/h, équipements (liste), description, emoji, couleur, active, réservation admin uniquement

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
| `hourly_rate` | decimal | Tarif horaire en € (0 = gratuit) |
| `equipment` | array | Liste des équipements disponibles |
| `description` | string | Description |
| `image_emoji` | string | Emoji représentatif |
| `color` | string | Couleur hex (#rrggbb) |
| `is_active` | bool | Salle visible dans l'application |
| `requires_admin_only` | bool | Réservation réservée aux admins |

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
- `?room=<room_id>`

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

---

### Manifestations (`/api/manifestations/`)

| Méthode | Endpoint | Auth | Permission | Description |
|---|---|---|---|---|
| `GET` | `/` | Non/Oui | — | Liste (approuvées pour visiteurs, toutes pour agents) |
| `POST` | `/` | Non | — | Créer une manifestation |
| `GET` | `/my/` | Oui | Utilisateur | Mes manifestations |
| `GET` | `/export_csv/` | Oui | Agent | Export CSV |
| `GET` | `/{id}/` | Non | — | Détail |
| `PATCH` | `/{id}/` | Oui | Owner/Agent | Modifier |
| `DELETE` | `/{id}/` | Oui | Owner/Agent | Supprimer |
| `POST` | `/{id}/approve/` | Oui | Agent | Approuver |
| `POST` | `/{id}/reject/` | Oui | Agent | Refuser |

**Paramètres GET `/` :**
- `?status=pending|approved|rejected`

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
  "equipment_needs": ["Sono", "Barnums", "Tables"],
  "is_public": true
}
```

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

Via Django Admin (`/django-admin/rooms/room/add/`) ou via API :

```bash
curl -X POST /api/rooms/ \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Salle du conseil",
    "capacity": 30,
    "area_sqm": 60,
    "hourly_rate": 15.00,
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

### Fixtures initiales

Les salles et services municipaux par défaut sont dans :
- `backend/apps/rooms/fixtures.json`
- `backend/apps/notifications/fixtures.json`

Pour les recharger :
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
| `association` | Association ou organisme |
| `role` | `citoyen` / `agent` / `admin` |
| `email_verified` | Email confirmé ? |
| `email_verify_token` | Token de vérification (durée 24h) |
| `rgpd_consent_date` | Date du consentement RGPD |
| `deletion_requested_at` | Date de demande de suppression |
| `anonymized_at` | Date d'anonymisation effective |

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

La solution : **vérifier le domaine `saint-remeze.fr`** auprès de Resend.

---

### Étape 1 — Créer un compte Resend

1. Aller sur [resend.com](https://resend.com) → **Sign Up**
2. Confirmer votre email
3. L'offre gratuite permet **3 000 emails/mois** — suffisant pour cette application

---

### Étape 2 — Vérifier le domaine `saint-remeze.fr`

C'est l'étape clé. Resend doit prouver que vous contrôlez le domaine.

#### 2.1 — Ajouter le domaine dans Resend

1. Dans le dashboard Resend → **Domains** → **Add Domain**
2. Saisir : `saint-remeze.fr`
3. Cliquer **Add**

Resend affiche alors **3 enregistrements DNS** à créer.

#### 2.2 — Ajouter les enregistrements DNS chez votre hébergeur

Connectez-vous à l'interface DNS de votre registrar (OVH, Gandi, Infomaniak, etc.)
et créez les 3 enregistrements suivants (les valeurs exactes viennent du dashboard Resend) :

**Enregistrement 1 — SPF (TXT)**
```
Type  : TXT
Nom   : saint-remeze.fr   (ou @)
Valeur: v=spf1 include:amazonses.com ~all
TTL   : 3600 (ou défaut)
```

**Enregistrement 2 — DKIM (CNAME)**
```
Type  : CNAME
Nom   : resend._domainkey.saint-remeze.fr
Valeur: (fournie par Resend — ressemble à resend._domainkey.xxxxxxx.dkim.amazonses.com)
TTL   : 3600 (ou défaut)
```

**Enregistrement 3 — DMARC (TXT)** *(optionnel mais recommandé)*
```
Type  : TXT
Nom   : _dmarc.saint-remeze.fr
Valeur: v=DMARC1; p=none;
TTL   : 3600 (ou défaut)
```

> ⚠️ **Attention chez OVH** : ne pas inclure le nom de domaine dans le champ "Sous-domaine".
> Pour `resend._domainkey.saint-remeze.fr`, saisir uniquement `resend._domainkey` dans
> le champ sous-domaine — OVH ajoute `.saint-remeze.fr` automatiquement.

#### 2.3 — Attendre la propagation DNS

La propagation DNS prend en général **5 à 30 minutes** (peut monter à 24h).

Dans le dashboard Resend → Domains → cliquer **Verify** pour déclencher la vérification.
Le statut passe de `Pending` à `Verified` (✅) quand c'est bon.

> Pour vérifier manuellement depuis un terminal :
> ```bash
> dig TXT saint-remeze.fr +short
> # Doit contenir : "v=spf1 include:amazonses.com ~all"
>
> dig CNAME resend._domainkey.saint-remeze.fr +short
> # Doit retourner l'adresse DKIM fournie par Resend
> ```

---

### Étape 3 — Créer une clé API Resend

1. Dashboard Resend → **API Keys** → **Create API Key**
2. Nom : `saint-remeze-production`
3. Permission : **Sending access** (pas besoin de Full access)
4. Domain : sélectionner `saint-remeze.fr` *(restreint la clé à ce domaine)*
5. Cliquer **Add** → **copier la clé immédiatement** (elle ne sera plus affichée)

La clé ressemble à : `re_AbCdEfGh_123456789`

---

### Étape 4 — Configurer les variables d'environnement

#### Sur Render (production)

Dans le dashboard Render → service `saint-remeze-backend` → **Environment** :

| Variable | Valeur à saisir |
|---|---|
| `RESEND_API_KEY` | `re_AbCdEfGh_123456789` (votre clé) |
| `FROM_EMAIL` | `Mairie de Saint Remèze <noreply@saint-remeze.fr>` |

> Le format `"Nom affiché <email@domaine.fr>"` est recommandé pour un affichage
> professionnel dans les boîtes mail des destinataires.

Cliquer **Save Changes** → Render redémarre le service automatiquement.

#### En Docker local (`.env`)

```bash
RESEND_API_KEY=re_AbCdEfGh_123456789
FROM_EMAIL=Mairie de Saint Remèze <noreply@saint-remeze.fr>
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

- **Access token** : durée de vie 15 minutes, transmis dans le header `Authorization: Bearer <token>`
- **Refresh token** : durée de vie 7 jours, stocké côté client (localStorage ou cookie)
- **Rotation** : chaque renouvellement émet un nouveau refresh token et invalide le précédent
- **Pas de blacklist** : `token_blacklist` Django est incompatible MongoDB. La sécurité repose sur la courte durée de l'access token et la rotation du refresh token.

### Renouvellement automatique côté frontend

L'intercepteur Axios (`frontend/src/api/client.js`) gère automatiquement :
1. Détection d'un 401
2. Tentative de renouvellement avec le refresh token
3. File d'attente des requêtes en cours pendant le renouvellement
4. Retry automatique avec le nouvel access token
5. Déconnexion automatique si le refresh échoue

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
  --email admin@saint-remeze.fr \
  --agree-tos --no-eff-email
```

---

## 14. Déploiement Render (cloud)

Le projet inclut un fichier `render.yaml` pour déploiement sur [render.com](https://render.com).

### Services Render

- **Web Service** : backend Django (Gunicorn)
- **Static Site** : frontend React
- **Background Worker** : Celery
- **Redis** : instance Redis managée Render

### Variables à configurer dans le dashboard Render

```
SECRET_KEY
MONGODB_URI        # MongoDB Atlas
RESEND_API_KEY
FROM_EMAIL
FRONTEND_URL
ALLOWED_HOSTS
CORS_ALLOWED_ORIGINS
```

### Health check Render

L'endpoint `/api/health/` est utilisé par Render pour vérifier la disponibilité du service. Si le service ne répond pas, Render redémarre automatiquement l'instance.

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

# Emails non envoyés
docker compose logs backend 2>&1 | grep -i "email"

# Tâches Celery
docker compose logs celery 2>&1 | tail -100
```

### Regénérer les fichiers statiques

```bash
docker compose exec backend python manage.py collectstatic --noinput
```

### Vérifier la documentation API

La documentation OpenAPI interactive est disponible à :
- Swagger UI : `/api/schema/swagger-ui/`
- Schéma brut : `/api/schema/`

---

*Document mis à jour le 14 mars 2026 — Mairie de Saint Remèze*
*Contact technique : admin@saint-remeze.fr*
