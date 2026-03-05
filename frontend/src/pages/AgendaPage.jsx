import { useEffect, useState } from "react";
import { reservationsApi } from "../api/reservations";
import { manifestationsApi } from "../api/manifestations";
import { fmtDateFr, fmtTime } from "../utils/dates";
import StatusBadge from "../components/ui/Badge";

export default function AgendaPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reservationsApi.planning(),
      manifestationsApi.list(),
    ]).then(([rRes, mRes]) => {
      const reservations = (rRes.data.reservations || []).map((r) => ({ ...r, _type: "reservation" }));
      const manifestations = (mRes.data.results || mRes.data).map((m) => ({ ...m, _type: "manifestation" }));
      const all = [...reservations, ...manifestations].sort((a, b) => {
        const da = a.date || a.date_start;
        const db = b.date || b.date_start;
        return da < db ? -1 : da > db ? 1 : 0;
      });
      setEvents(all);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Chargement…</div>;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => (e.date || e.date_start) >= today);
  const past = events.filter((e) => (e.date || e.date_start) < today);

  const EventCard = ({ event }) => (
    <div style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", boxShadow: "0 2px 8px rgba(26,58,90,.06)", display: "flex", alignItems: "flex-start", gap: 14 }}>
      <span style={{ fontSize: 28 }}>{event._type === "reservation" ? (event.room_emoji || "🏛️") : "🎪"}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <p style={{ fontWeight: 600, fontSize: 14 }}>{event.title}</p>
          <StatusBadge status={event.status} />
        </div>
        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
          {event._type === "reservation"
            ? `${event.room_name} · ${fmtDateFr(event.date)} · ${fmtTime(event.start_time)}–${fmtTime(event.end_time)}`
            : `${event.location} · ${fmtDateFr(event.date_start)}${event.date_end !== event.date_start ? ` – ${fmtDateFr(event.date_end)}` : ""}`
          }
        </p>
        {event.association && <p style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>{event.association}</p>}
      </div>
    </div>
  );

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Agenda</h1>

      {upcoming.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, color: "#1a3a5a", marginBottom: 14 }}>À venir</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map((e) => <EventCard key={`${e._type}-${e.id}`} event={e} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, color: "#9ca3af", marginBottom: 14 }}>Passés</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.7 }}>
            {past.slice(-10).reverse().map((e) => <EventCard key={`${e._type}-${e.id}`} event={e} />)}
          </div>
        </section>
      )}

      {events.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <p>Aucun événement pour le moment.</p>
        </div>
      )}
    </div>
  );
}
