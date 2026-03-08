import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { roomsApi } from "../api/rooms";
import { reservationsApi } from "../api/reservations";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { fmtDate, fmtDateFr } from "../utils/dates";
import Button from "../components/ui/Button";

const STEPS = ["Salle & date", "Vos coordonnées", "Confirmation"];

const RECURRENCE_OPTIONS = [
  { value: "weekly",   label: "Chaque semaine" },
  { value: "biweekly", label: "Toutes les 2 semaines" },
  { value: "monthly",  label: "Chaque mois (même jour)" },
];

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" };

export default function ReservationPage() {
  const { user } = useAuthStore();
  const { showToast } = useUiStore();
  const [step, setStep] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    room: "", date: "", start_time: "", end_time: "", attendees: "",
    title: "", association: "",
    contact_name: user?.first_name ? `${user.first_name} ${user.last_name}` : "",
    contact_email: user?.email || "", contact_phone: user?.phone || "", notes: "",
    is_public: true,
  });

  const [recurrence, setRecurrence] = useState({
    enabled: false,
    type: "weekly",
    end_date: "",
  });

  useEffect(() => {
    roomsApi.list().then(({ data }) => setRooms(data.results || data));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setRec = (k) => (e) => setRecurrence((r) => ({ ...r, [k]: e.target.value }));

  const selectedRoom = rooms.find((r) => r.id === form.room);

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors({});
    try {
      if (recurrence.enabled) {
        const { data } = await reservationsApi.createRecurring({
          ...form,
          room: form.room,
          attendees: parseInt(form.attendees) || 0,
          recurrence_type: recurrence.type,
          recurrence_end_date: recurrence.end_date,
        });
        setSubmitResult({ recurring: true, count: data.created, skipped: data.skipped });
      } else {
        await reservationsApi.create({
          ...form,
          room: form.room,
          attendees: parseInt(form.attendees) || 0,
        });
        setSubmitResult({ recurring: false });
      }
      setSubmitted(true);
      showToast(recurrence.enabled ? `Série créée (${submitResult?.count || ""} dates) !` : "Demande envoyée ! Réponse sous 48h.");
    } catch (err) {
      setErrors(err.response?.data || {});
      const msg = err.response?.data?.detail || err.response?.data?.date?.[0] || "Erreur lors de l'envoi.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setSubmitResult(null);
    setStep(0);
    setForm((f) => ({ ...f, date: "", start_time: "", end_time: "" }));
    setRecurrence({ enabled: false, type: "weekly", end_date: "" });
  };

  if (submitted) {
    const count = submitResult?.count;
    const skipped = submitResult?.skipped || [];
    return (
      <div style={{ padding: "40px 20px 80px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: "#1a3a5a", marginBottom: 12 }}>
          {submitResult?.recurring ? "Série créée !" : "Demande envoyée !"}
        </h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 8 }}>
          {submitResult?.recurring
            ? <><strong>{count}</strong> réservation{count > 1 ? "s" : ""} créée{count > 1 ? "s" : ""}.<br />Un email de confirmation a été envoyé à <strong>{form.contact_email}</strong>.</>
            : <>Votre demande a bien été transmise à la mairie.<br />Vous recevrez une réponse à <strong>{form.contact_email}</strong> sous 48 heures ouvrées.</>
          }
        </p>
        {skipped.length > 0 && (
          <p style={{ color: "#92400e", background: "#fef3c7", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginTop: 8 }}>
            {skipped.length} date{skipped.length > 1 ? "s" : ""} ignorée{skipped.length > 1 ? "s" : ""} (créneau déjà occupé) :<br />
            {skipped.join(", ")}
          </p>
        )}
        <Button onClick={resetForm} style={{ marginTop: 24 }}>
          Nouvelle réservation
        </Button>
      </div>
    );
  }

  // Date min pour la fin de récurrence = date de début + 1 jour
  const minEndDate = form.date
    ? new Date(new Date(form.date).getTime() + 86400000).toISOString().split("T")[0]
    : fmtDate(new Date());

  const step0Valid = form.room && form.date && form.start_time && form.end_time && form.title &&
    (!recurrence.enabled || recurrence.end_date);

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

          {/* ── Panneau récurrence ── */}
          <div style={{ border: `1.5px solid ${recurrence.enabled ? "#1a3a5a" : "#e5e7eb"}`, borderRadius: 10, overflow: "hidden", transition: "border-color .2s" }}>
            <label style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", cursor: "pointer",
              background: recurrence.enabled ? "#f0f4f8" : "#fafafa",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "#1a3a5a" }}>
                <RefreshCw size={15} />
                Réservation récurrente
              </span>
              <input
                type="checkbox"
                checked={recurrence.enabled}
                onChange={(e) => setRecurrence((r) => ({ ...r, enabled: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: "#1a3a5a" }}
              />
            </label>
            {recurrence.enabled && (
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid #e5e7eb" }}>
                <div>
                  <label style={labelStyle}>Fréquence</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {RECURRENCE_OPTIONS.map(({ value, label }) => (
                      <label key={value} style={{
                        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                        padding: "9px 12px", borderRadius: 8,
                        background: recurrence.type === value ? "#f0f4f8" : "#fff",
                        border: `1.5px solid ${recurrence.type === value ? "#1a3a5a" : "#e5e7eb"}`,
                        fontSize: 14,
                      }}>
                        <input
                          type="radio"
                          name="recurrence_type"
                          value={value}
                          checked={recurrence.type === value}
                          onChange={setRec("type")}
                          style={{ accentColor: "#1a3a5a" }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Répéter jusqu'au *</label>
                  <input
                    type="date"
                    value={recurrence.end_date}
                    onChange={setRec("end_date")}
                    min={minEndDate}
                  />
                  {recurrence.end_date && form.date && (
                    <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      ≈ {countOccurrences(form.date, recurrence.end_date, recurrence.type)} occurrence(s)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Visibilité ── */}
          <VisibilityToggle
            value={form.is_public}
            onChange={(v) => setForm((f) => ({ ...f, is_public: v }))}
            label="réservation"
          />

          <Button onClick={() => setStep(1)} disabled={!step0Valid}>
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
              recurrence.enabled
                ? ["Première date", fmtDateFr(form.date)]
                : ["Date", fmtDateFr(form.date)],
              ["Horaires", `${form.start_time} – ${form.end_time}`],
              ["Participants", form.attendees],
              ["Événement", form.title],
              ["Contact", `${form.contact_name} (${form.contact_email})`],
              ["Visibilité", form.is_public ? "🌐 Public" : "🔒 Privé"],
              ...(recurrence.enabled ? [
                ["Récurrence", RECURRENCE_OPTIONS.find(o => o.value === recurrence.type)?.label],
                ["Jusqu'au", fmtDateFr(recurrence.end_date)],
                ["Nb d'occurrences", `≈ ${countOccurrences(form.date, recurrence.end_date, recurrence.type)}`],
              ] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e5e7eb", fontSize: 14 }}>
                <span style={{ color: "#6b7280" }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
          {recurrence.enabled && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#1e40af", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <RefreshCw size={14} style={{ marginTop: 2, flexShrink: 0 }} />
              Chaque occurrence sera soumise individuellement à validation. La mairie peut approuver ou refuser toute la série en un clic.
            </div>
          )}
          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            En soumettant ce formulaire, vous acceptez que la Mairie de Saint Remèze traite vos données conformément à sa{" "}
            <a href="/confidentialite" style={{ color: "#1a3a5a" }}>politique de confidentialité</a>.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" onClick={() => setStep(1)}>← Retour</Button>
            <Button onClick={handleSubmit} loading={submitting} style={{ flex: 1 }}>
              {recurrence.enabled ? "Envoyer la série ✓" : "Envoyer la demande ✓"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Toggle public / privé réutilisable. */
function VisibilityToggle({ value, onChange, label }) {
  return (
    <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", background: "#fafafa", fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 1 }}>
        Visibilité sur le planning
      </div>
      <div style={{ display: "flex" }}>
        <label style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
          cursor: "pointer", background: value ? "#eff6ff" : "#fff",
          borderRight: "1px solid #e5e7eb", transition: "background .15s",
        }}>
          <input type="radio" name={`vis_${label}`} checked={value} onChange={() => onChange(true)} style={{ accentColor: "#1d4ed8" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>🌐 Public</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Titre et salle visibles de tous</div>
          </div>
        </label>
        <label style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
          cursor: "pointer", background: !value ? "#fef2f2" : "#fff", transition: "background .15s",
        }}>
          <input type="radio" name={`vis_${label}`} checked={!value} onChange={() => onChange(false)} style={{ accentColor: "#dc2626" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>🔒 Privé</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Créneau grisé « Réservé » pour les autres</div>
          </div>
        </label>
      </div>
    </div>
  );
}

/** Compte approximativement le nombre d'occurrences pour l'affichage. */
function countOccurrences(startDate, endDate, type) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(0, Math.round((end - start) / 86400000));
  if (type === "weekly")   return Math.min(52, Math.floor(days / 7) + 1);
  if (type === "biweekly") return Math.min(52, Math.floor(days / 14) + 1);
  if (type === "monthly")  return Math.min(52, Math.floor(days / 30) + 1);
  return 1;
}
