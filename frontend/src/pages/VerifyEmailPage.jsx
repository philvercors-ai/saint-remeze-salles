import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { authApi } from "../api/auth";
import { useAuthStore } from "../store/authStore";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading");
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    authApi.verifyEmail(token)
      .then(({ data }) => {
        setAuth(data.user, data.access, data.refresh);
        setStatus("success");
        setTimeout(() => navigate("/"), 2000);
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const content = {
    loading: { icon: "⏳", title: "Vérification en cours…", text: "Veuillez patienter." },
    success: { icon: "✅", title: "Email vérifié !", text: "Redirection vers l'accueil…" },
    error:   { icon: "❌", title: "Lien invalide ou expiré", text: "Le lien a peut-être expiré (24h)." },
  }[status];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f4ef", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, maxWidth: 420, textAlign: "center", boxShadow: "0 4px 24px rgba(26,58,90,.1)" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{content.icon}</div>
        <h2 style={{ color: "#1a3a5a", marginBottom: 12 }}>{content.title}</h2>
        <p style={{ color: "#6b7280", fontSize: 14 }}>{content.text}</p>
        {status === "error" && (
          <p style={{ marginTop: 20 }}>
            <Link to="/login" style={{ color: "#1a3a5a", fontWeight: 600 }}>Retour à la connexion</Link>
          </p>
        )}
      </div>
    </div>
  );
}
