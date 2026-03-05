import { useState, useEffect } from "react";
import Button from "../ui/Button";
import { rgpdApi } from "../../api/rgpd";
import { useAuthStore } from "../../store/authStore";

const STORAGE_KEY = "sr_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) setVisible(true);
  }, []);

  const saveConsent = async (granted) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ granted, timestamp: new Date().toISOString(), version: "1.0" }));
    setVisible(false);
    if (isAuthenticated) {
      try {
        await rgpdApi.recordConsent({ consent_type: "cookies", granted });
      } catch (_) {}
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 70, left: 16, right: 16,
      background: "#fff", borderRadius: 12, padding: "20px 24px",
      boxShadow: "0 8px 32px rgba(26,58,90,.18)", zIndex: 500,
      maxWidth: 600, margin: "0 auto",
    }}>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#1a3a5a", marginBottom: 8 }}>
        🍪 Cookies & Vie privée
      </p>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.5 }}>
        Ce site utilise des cookies essentiels à son fonctionnement. Aucun cookie de traçage ni publicité.{" "}
        <a href="/confidentialite" style={{ color: "#1a3a5a" }}>Politique de confidentialité</a>
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="secondary" size="sm" onClick={() => saveConsent(false)}>Refuser</Button>
        <Button variant="primary" size="sm" onClick={() => saveConsent(true)}>Accepter</Button>
      </div>
    </div>
  );
}
