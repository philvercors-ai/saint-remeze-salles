import { create } from "zustand";

const computeDerived = (user, accessToken) => ({
  isAuthenticated: !!accessToken && !!user,
  isAdmin:  user?.role === "admin",
  isAgent:  ["agent", "admin"].includes(user?.role),
});

// Le refresh token vit dans un cookie httpOnly (posé par le backend) —
// jamais accessible ni géré depuis ce store, contrairement à avant (v1.9.0
// et antérieures) où il était dupliqué en localStorage, lisible par tout
// script injecté en cas de faille XSS.
export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
  isAgent: false,

  setAuth: (user, accessToken) => {
    set({ user, accessToken, isLoading: false, ...computeDerived(user, accessToken) });
  },

  setAccessToken: (accessToken) => set((s) => ({ accessToken, ...computeDerived(s.user, accessToken) })),

  logout: () => {
    set({ user: null, accessToken: null, isLoading: false, ...computeDerived(null, null) });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
