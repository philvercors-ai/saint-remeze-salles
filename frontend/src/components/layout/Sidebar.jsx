import { NavLink } from "react-router-dom";
import { Home, CalendarDays, Calendar, ClipboardList, Shield, Plus, User, FileText } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";

const NAV_ITEMS = [
  { to: "/",              icon: Home,          label: "Accueil" },
  { to: "/planning",      icon: CalendarDays,   label: "Planning" },
  { to: "/agenda",        icon: Calendar,       label: "Agenda" },
  { to: "/reservation",   icon: Plus,           label: "Réserver" },
  { to: "/manifestation", icon: ClipboardList,  label: "Manifestation" },
];

const ADMIN_ITEMS = [
  { to: "/admin",  icon: Shield, label: "Administration" },
];

export default function Sidebar() {
  const { isAgent, user } = useAuthStore();
  const { sidebarOpen, closeSidebar } = useUiStore();

  const items = [
    ...NAV_ITEMS,
    ...(isAgent ? ADMIN_ITEMS : []),
    { to: "/profil", icon: User, label: "Mon profil", hidden: !user },
    { to: "/confidentialite", icon: FileText, label: "Confidentialité" },
  ].filter((item) => !item.hidden);

  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200 }}
          onClick={closeSidebar}
        />
      )}

      <nav style={{
        position: "fixed", top: 60, left: 0, bottom: 0,
        width: 220, background: "#fff",
        borderRight: "1px solid #e5e7eb",
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .25s ease",
        zIndex: 201, overflowY: "auto",
        paddingTop: 16, paddingBottom: 80,
      }}>
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={closeSidebar}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 20px", textDecoration: "none",
              color: isActive ? "#1a3a5a" : "#6b7280",
              background: isActive ? "#f0f4f8" : "transparent",
              borderRight: isActive ? "3px solid #c9a84c" : "3px solid transparent",
              fontWeight: isActive ? 600 : 400,
              fontSize: 14, transition: "background .15s",
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
