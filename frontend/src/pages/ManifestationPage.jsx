import { useState, useEffect, useRef } from "react";
import { manifestationsApi } from "../api/manifestations";
import { roomsApi } from "../api/rooms";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { fmtDate } from "../utils/dates";
import { EQUIPMENT_OPTIONS } from "../utils/constants";
import Button from "../components/ui/Button";

/* Centre de Saint Remèze */
const SAINT_REMEZE = [44.3911, 4.5092];

/* ── Carte de sélection GPS (Leaflet vanilla dans useEffect) ────────────── */
function MapPicker({ lat, lng, onChange }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Import dynamique pour éviter les problèmes SSR / Vite
    Promise.all([
      import("leaflet"),
      import("leaflet/dist/leaflet.css"),
    ]).then(([{ default: L }]) => {
      const map = L.map(containerRef.current).setView(
        lat && lng ? [lat, lng] : SAINT_REMEZE,
        14,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      /* Marqueur rond rouge sans dépendance sur les images Leaflet */
      const makeIcon = (L) => L.divIcon({
        html: `<div style="
          width:16px;height:16px;background:#dc2626;
          border:3px solid #fff;border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,.45);
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        className: "",
      });

      if (lat && lng) {
        markerRef.current = L.marker([lat, lng], { icon: makeIcon(L) }).addTo(map);
      }

      map.on("click", (e) => {
        const { lat: la, lng: lo } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([la, lo]);
        } else {
          markerRef.current = L.marker([la, lo], { icon: makeIcon(L) }).addTo(map);
        }
        onChange(parseFloat(la.toFixed(6)), parseFloat(lo.toFixed(6)));
      });

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div
        ref={containerRef}
        style={{ height: 260, borderRadius: 10, overflow: "hidden", border: "1.5px solid #e5e7eb" }}
      />
      {lat && lng ? (
        <p style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
          📍 {lat.toFixed(5)}, {lng.toFixed(5)} — cliquez sur la carte pour déplacer le point
        </p>
      ) : (
        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
          Cliquez sur la carte pour placer un point GPS (facultatif)
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Page principale
   ════════════════════════════════════════════════════════════════════════════ */
export default function ManifestationPage() {
  const { user }      = useAuthStore();
  const { showToast } = useUiStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [errors,     setErrors]     = useState({});
  const [rooms,      setRooms]      = useState([]);

  const [form, setForm] = useState({
    title: "",
    association: "",
    contact_name:  user?.first_name ? `${user.first_name} ${user.last_name}` : "",
    contact_email: user?.email  || "",
    contact_phone: user?.phone  || "",
    date_start: "",
    date_end: "",
    /* lieu */
    location_type: "exterior",
    room: "",
    location: "",
    gps_lat: null,
    gps_lng: null,
    /* reste */
    expected_attendees: "",
    description: "",
    budget: "",
    equipment_needs: [],
    is_public: true,
  });

  useEffect(() => {
    roomsApi.list().then(({ data }) => setRooms(data.results || data));
  }, []);

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
      const payload = {
        ...form,
        expected_attendees: parseInt(form.expected_attendees) || 0,
        budget: parseFloat(form.budget) || 0,
        room: form.location_type === "room" ? form.room || null : null,
        location: form.location_type === "room" ? "" : form.location,
        gps_lat: form.location_type === "exterior" ? form.gps_lat : null,
        gps_lng: form.location_type === "exterior" ? form.gps_lng : null,
      };
      await manifestationsApi.create(payload);
      setSubmitted(true);
      showToast("Dossier déposé ! Réponse de la mairie sous 5 jours.");
    } catch (err) {
      setErrors(err.response?.data || {});
      showToast("Erreur lors de l'envoi.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const isRoomValid = form.location_type === "room" ? !!form.room : true;
  const isLocValid  = form.location_type === "exterior" ? !!form.location : true;
  const canSubmit   = form.title && form.association && form.contact_name &&
                      form.contact_email && form.date_start && form.date_end &&
                      form.description && isRoomValid && isLocValid;

  if (submitted) {
    return (
      <div style={{ padding: "40px 20px 80px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎪</div>
        <h2 style={{ color: "#1a3a5a", marginBottom: 12 }}>Dossier déposé !</h2>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          Votre demande a été transmise à la mairie.<br />
          Vous recevrez une réponse à <strong>{form.contact_email}</strong> sous 5 jours ouvrés.
        </p>
        <Button onClick={() => setSubmitted(false)} style={{ marginTop: 24 }}>
          Nouveau dossier
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>Proposer une manifestation</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 28 }}>
        Déposez votre dossier pour organiser un événement à Saint Remèze.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Infos générales */}
        {[
          { k: "title",         label: "Titre de la manifestation *", required: true },
          { k: "association",   label: "Association / Organisme *", required: true },
          { k: "contact_name",  label: "Responsable *", required: true },
          { k: "contact_email", label: "Email *", type: "email", required: true },
          { k: "contact_phone", label: "Téléphone", type: "tel" },
        ].map(({ k, label, type = "text", required }) => (
          <div key={k}>
            <label style={labelStyle}>{label}</label>
            <input type={type} required={required} value={form[k]} onChange={set(k)} />
            {errors[k] && <p style={errStyle}>{errors[k]}</p>}
          </div>
        ))}

        {/* Dates */}
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
        {errors.date_end && <p style={errStyle}>{errors.date_end}</p>}

        {/* ── Lieu ─────────────────────────────────────────────────────────── */}
        <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          {/* Toggle salle / extérieur */}
          <div style={{ display: "flex" }}>
            {[
              { value: "room",     label: "🏛️ Lieu communal" },
              { value: "exterior", label: "🌿 Lieu extérieur" },
            ].map(({ value, label }) => {
              const active = form.location_type === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, location_type: value, room: "", location: "", gps_lat: null, gps_lng: null }))}
                  style={{
                    flex: 1, padding: "12px 8px", border: "none",
                    background: active ? "#1a3a5a" : "#f8fafc",
                    color: active ? "#fff" : "#6b7280",
                    fontWeight: active ? 700 : 400, fontSize: 14,
                    cursor: "pointer", transition: "all .15s",
                    borderRight: value === "room" ? "1px solid #e5e7eb" : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Contenu selon le type */}
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {form.location_type === "room" ? (
              <>
                <div>
                  <label style={labelStyle}>Lieu *</label>
                  <select value={form.room} onChange={set("room")} required>
                    <option value="">Choisir un lieu…</option>
                    {rooms.filter(r => r.category === "salle").length > 0 && (
                      <optgroup label="Salles">
                        {rooms.filter(r => r.category === "salle").map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.image_emoji} {r.name} ({r.capacity} pers.)
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {rooms.filter(r => r.category === "lieu").length > 0 && (
                      <optgroup label="Lieux">
                        {rooms.filter(r => r.category === "lieu").map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.image_emoji} {r.name} ({r.capacity} pers.)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {errors.room && <p style={errStyle}>{errors.room}</p>}
                </div>
                {form.room && (() => {
                  const r = rooms.find((x) => x.id === form.room);
                  return r ? (
                    <div style={{ background: "#f7f4ef", borderRadius: 8, padding: 12, fontSize: 13, color: "#6b7280" }}>
                      Capacité : {r.capacity} pers. · {r.area_sqm} m²
                      {r.hourly_rate > 0 && ` · ${r.hourly_rate} €/h`}
                    </div>
                  ) : null;
                })()}
              </>
            ) : (
              <>
                <div>
                  <label style={labelStyle}>Nom du lieu / Adresse *</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={set("location")}
                    placeholder="Ex : Place du village, Terrain des fêtes…"
                  />
                  {errors.location && <p style={errStyle}>{errors.location}</p>}
                </div>
                <div>
                  <label style={labelStyle}>
                    Point GPS sur la carte <span style={{ fontWeight: 400, color: "#9ca3af" }}>(facultatif)</span>
                  </label>
                  <MapPicker
                    lat={form.gps_lat}
                    lng={form.gps_lng}
                    onChange={(la, lo) => setForm((f) => ({ ...f, gps_lat: la, gps_lng: lo }))}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Participants & budget */}
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

        {/* Description */}
        <div>
          <label style={labelStyle}>Description *</label>
          <textarea required value={form.description} onChange={set("description")} rows={4} placeholder="Décrivez votre manifestation…" />
        </div>

        {/* Besoins logistiques */}
        <div>
          <label style={labelStyle}>Besoins logistiques</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {EQUIPMENT_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleEquipment(item)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, border: "1.5px solid",
                  borderColor: form.equipment_needs.includes(item) ? "#1a3a5a" : "#d4cfc7",
                  background:  form.equipment_needs.includes(item) ? "#1a3a5a" : "#fff",
                  color:       form.equipment_needs.includes(item) ? "#fff" : "#6b7280",
                  cursor: "pointer",
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Visibilité */}
        <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: "#fafafa", fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 1 }}>
            Visibilité sur l'agenda
          </div>
          <div style={{ display: "flex" }}>
            <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", background: form.is_public ? "#eff6ff" : "#fff", borderRight: "1px solid #e5e7eb" }}>
              <input type="radio" name="vis_manif" checked={form.is_public} onChange={() => setForm((f) => ({ ...f, is_public: true }))} style={{ accentColor: "#1d4ed8" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>🌐 Public</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Détails visibles de tous</div>
              </div>
            </label>
            <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", background: !form.is_public ? "#fef2f2" : "#fff" }}>
              <input type="radio" name="vis_manif" checked={!form.is_public} onChange={() => setForm((f) => ({ ...f, is_public: false }))} style={{ accentColor: "#dc2626" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>🔒 Privé</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Affiché « Réservé » pour les autres</div>
              </div>
            </label>
          </div>
        </div>

        <p style={{ fontSize: 12, color: "#9ca3af" }}>
          En soumettant ce formulaire, vous acceptez notre{" "}
          <a href="/confidentialite" style={{ color: "#1a3a5a" }}>politique de confidentialité</a>.
        </p>

        <Button type="submit" loading={submitting} disabled={!canSubmit}>
          Déposer le dossier ✓
        </Button>
      </form>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" };
const errStyle   = { color: "#991b1b", fontSize: 12, marginTop: 4 };
