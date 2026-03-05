import { create } from "zustand";

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  setAuth: (user, accessToken, refreshToken) => {
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
    set({ user, accessToken, isLoading: false });
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  logout: () => {
    localStorage.removeItem("refreshToken");
    set({ user: null, accessToken: null, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),

  get isAuthenticated() {
    return !!get().accessToken && !!get().user;
  },

  get isAdmin() {
    return get().user?.role === "admin";
  },

  get isAgent() {
    return ["agent", "admin"].includes(get().user?.role);
  },
}));
