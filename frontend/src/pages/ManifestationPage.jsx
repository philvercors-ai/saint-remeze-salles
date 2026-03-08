import { useState } from "react";
import { manifestationsApi } from "../api/manifestations";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { fmtDate } from "../utils/dates";
import { EQUIPMENT_OPTIONS } from "../utils/constants";
import Button from "../components/ui/Button";

export default function ManifestationPage() {
  const { user } = useAuthStore();
  const { showToast } = useUiStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    title: "", association: "",
    contact_name: user?.first_name ? `${user.first_name} ${user.last_name}` : "",
    contact_email: user?.email || "", contact_phone: user?.phone || "",
    date_start: "", date_end: "", location: "Saint Remèze",
    expected_attendees: "", description: "", budget: "",
    equipment_needs: [],
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleEquipment = (item) => setForm((f) => ({
    ...f,
    equipment_needs: f.equipment_needs.includes(item)
      ? f.equipment_needs.filter((x) => x !== item)
      : [...f.equipment_needs, item],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      await manifestationsApi.create({
        ...form,
        expected_attendees: parseInt(form.expected_attendees) || 0,
        budget: parseFloat(form.budget) || 0,
      });
      setSubmitted(true);
      showToast("Dossier déposé ! Réponse de la mairie sous 5 jours.");
    } catch (err) {
      setErrors(err.response?.data || {});
      showToast("Erreur lors de l'envoi.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ padding: "40px 20px 80px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎪</div>
        <h2 style={{ color: "#1a3a5a", marginBottom: 12 }}>Dossier déposé !</h2>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          Votre demande de manifestation a été transmise à la mairie.<br />
          Vous recevrez une réponse à <strong>{form.contact_email}</strong> sous 5 jours ouvrés.
        </p>
        <Button onClick={() => setSubmitted(false)} style={{ marginTop: 24 }}>
          Nouveau dossier
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>Proposer une manifestation</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 28 }}>
        Déposez votre dossier pour organiser un événement à Saint Remèze.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[
          { k: "title",       label: "Titre de la manifestation *", required: true },
          { k: "association", label: "Association / Organisme *", required: true },
          { k: "contact_name",  label: "Responsable *", required: true },
          { k: "contact_email", label: "Email *", type: "email", required: true },
          { k: "contact_phone", label: "Téléphone", type: "tel" },
        ].map(({ k, label, type = "text", required }) => (
          <div key={k}>
            <label style={labelStyle}>{label}</label>
            <input type={type} required={required} value={form[k]} onChange={set(k)} />
            {errors[k] && <p style={{ color: "#991b1b", fontSize: 12, marginTop: 4 }}>{errors[k]}</p>}
          </div>
        ))}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Date de début *</label>
            <input type="date" required value={form.date_start} onChange={set("date_start")} min={fmtDate(new Date())} />
          </div>
          <div>
            <label style={labelStyle}>Date de fin *</label>
            <input type="date" required value={form.date_end} onChange={set("date_end")} min={form.date_start || fmtDate(new Date())} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Lieu *</label>
          <input type="text" required value={form.location} onChange={set("location")} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Participants attendus</label>
            <input type="number" min="0" value={form.expected_attendees} onChange={set("expected_attendees")} />
          </div>
          <div>
            <label style={labelStyle}>Budget estimé (€)</label>
            <input type="number" min="0" step="0.01" value={form.budget} onChange={set("budget")} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Description *</label>
          <textarea required value={form.description} onChange={set("description")} rows={4} placeholder="Décrivez votre manifestation…" />
        </div>

        <div>
          <label style={labelStyle}>Besoins logistiques</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {EQUIPMENT_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleEquipment(item)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12,
                  border: "1.5px solid",
                  borderColor: form.equipment_needs.includes(item) ? "#1a3a5a" : "#d4cfc7",
                  background: form.equipment_needs.includes(item) ? "#1a3a5a" : "#fff",
                  color: form.equipment_needs.includes(item) ? "#fff" : "#6b7280",
                  cursor: "pointer",
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 12, color: "#9ca3af" }}>
          En soumettant ce formulaire, vous acceptez notre{" "}
          <a href="/confidentialite" style={{ color: "#1a3a5a" }}>politique de confidentialité</a>.
        </p>

        <Button type="submit" loading={submitting} disabled={!form.title || !form.association || !form.contact_name || !form.contact_email || !form.date_start || !form.date_end || !form.description}>
          Déposer le dossier ✓
        </Button>
      </form>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" };
