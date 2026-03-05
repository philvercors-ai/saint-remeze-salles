import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { reservationsApi } from "../api/reservations";
import { roomsApi } from "../api/rooms";
import { getWeekDays, fmtDate, fmtDateFr, HOURS } from "../utils/dates";
import { addWeeks, subWeeks } from "date-fns";

export default function PlanningPage() {
  const [week, setWeek] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const days = getWeekDays(week);

  useEffect(() => {
    roomsApi.list().then(({ data }) => setRooms(data.results || data));
  }, []);

  useEffect(() => {
    const params = {};
    if (selectedRoom) params.room = selectedRoom;
    reservationsApi.planning(params).then(({ data }) => {
      setReservations(data.reservations || []);
    });
  }, [week, selectedRoom]);

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

  return (
    <div style={{ padding: "20px", paddingBottom: 80 }}>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setWeek(subWeeks(week, 1))} style={btnStyle}>
            <ChevronLeft size={18} />
          </button>
          <h2 style={{ fontSize: 16, margin: 0 }}>
            {fmtDateFr(days[0])} – {fmtDateFr(days[6])}
          </h2>
          <button onClick={() => setWeek(addWeeks(week, 1))} style={btnStyle}>
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setWeek(new Date())} style={{ ...btnStyle, padding: "6px 12px", fontSize: 12 }}>
            Aujourd'hui
          </button>
        </div>
        <select
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
          style={{ width: "auto", padding: "8px 12px" }}
        >
          <option value="">Toutes les salles</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 600, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 56, padding: "8px 4px", color: "#9ca3af" }}></th>
              {days.map((d) => (
                <th key={fmtDate(d)} style={{ padding: "8px 4px", textAlign: "center", color: fmtDate(d) === fmtDate(new Date()) ? "#1a3a5a" : "#6b7280", fontWeight: fmtDate(d) === fmtDate(new Date()) ? 700 : 400 }}>
                  {d.toLocaleDateString("fr-FR", { weekday: "short" })}<br />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{d.getDate()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <td style={{ padding: "2px 8px 2px 0", color: "#9ca3af", textAlign: "right", verticalAlign: "top", borderTop: "1px solid #f1f5f9" }}>
                  {hour}
                </td>
                {days.map((day) => {
                  const events = getSlotEvents(day, hour);
                  return (
                    <td key={fmtDate(day)} style={{ border: "1px solid #f1f5f9", padding: 2, verticalAlign: "top", minHeight: 32, position: "relative" }}>
                      {events.map((ev) => (
                        <div key={ev.id} style={{
                          background: ev.room_color || "#1a3a5a",
                          color: "#fff", borderRadius: 4, padding: "2px 6px",
                          fontSize: 11, marginBottom: 2, overflow: "hidden",
                          whiteSpace: "nowrap", textOverflow: "ellipsis",
                        }} title={`${ev.title} (${ev.room_name})`}>
                          {ev.title}
                        </div>
                      ))}
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
