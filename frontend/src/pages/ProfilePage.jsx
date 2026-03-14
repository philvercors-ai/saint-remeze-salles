import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { authApi } from "../api/auth";
import { rgpdApi } from "../api/rgpd";
import Button from "../components/ui/Button";
import { APP_VERSION, CHANGELOG } from "../data/changelog";

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const { showToast } = useUiStore();
  const [tab, setTab] = useState("profil");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const navigate = useNavigate();

  const downloadMyData = async (format = "json") => {
    try {
      const res = format === "csv" ? await rgpdApi.myDataCsv() : await rgpdApi.myData();
      if (format === "csv") {
        const url = URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = "mes-donnees-saint-remeze.csv";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const url = URL.createObjectURL(new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "mes-donnees-saint-remeze.json";
        a.click();
        URL.revokeObjectURL(url);
      }
      showToast("Données téléchargées !");
    } catch (_) {
      showToast("Erreur lors du téléchargement.", "error");
    }
  };

  const requestDeletion = async () => {
    try {
      await rgpdApi.requestDeletion();
      showToast("Demande de suppression enregistrée. Votre compte sera anonymisé dans 30 jours.");
      logout();
      navigate("/");
    } catch (err) {
      showToast(err.response?.data?.detail || "Erreur.", "error");
    }
  };

  if (!user) return null;

  const TABS = [
    { id: "profil",   label: "Mon profil" },
    { id: "security", label: "Sécurité" },
    { id: "rgpd",     label: "Mes données (RGPD)" },
    { id: "about",    label: `À propos  v${APP_VERSION}` },
  ];

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Mon compte</h1>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: 28, gap: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? "#1a3a5a" : "#6b7280",
              borderBottom: tab === t.id ? "3px solid #c9a84c" : "3px solid transparent",
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profil */}
      {tab === "profil" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <InfoRow label="Prénom" value={user.first_name} />
          <InfoRow label="Nom" value={user.last_name} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Téléphone" value={user.phone || "—"} />
          <InfoRow label="Association" value={user.association || "—"} />
          <InfoRow label="Rôle" value={{ citoyen: "Citoyen", agent: "Agent municipal", admin: "Administrateur" }[user.role]} />
          <InfoRow label="Membre depuis" value={new Date(user.date_joined).toLocaleDateString("fr-FR")} />
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
            Pour modifier vos informations, contactez : mairie@saint-remeze.fr
          </p>
        </div>
      )}

      {/* Sécurité */}
      {tab === "security" && (
        <ChangePasswordForm showToast={showToast} />
      )}

      {/* RGPD */}
      {tab === "rgpd" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: "#f7f4ef", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Exporter mes données</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              Conformément à l'article 15 du RGPD (droit d'accès) et à l'article 20 (portabilité),
              vous pouvez télécharger l'ensemble de vos données personnelles.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button variant="secondary" size="sm" onClick={() => downloadMyData("json")}>
                📄 Télécharger en JSON
              </Button>
              <Button variant="secondary" size="sm" onClick={() => downloadMyData("csv")}>
                📊 Télécharger en CSV
              </Button>
            </div>
          </div>

          <div style={{ background: "#fee2e2", borderRadius: 12, padding: 20, borderLeft: "4px solid #991b1b" }}>
            <h3 style={{ fontSize: 16, color: "#991b1b", marginBottom: 8 }}>Supprimer mon compte</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              Conformément à l'article 17 du RGPD (droit à l'oubli), vous pouvez demander la suppression
              de votre compte. Vos données seront anonymisées dans un délai de 30 jours.
              Les réservations passées seront conservées 5 ans (obligation légale).
            </p>
            {!confirmDelete ? (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                Demander la suppression de mon compte
              </Button>
            ) : (
              <div>
                <p style={{ color: "#991b1b", fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
                  ⚠️ Cette action est irréversible. Êtes-vous certain ?
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                  <Button variant="danger" size="sm" onClick={requestDeletion}>Confirmer la suppression</Button>
                </div>
              </div>
            )}
          </div>

          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            Contact DPO : <a href="mailto:dpo@saint-remeze.fr" style={{ color: "#1a3a5a" }}>dpo@saint-remeze.fr</a>
            {" · "}
            <a href="/confidentialite" style={{ color: "#1a3a5a" }}>Politique de confidentialité</a>
          </p>
        </div>
      )}

      {/* À propos */}
      {tab === "about" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Saint Remèze - Web Service — application de réservation des salles communales.
          </p>
          {CHANGELOG.map((entry) => (
            <div key={entry.version} style={{ borderLeft: "3px solid #c9a84c", paddingLeft: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#1a3a5a" }}>v{entry.version}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{entry.label}</span>
                <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>{entry.date}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
                {entry.changes.map((c, i) => (
                  <li key={i} style={{ fontSize: 13, color: "#4b5563" }}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ color: "#6b7280", fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: 14 }}>{value}</span>
    </div>
  );
}

function ChangePasswordForm({ showToast }) {
  const [form, setForm] = useState({ current_password: "", new_password: "", new_password_confirm: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.new_password_confirm) {
      setErrors({ new_password_confirm: "Les mots de passe ne correspondent pas." });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      await authApi.changePassword(form);
      showToast("Mot de passe modifié !");
      setForm({ current_password: "", new_password: "", new_password_confirm: "" });
    } catch (err) {
      setErrors(err.response?.data || {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h3 style={{ fontSize: 16, marginBottom: 4 }}>Changer le mot de passe</h3>
      {[
        { name: "current_password",    label: "Mot de passe actuel" },
        { name: "new_password",        label: "Nouveau mot de passe" },
        { name: "new_password_confirm", label: "Confirmer le nouveau mot de passe" },
      ].map(({ name, label }) => (
        <div key={name}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>{label}</label>
          <input
            type="password"
            value={form[name]}
            onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
            required
          />
          {errors[name] && <p style={{ color: "#991b1b", fontSize: 12, marginTop: 4 }}>{errors[name]}</p>}
        </div>
      ))}
      <Button type="submit" loading={loading}>Modifier le mot de passe</Button>
    </form>
  );
}
