import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { useUiStore } from "../store/uiStore";
import Button from "../components/ui/Button";

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", association: "",
    password: "", password_confirm: "", rgpd_consent: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const { showToast } = useUiStore();

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await authApi.register(form);
      setSuccess(true);
      showToast("Compte créé ! Vérifiez votre email.");
    } catch (err) {
      setErrors(err.response?.data || { detail: "Erreur lors de l'inscription." });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f4ef", padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, maxWidth: 420, textAlign: "center", boxShadow: "0 4px 24px rgba(26,58,90,.1)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <h2 style={{ color: "#1a3a5a", marginBottom: 12 }}>Vérifiez votre email</h2>
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            Un email de confirmation a été envoyé à <strong>{form.email}</strong>.<br />
            Cliquez sur le lien pour activer votre compte.
          </p>
          <p style={{ marginTop: 20 }}>
            <Link to="/login" style={{ color: "#1a3a5a", fontWeight: 600 }}>→ Aller à la connexion</Link>
          </p>
        </div>
      </div>
    );
  }

  const Field = ({ name, label, type = "text", required, placeholder }) => (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>
        {label}{required && " *"}
      </label>
      <input
        type={type}
        required={required}
        value={form[name]}
        onChange={set(name)}
        placeholder={placeholder}
      />
      {errors[name] && <p style={{ color: "#991b1b", fontSize: 12, marginTop: 4 }}>{errors[name]}</p>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f7f4ef", padding: "32px 16px", display: "flex", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, width: "100%", maxWidth: 480, boxShadow: "0 4px 24px rgba(26,58,90,.1)", alignSelf: "start" }}>
        <h2 style={{ color: "#1a3a5a", marginBottom: 4 }}>Créer un compte</h2>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 28 }}>Saint-Rémèze — Salles communales</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {errors.detail && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
              {errors.detail}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field name="first_name" label="Prénom" required />
            <Field name="last_name"  label="Nom"    required />
          </div>
          <Field name="email"       label="Email"       type="email"    required placeholder="vous@exemple.fr" />
          <Field name="phone"       label="Téléphone"   type="tel"               placeholder="06 00 00 00 00" />
          <Field name="association" label="Association / Organisme"              placeholder="Facultatif" />
          <Field name="password"         label="Mot de passe"    type="password" required placeholder="8 caractères minimum" />
          <Field name="password_confirm" label="Confirmer le mot de passe" type="password" required placeholder="Répétez le mot de passe" />
          {errors.password_confirm && <p style={{ color: "#991b1b", fontSize: 12 }}>{errors.password_confirm}</p>}

          {/* Consentement RGPD obligatoire */}
          <div style={{ background: "#f7f4ef", padding: 16, borderRadius: 10, borderLeft: "3px solid #c9a84c" }}>
            <label style={{ display: "flex", gap: 12, cursor: "pointer", alignItems: "flex-start" }}>
              <input
                type="checkbox"
                checked={form.rgpd_consent}
                onChange={set("rgpd_consent")}
                required
                style={{ width: "auto", marginTop: 2, accentColor: "#1a3a5a" }}
              />
              <span style={{ fontSize: 13, lineHeight: 1.5 }}>
                J'ai lu et j'accepte la{" "}
                <a href="/confidentialite" target="_blank" style={{ color: "#1a3a5a", fontWeight: 600 }}>
                  politique de confidentialité
                </a>{" "}
                et le traitement de mes données personnelles par la Mairie de Saint-Rémèze. *
              </span>
            </label>
            {errors.rgpd_consent && <p style={{ color: "#991b1b", fontSize: 12, marginTop: 6 }}>{errors.rgpd_consent}</p>}
          </div>

          <Button type="submit" fullWidth loading={loading} disabled={!form.rgpd_consent}>
            Créer mon compte
          </Button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#6b7280" }}>
          Déjà un compte ?{" "}
          <Link to="/login" style={{ color: "#1a3a5a", fontWeight: 600 }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
