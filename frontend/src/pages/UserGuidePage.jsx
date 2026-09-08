const sectionStyle = { marginBottom: 28 };
const h2Style = { fontSize: 18, marginBottom: 12, color: "#1a3a5a" };
const pStyle = { color: "#374151", lineHeight: 1.7, fontSize: 14 };
const stepStyle = { background: "#f7f4ef", borderRadius: 10, padding: 16, marginBottom: 12 };

export default function UserGuidePage() {
  return (
    <div style={{ padding: "32px 20px 80px", maxWidth: 720, margin: "0 auto" }} className="animate-fadein">
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Manuel d'utilisation</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 32 }}>
        Guide de prise en main du service de réservation des salles communales de Saint Remèze.
      </p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Réserver une salle</h2>
        <p style={pStyle}>
          Depuis l'accueil ou le menu, cliquez sur <strong>Réserver</strong>. La demande se fait en trois étapes :
        </p>
        <div style={stepStyle}>
          <strong>1. Salle &amp; date</strong> — choisissez la salle, la date et le créneau horaire. Les créneaux déjà
          occupés sont affichés pour éviter les conflits. Une réservation peut être rendue récurrente
          (chaque semaine, toutes les 2 semaines ou chaque mois).
        </div>
        <div style={stepStyle}>
          <strong>2. Vos coordonnées</strong> — nom, association le cas échéant, email et téléphone de contact,
          nombre de participants attendus, et notes complémentaires pour les services municipaux.
        </div>
        <div style={stepStyle}>
          <strong>3. Confirmation</strong> — vérifiez le récapitulatif puis validez. La demande part alors en
          statut <em>« En attente »</em> jusqu'à examen par la mairie.
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Créer une manifestation</h2>
        <p style={pStyle}>
          La rubrique <strong>Manifestation</strong> permet de déclarer un événement public (fête, marché, animation…)
          se déroulant sur un ou plusieurs jours, y compris en extérieur : indiquez son lieu sur la carte en
          cliquant à l'endroit concerné.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Suivre ses demandes</h2>
        <p style={pStyle}>
          <strong>Planning</strong> affiche l'occupation des salles semaine par semaine. <strong>Agenda</strong>{" "}
          regroupe dans une même liste vos réservations et manifestations à venir et passées. Les événements privés
          d'autres usagers apparaissent comme simplement « Réservé », sans détail, pour préserver leur confidentialité.
        </p>
        <p style={pStyle}>
          Chaque demande affiche un statut : <em>En attente</em> (en cours d'examen), <em>Approuvée</em>,{" "}
          <em>Refusée</em> ou <em>Annulée</em>.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Mon profil</h2>
        <p style={pStyle}>
          Accessible via l'icône <em>profil</em> en haut de l'écran : vous y modifiez vos coordonnées et gérez vos
          données personnelles (RGPD).
        </p>
      </section>

      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        Pour toute question, contactez la mairie à{" "}
        <a href="mailto:mairie@saintremeze.fr" style={{ color: "#1a3a5a" }}>mairie@saintremeze.fr</a>. Consultez
        aussi notre <a href="/confidentialite" style={{ color: "#1a3a5a" }}>politique de confidentialité</a>.
      </p>
    </div>
  );
}
