import { Menu, Bell, LogOut, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";
import { authApi } from "../../api/auth";

export default function TopBar({ pendingCount = 0 }) {
  const { user, isAgent, logout, accessToken } = useAuthStore();
  const { toggleSidebar, showToast } = useUiStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const refresh = localStorage.getItem("refreshToken");
    try { await authApi.logout(refresh); } catch (_) {}
    logout();
    showToast("Déconnexion réussie");
    navigate("/login");
  };

  return (
    <header style={{
      background: "#1a3a5a", color: "#fff", padding: "0 20px",
      height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,.2)",
    }}>
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={toggleSidebar}
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 4 }}
          aria-label="Menu"
        >
          <Menu size={22} />
        </button>
        <Link to="/" style={{ textDecoration: "none" }}>
          <div>
            <div style={{ fontSize: 11, color: "#c9a84c", letterSpacing: "1.5px", textTransform: "uppercase", lineHeight: 1 }}>
              Mairie de
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>
              Saint-Rémèze
            </div>
          </div>
        </Link>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isAgent && pendingCount > 0 && (
          <Link to="/admin" style={{ position: "relative", color: "#fff", padding: 8 }}>
            <Bell size={20} />
            <span style={{
              position: "absolute", top: 2, right: 2, background: "#ef4444",
              color: "#fff", borderRadius: "50%", width: 16, height: 16,
              fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
            }}>
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          </Link>
        )}

        {user ? (
          <>
            <Link to="/profil" style={{ color: "#fff", padding: 8, display: "flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 13 }}>
              <User size={18} />
              <span style={{ display: "none" }}>{user.first_name}</span>
            </Link>
            <button
              onClick={handleLogout}
              style={{ background: "rgba(255,255,255,.1)", border: "none", color: "#fff", cursor: "pointer", padding: "6px 10px", borderRadius: 6, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
            >
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <Link to="/login" style={{ background: "#c9a84c", color: "#fff", padding: "7px 16px", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}
