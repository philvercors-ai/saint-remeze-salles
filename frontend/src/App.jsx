import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useUiStore } from "./store/uiStore";
import { authApi } from "./api/auth";

import TopBar from "./components/layout/TopBar";
import Sidebar from "./components/layout/Sidebar";
import BottomNav from "./components/layout/BottomNav";
import Toast from "./components/ui/Toast";
import CookieBanner from "./components/rgpd/CookieBanner";

import DashboardPage      from "./pages/DashboardPage";
import LoginPage          from "./pages/LoginPage";
import RegisterPage       from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage  from "./pages/ResetPasswordPage";
import VerifyEmailPage    from "./pages/VerifyEmailPage";
import ProfilePage        from "./pages/ProfilePage";
import PrivacyPolicyPage  from "./pages/PrivacyPolicyPage";

// Lazy pages (migrated from monolith)
import PlanningPage       from "./pages/PlanningPage";
import AgendaPage         from "./pages/AgendaPage";
import ReservationPage    from "./pages/ReservationPage";
import ManifestationPage  from "./pages/ManifestationPage";
import AdminPage          from "./pages/AdminPage";

// ── Route guards ──────────────────────────────────────────────────────────────
function PrivateRoute({ children, roles }) {
  const { user, accessToken, isLoading } = useAuthStore();
  if (isLoading) return <div style={{ padding: 40, textAlign: "center" }}>Chargement…</div>;
  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// ── Auth pages don't have app layout ──────────────────────────────────────────
const AUTH_ROUTES = ["/login", "/inscription", "/mot-de-passe-oublie", "/reset-password", "/verify-email"];

function AppLayout({ children }) {
  const { pathname } = useLocation();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const { closeSidebar } = useUiStore();

  if (isAuthPage) return <>{children}</>;

  return (
    <>
      <TopBar />
      <Sidebar />
      <main style={{ paddingBottom: 60 }}>
        {children}
      </main>
      <BottomNav />
      <CookieBanner />
    </>
  );
}

// ── Bootstrap: restore auth from refresh token ────────────────────────────────
function AuthBootstrap() {
  const { setAuth, logout, setLoading } = useAuthStore();

  useEffect(() => {
    const refresh = localStorage.getItem("refreshToken");
    if (!refresh) { setLoading(false); return; }

    authApi.refreshToken(refresh)
      .then(({ data }) => {
        authApi.me().then(({ data: user }) => {
          setAuth(user, data.access, data.refresh || refresh);
        }).catch(() => logout());
      })
      .catch(() => {
        localStorage.removeItem("refreshToken");
        logout();
      });
  }, []);

  return null;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
      <AppLayout>
        <Routes>
          {/* Public */}
          <Route path="/"                  element={<DashboardPage />} />
          <Route path="/planning"          element={<PlanningPage />} />
          <Route path="/agenda"            element={<AgendaPage />} />
          <Route path="/reservation"       element={<ReservationPage />} />
          <Route path="/manifestation"     element={<ManifestationPage />} />
          <Route path="/confidentialite"   element={<PrivacyPolicyPage />} />

          {/* Auth */}
          <Route path="/login"                element={<LoginPage />} />
          <Route path="/inscription"          element={<RegisterPage />} />
          <Route path="/mot-de-passe-oublie"  element={<ForgotPasswordPage />} />
          <Route path="/reset-password"       element={<ResetPasswordPage />} />
          <Route path="/verify-email"         element={<VerifyEmailPage />} />

          {/* Protected */}
          <Route path="/profil" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/admin"  element={<PrivateRoute roles={["agent", "admin"]}><AdminPage /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
      <Toast />
    </BrowserRouter>
  );
}
