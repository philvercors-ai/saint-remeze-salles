import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { reservationsApi } from "../api/reservations";
import { roomsApi } from "../api/rooms";
import { getWeekDays, fmtDate, fmtDateFr, HOURS } from "../utils/dates";
import { addWeeks, subWeeks, getISOWeek, getISOWeekYear } from "date-fns";

/** Formate une date en numéro de semaine ISO : "2026-W10" */
function toISOWeekParam(date) {
  const w = String(getISOWeek(date)).padStart(2, "0");
  return `${getISOWeekYear(date)}-W${w}`;
}

const DAY_START_MIN = 7 * 60;   // 07:00 — doit correspondre à HOURS[0]
const DAY_END_MIN = 22 * 60;    // 22:00 — fin du dernier créneau HOURS
const HOUR_HEIGHT = 44;         // px par heure dans la grille

const toMin = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Assigne à chaque réservation d'une journée une colonne (côte à côte plutôt
 * qu'empilées) : algorithme classique de mise en page calendrier — tri par
 * heure de début, placement dans la première colonne libre, regroupement des
 * réservations qui se chevauchent pour ne diviser la largeur qu'entre elles.
 */
function layoutDayEvents(events) {
  const sorted = [...events].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const groups = [];

  sorted.forEach((ev) => {
    let group = groups[groups.length - 1];
    if (!group || group.maxEnd <= ev.startMin) {
      group = { events: [], columns: [], maxEnd: -Infinity };
      groups.push(group);
    }
    let col = 0;
    while (group.columns[col] !== undefined && group.columns[col] > ev.startMin) col++;
    group.columns[col] = ev.endMin;
    group.maxEnd = Math.max(group.maxEnd, ev.endMin);
    group.events.push({ ...ev, col });
  });

  return groups.flatMap((group) =>
    group.events.map((ev) => ({ ...ev, totalCols: group.columns.length }))
  );
}

/** Modale de modification/suppression d'une réservation, ouverte en cliquant
 * sur une tuile du planning (uniquement si can_edit — propriétaire ou
 * agent/admin, calculé côté serveur). Charge les détails complets (la tuile
 * planning n'expose que des champs minimaux) avant d'afficher le formulaire. */
function EditReservationModal({ reservationId, onClose, onChanged }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    reservationsApi.get(reservationId).then(({ data }) => {
      if (cancelled) return;
      setForm({
        title: data.title,
        date: data.date,
        start_time: (data.start_time || "").slice(0, 5),
        end_time: (data.end_time || "").slice(0, 5),
        attendees: data.attendees,
        notes: data.notes || "",
        is_public: data.is_public,
      });
    }).catch(() => {
      if (!cancelled) setError("Impossible de charger cette réservation.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reservationId]);

  const firstError = (data) => {
    if (!data) return "Une erreur est survenue.";
    if (typeof data.detail === "string") return data.detail;
    const firstKey = Object.keys(data)[0];
    const val = data[firstKey];
    return Array.isArray(val) ? val[0] : String(val);
  };

  const save = () => {
    setSaving(true);
    setError("");
    reservationsApi.update(reservationId, form)
      .then(() => { onChanged(); onClose(); })
      .catch((err) => setError(firstError(err.response?.data)))
      .finally(() => setSaving(false));
  };

  const remove = () => {
    if (!window.confirm("Supprimer définitivement cette réservation ?")) return;
    setDeleting(true);
    setError("");
    reservationsApi.delete(reservationId)
      .then(() => { onChanged(); onClose(); })
      .catch(() => { setError("Impossible de supprimer cette réservation."); setDeleting(false); });
  };

  const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, marginTop: 4, marginBottom: 12, boxSizing: "border-box" };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#374151" };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Modifier la réservation</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#9ca3af" }}>Chargement…</p>
        ) : !form ? (
          <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>
        ) : (
          <>
            <label style={labelStyle}>Titre</label>
            <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

            <label style={labelStyle}>Date</label>
            <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Début</label>
                <input type="time" style={inputStyle} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Fin</label>
                <input type="time" style={inputStyle} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>

            <label style={labelStyle}>Participants</label>
            <input type="number" min="1" style={inputStyle} value={form.attendees} onChange={(e) => setForm({ ...form, attendees: Number(e.target.value) })} />

            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 16 }}>
              <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />
              Réservation publique (sujet visible par tous dans le planning)
            </label>

            {error && <p style={{ color: "#dc2626", fontSize: 12, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <button
                onClick={remove}
                disabled={deleting || saving}
                style={{ background: "#fff", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onClose} style={{ ...btnStyle, padding: "8px 16px" }}>Annuler</button>
                <button
                  onClick={save}
                  disabled={saving || deleting}
                  style={{ background: "#1a3a5a", border: "none", color: "#fff", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PlanningPage() {
  const [week, setWeek]             = useState(new Date());
  const [reservations, setRes]      = useState([]);
  const [rooms, setRooms]           = useState([]);
  const [selectedRoom, setSel]      = useState("");
  const [editingId, setEditingId]   = useState(null);
  const days = getWeekDays(week);

  useEffect(() => {
    roomsApi.list().then(({ data }) => setRooms(data.results || data));
  }, []);

  const loadReservations = () => {
    const params = { week: toISOWeekParam(week) };
    if (selectedRoom) params.room = selectedRoom;
    reservationsApi.planning(params).then(({ data }) => {
      setRes(data.reservations || []);
    }).catch(() => {});
  };

  useEffect(loadReservations, [week, selectedRoom]);

  /** Map roomId → couleur définie dans Django Admin (fiche de la salle) */
  const colorMap = useMemo(() => {
    const map = {};
    rooms.forEach((r) => {
      map[r.id] = r.color;
    });
    return map;
  }, [rooms]);

  const getRoomColor = (ev) => colorMap[ev.room] || ev.room_color || "#1a3a5a";

  /** Réservations positionnées (top/hauteur/colonne) pour chaque jour affiché,
   * une seule tuile par réservation quelle que soit sa durée. */
  const layoutByDay = useMemo(() => {
    const map = {};
    days.forEach((day) => {
      const dateStr = fmtDate(day);
      const dayEvents = reservations
        .filter((r) => r.date === dateStr)
        .map((r) => ({
          ...r,
          startMin: Math.max(DAY_START_MIN, toMin(r.start_time)),
          endMin: Math.min(DAY_END_MIN, toMin(r.end_time)),
        }))
        .filter((r) => r.endMin > r.startMin);
      map[dateStr] = layoutDayEvents(dayEvents);
    });
    return map;
  }, [reservations, days]);

  /** Salles présentes dans les réservations de la semaine affichée */
  const activeRooms = useMemo(() => {
    const seen = new Map();
    reservations.forEach((r) => {
      if (!seen.has(r.room)) seen.set(r.room, r.room_name);
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [reservations]);

  const today = fmtDate(new Date());
  const gridHeight = ((DAY_END_MIN - DAY_START_MIN) / 60) * HOUR_HEIGHT;

  return (
    <div style={{ padding: "20px", paddingBottom: 80 }}>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setWeek(subWeeks(week, 1))} style={btnStyle}>
            <ChevronLeft size={18} />
          </button>
          <h2 style={{ fontSize: 15, margin: 0, whiteSpace: "nowrap" }}>
            {fmtDateFr(days[0])} – {fmtDateFr(days[6])}
          </h2>
          <button onClick={() => setWeek(addWeeks(week, 1))} style={btnStyle}>
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setWeek(new Date())} style={{ ...btnStyle, padding: "5px 12px", fontSize: 12 }}>
            Aujourd'hui
          </button>
        </div>
        <select
          value={selectedRoom}
          onChange={(e) => setSel(e.target.value)}
          style={{ width: "auto", padding: "7px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }}
        >
          <option value="">Toutes les salles</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.image_emoji ? `${r.image_emoji} ` : ""}{r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Légende des salles */}
      {activeRooms.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginBottom: 14, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e8e2d8" }}>
          {activeRooms.map(({ id, name }) => (
            <span key={id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: colorMap[id] || "#1a3a5a", flexShrink: 0 }} />
              {name}
            </span>
          ))}
        </div>
      )}

      {/* Grille calendrier */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 700 }}>
          {/* En-tête des jours */}
          <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)" }}>
            <div />
            {days.map((d) => {
              const ds = fmtDate(d);
              const isToday = ds === today;
              return (
                <div key={ds} style={{
                  padding: "8px 4px", textAlign: "center", fontSize: 12,
                  color: isToday ? "#1a3a5a" : "#6b7280",
                  fontWeight: isToday ? 700 : 400,
                }}>
                  {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                  <br />
                  <span style={{
                    fontSize: 15, fontWeight: 700,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 26, height: 26, borderRadius: "50%",
                    background: isToday ? "#1a3a5a" : "transparent",
                    color: isToday ? "#fff" : "inherit",
                  }}>
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Corps : colonne des heures + une colonne par jour, événements en blocs positionnés */}
          <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)" }}>
            {/* Heures */}
            <div style={{ position: "relative", height: gridHeight }}>
              {HOURS.map((hour, i) => (
                <div key={hour} style={{
                  position: "absolute", top: i * HOUR_HEIGHT - 6, right: 8,
                  fontSize: 11, color: "#9ca3af",
                }}>
                  {hour}
                </div>
              ))}
            </div>

            {days.map((day) => {
              const dateStr = fmtDate(day);
              const events = layoutByDay[dateStr] || [];
              return (
                <div
                  key={dateStr}
                  style={{
                    position: "relative", height: gridHeight,
                    borderLeft: "1px solid #f1f5f9",
                    backgroundImage: `repeating-linear-gradient(to bottom, #f1f5f9 0, #f1f5f9 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
                  }}
                >
                  {events.map((ev) => {
                    // Une réservation privée conserve la couleur de la salle ;
                    // seul le sujet est masqué ("PRIVATISÉE") pour qui n'y a
                    // pas droit — propriétaire, agent/admin et membres du
                    // groupe "Conseil Municipal" voient le vrai sujet
                    // (subject_visible, calculé côté serveur).
                    const isPrivate = ev.is_public === false;
                    const showsRealSubject = isPrivate && ev.subject_visible;
                    const color = getRoomColor(ev);
                    const top = ((ev.startMin - DAY_START_MIN) / 60) * HOUR_HEIGHT;
                    const height = Math.max(((ev.endMin - ev.startMin) / 60) * HOUR_HEIGHT - 2, 16);
                    const widthPct = 100 / ev.totalCols;
                    const showDetails = height > 26;
                    return (
                      <div
                        key={ev.id}
                        onClick={ev.can_edit ? () => setEditingId(ev.id) : undefined}
                        title={[
                          isPrivate && !showsRealSubject ? "Réservation privée (PRIVATISÉE)" : ev.title,
                          ev.room_name,
                          `${ev.start_time?.slice(0, 5)}–${ev.end_time?.slice(0, 5)}`,
                          showsRealSubject ? "(Privatisée)" : null,
                          ev.can_edit ? "Cliquer pour modifier/supprimer" : null,
                        ].filter(Boolean).join("\n")}
                        style={{
                          position: "absolute",
                          top, height,
                          left: `${ev.col * widthPct}%`,
                          width: `calc(${widthPct}% - 3px)`,
                          background: color,
                          color: "#fff",
                          borderRadius: 4,
                          padding: "2px 5px",
                          fontSize: 10,
                          overflow: "hidden",
                          lineHeight: 1.35,
                          borderLeft: `3px solid ${color}`,
                          boxSizing: "border-box",
                          cursor: ev.can_edit ? "pointer" : "default",
                        }}
                      >
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {isPrivate && "🔒 "}{isPrivate && !showsRealSubject ? "PRIVATISÉE" : ev.title}
                        </div>
                        {showDetails && (
                          <div style={{ opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.room_name}
                          </div>
                        )}
                        {showDetails && (
                          <div style={{ opacity: 0.75, fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.start_time?.slice(0, 5)}–{ev.end_time?.slice(0, 5)}
                          </div>
                        )}
                        {showsRealSubject && showDetails && (
                          <div style={{ opacity: 0.9, fontSize: 9, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            🔒 Privatisée
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editingId && (
        <EditReservationModal
          reservationId={editingId}
          onClose={() => setEditingId(null)}
          onChanged={loadReservations}
        />
      )}
    </div>
  );
}

const btnStyle = {
  background: "#f1f5f9", border: "none", borderRadius: 6, padding: "6px 10px",
  cursor: "pointer", display: "flex", alignItems: "center",
};
