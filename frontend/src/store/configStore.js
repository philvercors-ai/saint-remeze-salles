import { create } from "zustand";
import { manifestationsApi } from "../api/manifestations";

// Réglages globaux activables/désactivables depuis Django Admin (mise en
// pause d'une fonctionnalité sans redéploiement). Activé par défaut tant que
// l'appel n'a pas répondu, pour ne rien masquer en cas d'échec réseau passager.
export const useConfigStore = create((set) => ({
  manifestationsEnabled: true,
  loaded: false,

  loadConfig: () => {
    manifestationsApi.config()
      .then(({ data }) => set({ manifestationsEnabled: data.is_enabled, loaded: true }))
      .catch(() => set({ loaded: true }));
  },
}));
