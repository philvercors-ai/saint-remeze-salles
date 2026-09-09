export const APP_VERSION = "1.8.0";

export const CHANGELOG = [
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
