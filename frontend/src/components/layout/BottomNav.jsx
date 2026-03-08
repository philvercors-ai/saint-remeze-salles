import { NavLink } from "react-router-dom";
import { CalendarDays, Calendar, Plus, Sparkles, Shield, User } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function BottomNav() {
  const { isAgent, user } = useAuthStore();

  const items = [
    { to: "/reservation",   icon: Plus,       label: "Réserver" },
    { to: "/manifestation", icon: Sparkles,   label: "Manifestation" },
    { to: "/planning",      icon: CalendarDays, label: "Planning" },
    { to: "/agenda",        icon: Calendar,   label: "Agenda" },
    isAgent
      ? { to: "/admin",  icon: Shield, label: "Admin" }
      : { to: "/profil", icon: User,   label: "Profil", hidden: !user },
  ].filter(Boolean).filter((item) => !item.hidden);

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "#fff", borderTop: "1px solid #e5e7eb",
      display: "flex", zIndex: 100, height: 60,
    }}>
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          style={({ isActive }) => ({
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, textDecoration: "none",
            color: isActive ? "#1a3a5a" : "#9ca3af",
            fontSize: 10, fontWeight: isActive ? 600 : 400,
          })}
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
