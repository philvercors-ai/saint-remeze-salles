export const APP_VERSION = "1.6.0";

export const CHANGELOG = [
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
