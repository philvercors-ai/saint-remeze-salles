import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore";

// N'affiche l'animation que si l'attente dépasse ce délai — évite un flash
// inutile quand le serveur Render est déjà chaud (cas normal, la majorité du
// temps). Ne se déclenche donc que sur un vrai réveil à froid (abonnement
// gratuit, serveur mis en veille après une période d'inactivité).
const SHOW_DELAY_MS = 1500;
// Au-delà de ce délai, le message change pour rassurer sur un réveil
// anormalement long plutôt que de laisser le même texte indéfiniment.
const LONG_WAIT_MS = 15000;

export default function ColdStartOverlay() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const [visible, setVisible] = useState(false);
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setVisible(false);
      setLongWait(false);
      return;
    }
    const showTimer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    const longTimer = setTimeout(() => setLongWait(true), LONG_WAIT_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(longTimer);
    };
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(247,244,239,.97)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div
          style={{
            width: 48, height: 48, margin: "0 auto",
            border: "4px solid #e5e7eb", borderTopColor: "#1a3a5a",
            borderRadius: "50%", animation: "csa-spin 0.9s linear infinite",
          }}
        />
        <h2 style={{ color: "#1a3a5a", fontSize: 17, margin: "20px 0 8px" }}>
          Réveil du serveur…
        </h2>
        <p style={{ color: "#6b7280", fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
          {longWait
            ? "Le réveil prend un peu plus de temps que prévu — merci de patienter encore quelques instants, la page se chargera automatiquement."
            : "L'hébergement gratuit met le serveur en veille après une période d'inactivité. Le réveil peut prendre jusqu'à une minute la première fois."
          }
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 18 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 8, height: 8, borderRadius: "50%", background: "#c9a84c",
                animation: "csa-bounce 1s infinite ease-in-out",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes csa-spin { to { transform: rotate(360deg); } }
        @keyframes csa-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: .5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
