import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { authApi } from "../api/auth";
import { useUiStore } from "../store/uiStore";
import Button from "../components/ui/Button";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState({ password: "", password_confirm: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { showToast } = useUiStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirm) {
      setErrors({ password_confirm: "Les mots de passe ne correspondent pas." });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      await authApi.resetPassword({ token, ...form });
      showToast("Mot de passe réinitialisé avec succès !");
      navigate("/login");
    } catch (err) {
      setErrors(err.response?.data || { detail: "Erreur lors de la réinitialisation." });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <p style={{ color: "#991b1b" }}>Lien invalide. <Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link></p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f4ef", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, width: "100%", maxWidth: 400, boxShadow: "0 4px 24px rgba(26,58,90,.1)" }}>
        <h2 style={{ color: "#1a3a5a", marginBottom: 8 }}>Nouveau mot de passe</h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
          Choisissez un mot de passe sécurisé (8 caractères minimum).
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {errors.detail && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>{errors.detail}</div>}
          {errors.token && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>{errors.token}</div>}

          <div>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Nouveau mot de passe"
            />
          </div>
          <div>
            <input
              type="password"
              required
              value={form.password_confirm}
              onChange={(e) => setForm((f) => ({ ...f, password_confirm: e.target.value }))}
              placeholder="Confirmer le mot de passe"
            />
            {errors.password_confirm && <p style={{ color: "#991b1b", fontSize: 12, marginTop: 4 }}>{errors.password_confirm}</p>}
          </div>

          <Button type="submit" fullWidth loading={loading}>
            Réinitialiser le mot de passe
          </Button>
        </form>
      </div>
    </div>
  );
}
