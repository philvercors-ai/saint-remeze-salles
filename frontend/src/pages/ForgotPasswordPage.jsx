import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/auth";
import Button from "../components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await authApi.forgotPassword(email); } catch (_) {}
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f4ef", padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, maxWidth: 420, textAlign: "center", boxShadow: "0 4px 24px rgba(26,58,90,.1)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <h2 style={{ color: "#1a3a5a", marginBottom: 12 }}>Email envoyé</h2>
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            Si cet email est associé à un compte, vous recevrez un lien de réinitialisation valable <strong>15 minutes</strong>.
          </p>
          <p style={{ marginTop: 20 }}>
            <Link to="/login" style={{ color: "#1a3a5a", fontWeight: 600 }}>← Retour à la connexion</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f4ef", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, width: "100%", maxWidth: 400, boxShadow: "0 4px 24px rgba(26,58,90,.1)" }}>
        <h2 style={{ color: "#1a3a5a", marginBottom: 8 }}>Mot de passe oublié</h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
          Saisissez votre email pour recevoir un lien de réinitialisation.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.fr"
          />
          <Button type="submit" fullWidth loading={loading}>
            Envoyer le lien
          </Button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13 }}>
          <Link to="/login" style={{ color: "#1a3a5a" }}>← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}
