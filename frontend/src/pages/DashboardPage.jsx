import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Calendar, Clock, Users, Plus, ChevronRight } from "lucide-react";
import { roomsApi } from "../api/rooms";
import { reservationsApi } from "../api/reservations";
import { useAuthStore } from "../store/authStore";
import { fmtDateFr, fmtTime } from "../utils/dates";
import StatusBadge from "../components/ui/Badge";

export default function DashboardPage() {
  const [rooms, setRooms] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    Promise.all([
      roomsApi.list(),
      reservationsApi.planning({ week: "current" }),
    ]).then(([r, p]) => {
      setRooms(r.data.results || r.data);
      const all = p.data.reservations || [];
      const today = new Date().toISOString().slice(0, 10);
      setUpcoming(all.filter((r) => r.date >= today && r.status === "approved").slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 1000, margin: "0 auto" }} className="animate-fadein">
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>
          {user ? `Bonjour, ${user.first_name || ""}` : "Bienvenue"}
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Saint Remèze - Web Service</p>
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 32 }}>
        {[
          { to: "/reservation",   icon: Plus,      label: "Réserver",       color: "#1a3a5a" },
          { to: "/manifestation", icon: Users,     label: "Manifestation",  color: "#1d4ed8" },
          { to: "/planning",      icon: Calendar,  label: "Planning",       color: "#2d6a4f" },
          { to: "/agenda",        icon: Clock,     label: "Agenda",         color: "#854d0e" },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to} style={{
            background: "#fff", borderRadius: 12, padding: "18px 16px",
            textDecoration: "none", display: "flex", alignItems: "center", gap: 12,
            boxShadow: "0 2px 8px rgba(26,58,90,.08)", transition: "transform .2s, box-shadow .2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(26,58,90,.13)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(26,58,90,.08)"; }}
          >
            <div style={{ background: color, borderRadius: 8, padding: 10, color: "#fff" }}>
              <Icon size={20} />
            </div>
            <span style={{ fontWeight: 600, color: "#1a3a5a", fontSize: 14 }}>{label}</span>
          </Link>
        ))}
      </div>

      {/* Rooms */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>Nos salles</h2>
          <Link to="/planning" style={{ color: "#1a3a5a", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
            Voir le planning <ChevronRight size={16} />
          </Link>
        </div>
        {loading ? (
          <p style={{ color: "#9ca3af" }}>Chargement…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {rooms.map((room) => (
              <div key={room.id} style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(26,58,90,.08)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{room.image_emoji}</div>
                <h3 style={{ fontSize: 15, marginBottom: 4 }}>{room.name}</h3>
                <div style={{ display: "flex", gap: 12, color: "#6b7280", fontSize: 12 }}>
                  <span><Users size={12} style={{ verticalAlign: "middle" }} /> {room.capacity} pers.</span>
                  <span><Building2 size={12} style={{ verticalAlign: "middle" }} /> {room.area_sqm} m²</span>
                </div>
                {room.hourly_rate > 0 && (
                  <p style={{ fontSize: 12, color: "#c9a84c", fontWeight: 600, marginTop: 6 }}>{room.hourly_rate} €/h</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming reservations */}
      {upcoming.length > 0 && (
        <section>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Prochains événements</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map((r) => (
              <div key={r.id} style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", boxShadow: "0 2px 8px rgba(26,58,90,.06)", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 24 }}>{r.room_emoji}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{r.title}</p>
                  <p style={{ color: "#6b7280", fontSize: 12 }}>
                    {r.room_name} · {fmtDateFr(r.date)} · {fmtTime(r.start_time)}–{fmtTime(r.end_time)}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
