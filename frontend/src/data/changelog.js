export const APP_VERSION = "1.11.7";

export const CHANGELOG = [
  {
    version: "1.11.7",
    date: "2026-09-10",
    label: "Correction : tarif affiché incohérent avec le profil utilisateur",
    changes: [
      "Un compte créé directement depuis Django Admin (sans passer par l'inscription) pouvait se retrouver sans groupe de réservation et donc facturé au mauvais tarif — corrigé, avec rattrapage automatique au démarrage du serveur",
      "Changer son type de compte (profil ou Django Admin) met désormais bien à jour le groupe de réservation associé, et donc le tarif affiché",
      "Les groupes ajoutés manuellement (ex. élu du Conseil Municipal coché à la fois particulier et association) ne sont plus jamais effacés par une sauvegarde ultérieure ne touchant pas au type de compte",
    ],
  },
  {
    version: "1.11.6",
    date: "2026-09-10",
    label: "Accueil réorganisé : particuliers puis associations",
    changes: [
      "La page d'accueil commence désormais par « Salles disponibles pour les particuliers », suivie de « Salles pour les associations »",
      "Une salle réservée à un autre groupe (ex. « Conseil Municipal ») n'apparaît plus dans aucune de ces deux sections",
    ],
  },
  {
    version: "1.11.5",
    date: "2026-09-10",
    label: "Tarifs et accès basés sur les groupes, pas sur le type de compte",
    changes: [
      "Le tarif journalier applicable est désormais déterminé par l'appartenance aux groupes de réservation « Particulier »/« Association », plus par le champ « type de compte »",
      "Un utilisateur membre des deux groupes (ex. élu du Conseil Municipal) bénéficie automatiquement du tarif le plus avantageux et de l'accès aux salles réservées à l'un ou l'autre groupe",
      "Le type de compte choisi à l'inscription continue d'initialiser le groupe correspondant, sans jamais retirer un groupe ajouté manuellement",
    ],
  },
  {
    version: "1.11.4",
    date: "2026-09-10",
    label: "Correction des couleurs du Planning",
    changes: [
      "Le Planning ignorait la couleur définie sur la fiche de la salle (Django Admin) et en générait une automatiquement — corrigé : la couleur choisie pour une salle ou un lieu s'applique désormais bien à ses tuiles dans le Planning",
    ],
  },
  {
    version: "1.11.3",
    date: "2026-09-10",
    label: "Correction : les salles supprimées réapparaissaient au redémarrage",
    changes: [
      "Une salle supprimée depuis le Django Admin (ex. Salle des Fêtes, Salle Polyvalente, Terrain de Sport) réapparaissait à chaque redémarrage du serveur — corrigé",
      "Les fixtures initiales (salles, services municipaux) ne sont désormais chargées qu'une seule fois, au tout premier démarrage sur une base vide",
    ],
  },
  {
    version: "1.11.2",
    date: "2026-09-10",
    label: "Accueil lié à Manifestation + groupes Particulier/Association",
    changes: [
      "La section « Nos lieux » de l'accueil n'apparaît plus que si la fonctionnalité Manifestation est activée (ces salles ne sont réservables que via ce formulaire)",
      "Deux groupes d'utilisateurs « Particulier » et « Association » sont désormais créés automatiquement et affectés à chaque utilisateur selon son type de compte, dès l'inscription",
      "Ces groupes peuvent être utilisés comme n'importe quel groupe pour réserver une salle aux seuls particuliers ou aux seules associations",
    ],
  },
  {
    version: "1.11.1",
    date: "2026-09-10",
    label: "Correction de la suppression groupée dans l'administration",
    changes: [
      "La suppression groupée (sélection de plusieurs éléments) plantait dans le Django Admin, sur tous les types de fiches — corrigé",
    ],
  },
  {
    version: "1.11.0",
    date: "2026-09-10",
    label: "Interrupteur pour la fonctionnalité Manifestation",
    changes: [
      "La déclaration de manifestations peut désormais être mise en pause depuis le Django Admin (Paramètres — Manifestations), sans déploiement",
      "Le lien disparaît du menu et la page affiche un message d'indisponibilité tant que c'est désactivé",
      "Les manifestations déjà approuvées restent visibles dans l'Agenda",
    ],
  },
  {
    version: "1.10.0",
    date: "2026-09-10",
    label: "Particuliers / associations et tarifs journaliers",
    changes: [
      "L'inscription distingue maintenant particuliers et associations, avec numéro RNA obligatoire pour ces dernières",
      "Le tarif horaire des salles est remplacé par deux tarifs journaliers — un pour les particuliers, un pour les associations",
      "Le tarif affiché s'adapte automatiquement au type de compte connecté",
    ],
  },
  {
    version: "1.9.4",
    date: "2026-09-10",
    label: "Refonte visuelle du Planning",
    changes: [
      "Une réservation sur plusieurs heures forme désormais un seul bloc (au lieu de se répéter sur chaque case horaire)",
      "Les réservations simultanées de salles différentes s'affichent côte à côte plutôt qu'empilées",
    ],
  },
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
