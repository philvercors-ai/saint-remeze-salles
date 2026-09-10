import client from "./client";

export const authApi = {
  register: (data) => client.post("/auth/register/", data),
  verifyEmail: (token) => client.post("/auth/verify-email/", { token }),
  resendVerification: (email) => client.post("/auth/resend-verification/", { email }),
  login: (email, password) => client.post("/auth/login/", { email, password }),
  // Le refresh token voyage dans un cookie httpOnly, jamais dans le corps.
  logout: () => client.post("/auth/logout/"),
  refreshToken: () => client.post("/auth/token/refresh/"),
  me: () => client.get("/auth/me/"),
  updateMe: (data) => client.patch("/auth/me/", data),
  changePassword: (data) => client.post("/auth/change-password/", data),
  forgotPassword: (email) => client.post("/auth/forgot-password/", { email }),
  resetPassword: (data) => client.post("/auth/reset-password/", data),
};
