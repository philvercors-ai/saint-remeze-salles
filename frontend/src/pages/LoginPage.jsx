import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authApi } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import Button from "../components/ui/Button";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setAuth } = useAuthStore();
  const { showToast } = useUiStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await authApi.login(form.email, form.password);
      setAuth(data.user, data.access, data.refresh);
      showToast(`Bienvenue ${data.user.first_name || data.user.email} !`);
      const isStaff = ["agent", "admin"].includes(data.user.role);
      // from = page d'origine si redirigé, sinon /admin pour les agents/admins
      const dest = (from && from !== "/") ? from : (isStaff ? "/admin" : "/");
      navigate(dest, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.email?.[0] || "Email ou mot de passe incorrect.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f4ef", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, width: "100%", maxWidth: 420, boxShadow: "0 4px 24px rgba(26,58,90,.1)" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ color: "#c9a84c", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Mairie de</p>
          <h1 style={{ fontSize: 26, margin: "4px 0 8px", color: "#1a3a5a" }}>Saint Remèze</h1>
          <p style={{ color: "#6b7280", fontSize: 14 }}>Salles communales</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="vous@exemple.fr"
              autoComplete="email"
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <div style={{ textAlign: "right", marginTop: 4 }}>
              <Link to="/mot-de-passe-oublie" style={{ fontSize: 12, color: "#1a3a5a" }}>
                Mot de passe oublié ?
              </Link>
            </div>
          </div>

          <Button type="submit" fullWidth loading={loading} style={{ marginTop: 8 }}>
            Se connecter
          </Button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#6b7280" }}>
          Pas encore de compte ?{" "}
          <Link to="/inscription" style={{ color: "#1a3a5a", fontWeight: 600 }}>
            Créer un compte
          </Link>
        </p>

        <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
          <Link to="/" style={{ color: "#9ca3af" }}>← Continuer sans compte</Link>
        </p>
      </div>
    </div>
  );
}
