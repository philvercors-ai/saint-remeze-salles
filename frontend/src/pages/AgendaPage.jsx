import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { reservationsApi } from "../api/reservations";
import { manifestationsApi } from "../api/manifestations";
import {
  fmtDate, fmtDateFr, fmtDateShortFr, fmtMonthFr, fmtTime,
  addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
} from "../utils/dates";
import StatusBadge from "../components/ui/Badge";

const ALL = "all";
const WEEK = "week";
const MONTH = "month";

// Vue par défaut : tout le passé récent affiché et tout le futur — pas de
// fenêtre de date, pour ne jamais faire disparaître un événement éloigné.
function getRange(mode, anchor) {
  if (mode === MONTH) return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  if (mode === WEEK) return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) };
  return { start: addDays(new Date(), -90), end: addDays(new Date(), 365) };
}

function rangeLabel(mode, start, end) {
  if (mode === MONTH) return fmtMonthFr(start);
  if (mode === WEEK) return `Semaine du ${fmtDateShortFr(start)} au ${fmtDateFr(end)}`;
  return "Tous les événements";
}

export default function AgendaPage() {
  const [mode, setMode] = useState(ALL);
  const [anchor, setAnchor] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(() => getRange(mode, anchor), [mode, anchor]);
  const startStr = fmtDate(start);
  const endStr = fmtDate(end);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reservationsApi.planning({ start: startStr, end: endStr }),
      manifestationsApi.list(),
    ]).then(([rRes, mRes]) => {
      const reservations = (rRes.data.reservations || []).map((r) => ({ ...r, _type: "reservation" }));
      const manifestations = (mRes.data.results || mRes.data)
        // Une manifestation peut s'étaler sur plusieurs jours : on la garde si elle
        // chevauche la période affichée, pas seulement si son premier jour y tombe.
        .filter((m) => m.date_start <= endStr && m.date_end >= startStr)
        .map((m) => ({ ...m, _type: "manifestation" }));
      const all = [...reservations, ...manifestations].sort((a, b) => {
        const da = a.date || a.date_start;
        const db = b.date || b.date_start;
        return da < db ? -1 : da > db ? 1 : 0;
      });
      setEvents(all);
    }).finally(() => setLoading(false));
  }, [startStr, endStr]);

  const goAll = () => { setMode(ALL); setAnchor(new Date()); };
  const goToday = () => { setMode(WEEK); setAnchor(new Date()); };
  const goNextWeek = () => { setMode(WEEK); setAnchor(addWeeks(new Date(), 1)); };
  const goThisMonth = () => { setMode(MONTH); setAnchor(new Date()); };
  const goNextMonth = () => { setMode(MONTH); setAnchor(addMonths(new Date(), 1)); };
  const step = (dir) => setAnchor((a) => (mode === MONTH ? addMonths(a, dir) : addWeeks(a, dir)));

  const today = fmtDate(new Date());
  const upcoming = events.filter((e) => (e.date || e.date_end) >= today);
  const past = events.filter((e) => (e.date || e.date_end) < today);

  const EventCard = ({ event }) => {
    // subject_visible (calculé côté serveur : propriétaire, agent/admin, ou
    // — pour une réservation — membre du groupe "Conseil Municipal") indique
    // si le VIEWER CONNECTÉ a le droit de voir le sujet réel d'un événement
    // privé. Se fier à ce champ, jamais à is_public seul : un événement privé
    // dont on est le demandeur doit afficher son sujet normalement.
    const isPrivate = event.is_public === false;
    const isMasked = isPrivate && !event.subject_visible;

    if (isMasked) {
      return (
        <div style={{
          background: "#f8fafc", borderRadius: 10, padding: "14px 18px",
          boxShadow: "0 2px 8px rgba(26,58,90,.04)",
          border: "1px solid #e2e8f0",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <span style={{ fontSize: 24, filter: "grayscale(1)", opacity: .5 }}>🔒</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: 14, color: "#94a3b8" }}>PRIVATISÉE</p>
            <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
              {event._type === "reservation"
                ? `${fmtDateFr(event.date)} · ${fmtTime(event.start_time)}–${fmtTime(event.end_time)}`
                : `${fmtDateFr(event.date_start)}${event.date_end !== event.date_start ? ` – ${fmtDateFr(event.date_end)}` : ""}`
              }
            </p>
          </div>
        </div>
      );
    }
    return (
      <div style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", boxShadow: "0 2px 8px rgba(26,58,90,.06)", display: "flex", alignItems: "flex-start", gap: 14 }}>
        <span style={{ fontSize: 28 }}>{event._type === "reservation" ? (event.room_emoji || "🏛️") : "🎪"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <p style={{ fontWeight: 600, fontSize: 14 }}>
              {isPrivate && "🔒 "}{event.title}
            </p>
            <StatusBadge status={event.status} />
          </div>
          <p style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
            {event._type === "reservation"
              ? `${event.room_name} · ${fmtDateFr(event.date)} · ${fmtTime(event.start_time)}–${fmtTime(event.end_time)}`
              : `${event.location} · ${fmtDateFr(event.date_start)}${event.date_end !== event.date_start ? ` – ${fmtDateFr(event.date_end)}` : ""}`
            }
          </p>
          {event.association && <p style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>{event.association}</p>}
          {isPrivate && <p style={{ color: "#94a3b8", fontSize: 11, fontStyle: "italic", marginTop: 2 }}>Privatisée</p>}
        </div>
      </div>
    );
  };

  const filterBtnStyle = (active) => ({
    padding: "6px 14px", borderRadius: 20, border: "1px solid " + (active ? "#1a3a5a" : "#e5e7eb"),
    background: active ? "#1a3a5a" : "#fff", color: active ? "#fff" : "#374151",
    fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  });

  const isCurrentWeek = mode === WEEK && fmtDate(start) === fmtDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const isNextWeek = mode === WEEK && fmtDate(start) === fmtDate(startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }));
  const isCurrentMonth = mode === MONTH && fmtDate(start) === fmtDate(startOfMonth(new Date()));
  const isNextMonth = mode === MONTH && fmtDate(start) === fmtDate(startOfMonth(addMonths(new Date(), 1)));

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Agenda</h1>

      {/* Filtres rapides */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
        <button style={filterBtnStyle(mode === ALL)} onClick={goAll}>Tous les événements</button>
        <button style={filterBtnStyle(isCurrentWeek)} onClick={goToday}>Semaine en cours</button>
        <button style={filterBtnStyle(isNextWeek)} onClick={goNextWeek}>Semaine prochaine</button>
        <button style={filterBtnStyle(isCurrentMonth)} onClick={goThisMonth}>Mois en cours</button>
        <button style={filterBtnStyle(isNextMonth)} onClick={goNextMonth}>Mois prochain</button>
      </div>

      {/* Navigation période — pas de notion de "précédent/suivant" en vue "Tous" */}
      {mode !== ALL && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, background: "#f7f4ef", borderRadius: 10, padding: "8px 10px" }}>
          <button
            onClick={() => step(-1)}
            aria-label={mode === MONTH ? "Mois précédent" : "Semaine précédente"}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#1a3a5a", padding: 6, display: "flex" }}
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#1a3a5a", textTransform: "capitalize", textAlign: "center" }}>
            {rangeLabel(mode, start, end)}
          </span>
          <button
            onClick={() => step(1)}
            aria-label={mode === MONTH ? "Mois suivant" : "Semaine suivante"}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#1a3a5a", padding: 6, display: "flex" }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Chargement…</div>
      ) : (
        <>
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
                {past.map((e) => <EventCard key={`${e._type}-${e.id}`} event={e} />)}
              </div>
            </section>
          )}

          {events.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <p>Aucun événement pour cette période.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
