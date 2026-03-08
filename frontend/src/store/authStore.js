import { create } from "zustand";

const computeDerived = (user, accessToken) => ({
  isAuthenticated: !!accessToken && !!user,
  isAdmin:  user?.role === "admin",
  isAgent:  ["agent", "admin"].includes(user?.role),
});

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
  isAgent: false,

  setAuth: (user, accessToken, refreshToken) => {
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
    set({ user, accessToken, isLoading: false, ...computeDerived(user, accessToken) });
  },

  setAccessToken: (accessToken) => set((s) => ({ accessToken, ...computeDerived(s.user, accessToken) })),

  logout: () => {
    localStorage.removeItem("refreshToken");
    set({ user: null, accessToken: null, isLoading: false, ...computeDerived(null, null) });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
