import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

export default function PlanningPage() {
  const [week, setWeek]             = useState(new Date());
  const [reservations, setRes]      = useState([]);
  const [rooms, setRooms]           = useState([]);
  const [selectedRoom, setSel]      = useState("");
  const days = getWeekDays(week);

  useEffect(() => {
    roomsApi.list().then(({ data }) => setRooms(data.results || data));
  }, []);

  useEffect(() => {
    const params = { week: toISOWeekParam(week) };
    if (selectedRoom) params.room = selectedRoom;
    reservationsApi.planning(params).then(({ data }) => {
      setRes(data.reservations || []);
    }).catch(() => {});
  }, [week, selectedRoom]);

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
                    const isPrivate = ev.is_public === false;
                    const color = isPrivate ? "#94a3b8" : getRoomColor(ev);
                    const top = ((ev.startMin - DAY_START_MIN) / 60) * HOUR_HEIGHT;
                    const height = Math.max(((ev.endMin - ev.startMin) / 60) * HOUR_HEIGHT - 2, 16);
                    const widthPct = 100 / ev.totalCols;
                    return (
                      <div
                        key={ev.id}
                        title={isPrivate
                          ? `Créneau privé\n${ev.start_time?.slice(0, 5)}–${ev.end_time?.slice(0, 5)}`
                          : `${ev.title}\n${ev.room_name}\n${ev.start_time?.slice(0, 5)}–${ev.end_time?.slice(0, 5)}`
                        }
                        style={{
                          position: "absolute",
                          top, height,
                          left: `${ev.col * widthPct}%`,
                          width: `calc(${widthPct}% - 3px)`,
                          background: isPrivate ? "#f1f5f9" : color,
                          color: isPrivate ? "#64748b" : "#fff",
                          borderRadius: 4,
                          padding: "2px 5px",
                          fontSize: 10,
                          overflow: "hidden",
                          lineHeight: 1.35,
                          borderLeft: `3px solid ${isPrivate ? "#94a3b8" : color}`,
                          border: isPrivate ? "1px solid #cbd5e1" : "none",
                          boxSizing: "border-box",
                        }}
                      >
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {isPrivate ? "🔒 Réservé" : ev.title}
                        </div>
                        {!isPrivate && height > 26 && (
                          <div style={{ opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.room_name}
                          </div>
                        )}
                        {!isPrivate && height > 26 && (
                          <div style={{ opacity: 0.75, fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.start_time?.slice(0, 5)}–{ev.end_time?.slice(0, 5)}
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
    </div>
  );
}

const btnStyle = {
  background: "#f1f5f9", border: "none", borderRadius: 6, padding: "6px 10px",
  cursor: "pointer", display: "flex", alignItems: "center",
};
