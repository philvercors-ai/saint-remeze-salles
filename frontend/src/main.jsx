import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./assets/styles/globals.css";
import App from "./App.jsx";

// Enregistrement du service worker PWA (géré par vite-plugin-pwa)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("SW non enregistré:", err));
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
