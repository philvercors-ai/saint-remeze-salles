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

/** Palette de couleurs distinctes pour les salles */
const PALETTE = [
  "#1a3a5a", // navy
  "#d97706", // amber
  "#059669", // vert
  "#7c3aed", // violet
  "#dc2626", // rouge
  "#0891b2", // cyan
  "#db2777", // rose
  "#65a30d", // lime
];

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

  /** Map roomId → couleur vive garantissant la distinction entre salles */
  const colorMap = useMemo(() => {
    const map = {};
    rooms.forEach((r, i) => {
      map[r.id] = PALETTE[i % PALETTE.length];
    });
    return map;
  }, [rooms]);

  const getRoomColor = (ev) => colorMap[ev.room] || ev.room_color || "#1a3a5a";

  const getSlotEvents = (day, hour) => {
    const dateStr = fmtDate(day);
    const h = parseInt(hour);
    return reservations.filter((r) => {
      if (r.date !== dateStr) return false;
      const sh = parseInt(r.start_time);
      const eh = parseInt(r.end_time);
      return h >= sh && h < eh;
    });
  };

  /** Salles présentes dans les réservations de la semaine affichée */
  const activeRooms = useMemo(() => {
    const seen = new Map();
    reservations.forEach((r) => {
      if (!seen.has(r.room)) seen.set(r.room, r.room_name);
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [reservations]);

  const today = fmtDate(new Date());

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

      {/* Grille */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 600, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 52, padding: "8px 4px", color: "#9ca3af", fontWeight: 400 }}></th>
              {days.map((d) => {
                const ds = fmtDate(d);
                const isToday = ds === today;
                return (
                  <th key={ds} style={{
                    padding: "8px 4px", textAlign: "center",
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
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <td style={{ padding: "1px 8px 1px 0", color: "#9ca3af", textAlign: "right", verticalAlign: "top", borderTop: "1px solid #f1f5f9", fontSize: 11 }}>
                  {hour}
                </td>
                {days.map((day) => {
                  const events = getSlotEvents(day, hour);
                  return (
                    <td key={fmtDate(day)} style={{ border: "1px solid #f1f5f9", padding: 2, verticalAlign: "top", minHeight: 28 }}>
                      {events.map((ev) => {
                        const isPrivate = ev.is_public === false;
                        const color = isPrivate ? "#94a3b8" : getRoomColor(ev);
                        return (
                          <div
                            key={ev.id}
                            title={isPrivate
                              ? `Créneau privé\n${ev.start_time?.slice(0, 5)}–${ev.end_time?.slice(0, 5)}`
                              : `${ev.title}\n${ev.room_name}\n${ev.start_time?.slice(0, 5)}–${ev.end_time?.slice(0, 5)}`
                            }
                            style={{
                              background: isPrivate ? "#f1f5f9" : color,
                              color: isPrivate ? "#64748b" : "#fff",
                              borderRadius: 4,
                              padding: "2px 5px",
                              fontSize: 10,
                              marginBottom: 2,
                              overflow: "hidden",
                              lineHeight: 1.4,
                              borderLeft: `3px solid ${isPrivate ? "#94a3b8" : color}`,
                              border: isPrivate ? "1px solid #cbd5e1" : "none",
                            }}
                          >
                            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {isPrivate ? "🔒 Réservé" : ev.title}
                            </div>
                            {!isPrivate && (
                              <div style={{ opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {ev.room_name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const btnStyle = {
  background: "#f1f5f9", border: "none", borderRadius: 6, padding: "6px 10px",
  cursor: "pointer", display: "flex", alignItems: "center",
};
