import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png", "offline.html"],
      manifest: {
        name: "Saint Remèze — Salles Communales",
        short_name: "Saint Remèze",
        description: "Réservation des salles communales de Saint Remèze",
        start_url: "/",
        display: "standalone",
        background_color: "#f7f4ef",
        theme_color: "#1a3a5a",
        orientation: "portrait-primary",
        lang: "fr",
        icons: [
          { src: "/icons/icon-72x72.png",   sizes: "72x72",   type: "image/png" },
          { src: "/icons/icon-96x96.png",   sizes: "96x96",   type: "image/png" },
          { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
          { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
          { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
          { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
          { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
        shortcuts: [
          { name: "Réserver une salle", url: "/reservation", icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }] },
          { name: "Planning", url: "/planning",              icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }] },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/admin\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/rooms\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "api-rooms", expiration: { maxAgeSeconds: 1800 } },
          },
          {
            urlPattern: /\/api\/reservations\/planning\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "api-planning", expiration: { maxAgeSeconds: 900 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts", expiration: { maxAgeSeconds: 31536000 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-files", expiration: { maxAgeSeconds: 31536000 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
