import { useEffect, useState } from "react";
import { roomsApi } from "../api/rooms";
import { reservationsApi } from "../api/reservations";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { fmtDate, fmtDateFr } from "../utils/dates";
import Button from "../components/ui/Button";

const STEPS = ["Salle & date", "Vos coordonnées", "Confirmation"];

export default function ReservationPage() {
  const { user } = useAuthStore();
  const { showToast } = useUiStore();
  const [step, setStep] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    room: "", date: "", start_time: "", end_time: "", attendees: "",
    title: "", association: "", contact_name: user?.first_name ? `${user.first_name} ${user.last_name}` : "",
    contact_email: user?.email || "", contact_phone: user?.phone || "", notes: "",
  });

  useEffect(() => {
    roomsApi.list().then(({ data }) => setRooms(data.results || data));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const selectedRoom = rooms.find((r) => r.id === form.room);

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors({});
    try {
      await reservationsApi.create({
        ...form,
        room: form.room,
        attendees: parseInt(form.attendees) || 0,
      });
      setSubmitted(true);
      showToast("Demande envoyée ! Réponse sous 48h.");
    } catch (err) {
      setErrors(err.response?.data || {});
      showToast(err.response?.data?.date?.[0] || "Erreur lors de l'envoi.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ padding: "40px 20px 80px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: "#1a3a5a", marginBottom: 12 }}>Demande envoyée !</h2>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          Votre demande a bien été transmise à la mairie.<br />
          Vous recevrez une réponse à <strong>{form.contact_email}</strong> sous 48 heures ouvrées.
        </p>
        <Button onClick={() => { setSubmitted(false); setStep(0); setForm({ ...form, date: "", start_time: "", end_time: "" }); }} style={{ marginTop: 24 }}>
          Nouvelle réservation
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 560, margin: "0 auto" }}>
      {/* Steps */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: i <= step ? "#1a3a5a" : "#e5e7eb",
              color: i <= step ? "#fff" : "#9ca3af",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
            }}>{i + 1}</div>
            <span style={{ fontSize: 12, color: i === step ? "#1a3a5a" : "#9ca3af", fontWeight: i === step ? 600 : 400 }}>{s}</span>
            {i < STEPS.length - 1 && <div style={{ width: 20, height: 1, background: "#e5e7eb" }} />}
          </div>
        ))}
      </div>

      {/* Step 0 : Salle & date */}
      {step === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Salle *</label>
            <select value={form.room} onChange={set("room")}>
              <option value="">Choisir une salle…</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.image_emoji} {r.name} ({r.capacity} pers.)</option>
              ))}
            </select>
          </div>
          {selectedRoom && (
            <div style={{ background: "#f7f4ef", borderRadius: 10, padding: 14, fontSize: 13, color: "#6b7280" }}>
              Capacité : {selectedRoom.capacity} pers. · {selectedRoom.area_sqm} m²
              {selectedRoom.hourly_rate > 0 && ` · ${selectedRoom.hourly_rate} €/h`}
            </div>
          )}
          <div>
            <label style={labelStyle}>Date *</label>
            <input type="date" value={form.date} onChange={set("date")} min={fmtDate(new Date())} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Début *</label>
              <input type="time" value={form.start_time} onChange={set("start_time")} min="07:00" max="21:00" step="1800" />
            </div>
            <div>
              <label style={labelStyle}>Fin *</label>
              <input type="time" value={form.end_time} onChange={set("end_time")} min="07:00" max="21:00" step="1800" />
            </div>
          </div>
          {errors.date && <p style={{ color: "#991b1b", fontSize: 12 }}>{errors.date}</p>}
          <div>
            <label style={labelStyle}>Nombre de participants *</label>
            <input type="number" min="1" max={selectedRoom?.capacity || 999} value={form.attendees} onChange={set("attendees")} placeholder="Ex : 50" />
            {errors.attendees && <p style={{ color: "#991b1b", fontSize: 12, marginTop: 4 }}>{errors.attendees}</p>}
          </div>
          <div>
            <label style={labelStyle}>Titre de l'événement *</label>
            <input type="text" value={form.title} onChange={set("title")} placeholder="Réunion annuelle, concert…" />
          </div>
          <Button onClick={() => setStep(1)} disabled={!form.room || !form.date || !form.start_time || !form.end_time || !form.title}>
            Suivant →
          </Button>
        </div>
      )}

      {/* Step 1 : Contact */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Association / Organisme</label>
            <input type="text" value={form.association} onChange={set("association")} placeholder="Facultatif" />
          </div>
          <div>
            <label style={labelStyle}>Votre nom *</label>
            <input type="text" value={form.contact_name} onChange={set("contact_name")} required />
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input type="email" value={form.contact_email} onChange={set("contact_email")} required />
          </div>
          <div>
            <label style={labelStyle}>Téléphone</label>
            <input type="tel" value={form.contact_phone} onChange={set("contact_phone")} placeholder="06 00 00 00 00" />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Besoins particuliers, matériel…" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" onClick={() => setStep(0)}>← Retour</Button>
            <Button onClick={() => setStep(2)} disabled={!form.contact_name || !form.contact_email} style={{ flex: 1 }}>
              Suivant →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 : Confirmation */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#f7f4ef", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Récapitulatif</h3>
            {[
              ["Salle", selectedRoom?.name],
              ["Date", fmtDateFr(form.date)],
              ["Horaires", `${form.start_time} – ${form.end_time}`],
              ["Participants", form.attendees],
              ["Événement", form.title],
              ["Contact", `${form.contact_name} (${form.contact_email})`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e5e7eb", fontSize: 14 }}>
                <span style={{ color: "#6b7280" }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            En soumettant ce formulaire, vous acceptez que la Mairie de Saint-Rémèze traite vos données conformément à sa{" "}
            <a href="/confidentialite" style={{ color: "#1a3a5a" }}>politique de confidentialité</a>.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" onClick={() => setStep(1)}>← Retour</Button>
            <Button onClick={handleSubmit} loading={submitting} style={{ flex: 1 }}>
              Envoyer la demande ✓
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" };
