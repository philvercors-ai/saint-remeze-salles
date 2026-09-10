export const APP_VERSION = "1.9.3";

export const CHANGELOG = [
  {
    version: "1.9.3",
    date: "2026-09-10",
    label: "Sections distinctes sur l'accueil : salles, lieux, groupes",
    changes: [
      "La page d'accueil sépare maintenant les salles, les lieux, et les salles réservées à un groupe (ex. « Conseil Municipal ») en sections distinctes",
      "Une section dédiée apparaît automatiquement pour chaque groupe ayant au moins une salle qui lui est réservée",
    ],
  },
  {
    version: "1.9.2",
    date: "2026-09-10",
    label: "Historique des notifications dans l'administration",
    changes: [
      "Les 10 dernières notifications envoyées aux services municipaux s'affichent désormais dans l'onglet Notifications (message, priorité, services destinataires, date, envoyé par, statut d'envoi)",
    ],
  },
  {
    version: "1.9.1",
    date: "2026-09-10",
    label: "Refresh token en cookie sécurisé + restriction Swagger",
    changes: [
      "Le jeton de connexion longue durée n'est plus stocké en localStorage (vulnérable en cas de faille XSS future) mais dans un cookie sécurisé inaccessible à JavaScript",
      "Documentation technique de l'API (/api/docs/) restreinte aux agents et administrateurs",
    ],
  },
  {
    version: "1.9.0",
    date: "2026-09-10",
    label: "Audit de sécurité",
    changes: [
      "Clé API Resend exposée publiquement sur le dépôt GitHub : révoquée et retirée",
      "Protection anti brute-force (login) et anti email-bombing (mot de passe oublié, vérification email)",
      "Correction d'un plantage serveur sur les accès anonymes à une réservation/manifestation",
      "Blocage du démarrage en production avec une clé secrète absente ou faible",
      "Restriction CORS resserrée, échappement des champs utilisateur dans les emails",
      "Correction de l'historique des notifications, resté cassé depuis son lancement",
      "Dépendance axios mise à jour (plusieurs failles de sécurité corrigées)",
    ],
  },
  {
    version: "1.8.0",
    date: "2026-09-09",
    label: "Groupes d'utilisateurs et réservations restreintes",
    changes: [
      "Nouveaux groupes d'utilisateurs (ex : « Conseil Municipal »), gérés depuis le Django Admin",
      "Une salle peut être réservée aux seuls membres d'un ou plusieurs groupes (le compte admin garde toujours accès à tout)",
      "S'applique aux réservations classiques, récurrentes et aux manifestations en salle communale",
      "Le formulaire de réservation ne propose plus les salles non accessibles à l'utilisateur connecté",
    ],
  },
  {
    version: "1.7.2",
    date: "2026-09-09",
    label: "Agenda, emails et sécurité du compte admin",
    changes: [
      "Manuel administrateur : rendu HTML lisible avec sommaire cliquable, au lieu du fichier brut",
      "Bouton « Renvoyer l'email de vérification » sur l'écran de connexion",
      "Logs d'envoi d'emails visibles en production (succès et échecs)",
      "Protection du mot de passe du compte administrateur principal contre un changement accidentel (Django Admin et application)",
      "Correction : réservations hors semaine courante invisibles dans l'Agenda",
      "Agenda : filtres de période (semaine/mois en cours ou prochain(e), navigation ← →, vue « Tous les événements » par défaut)",
    ],
  },
  {
    version: "1.7.1",
    date: "2026-09-08",
    label: "Accès aux manuels depuis l'application",
    changes: [
      "Icône « Manuel d'utilisation » dans le bandeau d'en-tête, accessible à tous",
      "Icône « Manuel administrateur » dans le bandeau, visible uniquement pour le rôle admin",
      "Nouvelle page /manuel : guide de prise en main (réservation, manifestation, agenda, statuts)",
    ],
  },
  {
    version: "1.7.0",
    date: "2026-04-27",
    label: "Gestion des stocks logistiques",
    changes: [
      "Équipements disponibles : Tables, Chaises, Estrade, Sono, Vidéoprojecteur, Éclairage",
      "Disponibilité en temps réel selon les dates saisies",
      "Indicateurs visuels : vert / orange / rouge par équipement",
      "Sélection par quantité avec maximum limité au stock disponible",
    ],
  },
  {
    version: "1.6.0",
    date: "2026-04-14",
    label: "Architecture portail",
    changes: [
      "Portail Web Services : page d'accueil unifiée pour les deux services municipaux",
      "Séparation nette entre 'Votre Avis Compte' (remarques citoyennes) et 'Salles Communales' (réservations)",
      "Manuel admin mis à jour — section architecture globale portail + applications",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-03-09",
    label: "Validation temps réel",
    changes: [
      "Détection immédiate de conflit de créneaux (salle + date + horaires)",
      "Alerte capacité : erreur si le nombre de participants dépasse la limite",
      "Bouton « Suivant » bloqué tant qu'un conflit ou dépassement est actif",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-03-08",
    label: "Visibilité & administration",
    changes: [
      "Réservations et manifestations publiques ou privées",
      "Bascule admin/citoyen dans la barre de navigation",
      "Redirection automatique des admins vers /admin à la connexion",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-03-08",
    label: "Manifestations avec GPS",
    changes: [
      "Formulaire dossier de manifestation complet",
      "Choix salle communale ou lieu extérieur",
      "Carte interactive Leaflet pour géolocaliser le lieu",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-03-08",
    label: "Planning amélioré",
    changes: [
      "Couleurs distinctes par salle + légende",
      "Navigation par semaine (précédente / suivante)",
      "Grille horaire complète de la journée",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-03-08",
    label: "Réservations récurrentes",
    changes: [
      "Récurrence hebdomadaire, bimensuelle ou mensuelle",
      "Gestion groupée : approbation / rejet de toute une série",
      "UUID de groupe pour identifier les séries liées",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-07",
    label: "Lancement",
    changes: [
      "Authentification complète : inscription, vérification e-mail, connexion JWT",
      "Réservation de salles communales avec approbation admin",
      "Planning hebdomadaire et agenda des manifestations",
      "Interface d'administration : statistiques, exports CSV, notifications",
      "Conformité RGPD : export données, suppression de compte différée",
      "Application installable (PWA)",
    ],
  },
];
