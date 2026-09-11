import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useUiStore } from "./store/uiStore";
import { useConfigStore } from "./store/configStore";
import { authApi } from "./api/auth";

import TopBar from "./components/layout/TopBar";
import Sidebar from "./components/layout/Sidebar";
import BottomNav from "./components/layout/BottomNav";
import Toast from "./components/ui/Toast";
import CookieBanner from "./components/rgpd/CookieBanner";
import ColdStartOverlay from "./components/ui/ColdStartOverlay";

import DashboardPage      from "./pages/DashboardPage";
import LoginPage          from "./pages/LoginPage";
import RegisterPage       from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage  from "./pages/ResetPasswordPage";
import VerifyEmailPage    from "./pages/VerifyEmailPage";
import ProfilePage        from "./pages/ProfilePage";
import PrivacyPolicyPage  from "./pages/PrivacyPolicyPage";
import UserGuidePage      from "./pages/UserGuidePage";

// Chargée à la demande : react-markdown n'alourdit le bundle que pour les admins
const AdminManualPage = lazy(() => import("./pages/AdminManualPage"));

// Lazy pages (migrated from monolith)
import PlanningPage       from "./pages/PlanningPage";
import AgendaPage         from "./pages/AgendaPage";
import ReservationPage    from "./pages/ReservationPage";
import ManifestationPage  from "./pages/ManifestationPage";
import AdminPage          from "./pages/AdminPage";

// ── Route guards ──────────────────────────────────────────────────────────────
function PrivateRoute({ children, roles }) {
  const { user, accessToken, isLoading } = useAuthStore();
  const location = useLocation();
  if (isLoading) return <div style={{ padding: 40, textAlign: "center" }}>Chargement…</div>;
  if (!accessToken || !user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
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
  const { setAuth, logout, setAccessToken } = useAuthStore();

  useEffect(() => {
    // Le refresh token vit dans un cookie httpOnly, invisible en JS — on ne
    // peut pas savoir à l'avance s'il existe, donc on tente systématiquement ;
    // ça échoue proprement (401) pour un visiteur jamais connecté.
    authApi.refreshToken()
      .then(({ data }) => {
        // Stocker le token AVANT d'appeler me() pour que l'intercepteur l'injecte
        setAccessToken(data.access);
        authApi.me().then(({ data: user }) => {
          setAuth(user, data.access);
        }).catch(() => logout());
      })
      .catch(() => {
        logout();
      });
  }, []);

  return null;
}

// ── Bootstrap: réglages activables/désactivables depuis Django Admin ──────────
function ConfigBootstrap() {
  const loadConfig = useConfigStore((s) => s.loadConfig);
  useEffect(() => { loadConfig(); }, []);
  return null;
}

/** Affiche la page Manifestation, ou un message d'indisponibilité si la
 * fonctionnalité a été désactivée depuis Django Admin (mise en pause). */
function ManifestationGate() {
  const { manifestationsEnabled, loaded } = useConfigStore();
  if (!loaded) return null;
  if (!manifestationsEnabled) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
        <h2 style={{ color: "#1a3a5a", marginBottom: 8 }}>Fonctionnalité temporairement indisponible</h2>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          La déclaration de manifestations est en pause pour le moment. Revenez bientôt.
        </p>
      </div>
    );
  }
  return <ManifestationPage />;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
      <ConfigBootstrap />
      <ColdStartOverlay />
      <AppLayout>
        <Routes>
          {/* Public */}
          <Route path="/"                  element={<DashboardPage />} />
          <Route path="/planning"          element={<PlanningPage />} />
          <Route path="/agenda"            element={<AgendaPage />} />
          <Route path="/reservation"       element={<ReservationPage />} />
          <Route path="/manifestation"     element={<ManifestationGate />} />
          <Route path="/confidentialite"   element={<PrivacyPolicyPage />} />
          <Route path="/manuel"            element={<UserGuidePage />} />

          {/* Auth */}
          <Route path="/login"                element={<LoginPage />} />
          <Route path="/inscription"          element={<RegisterPage />} />
          <Route path="/mot-de-passe-oublie"  element={<ForgotPasswordPage />} />
          <Route path="/reset-password"       element={<ResetPasswordPage />} />
          <Route path="/verify-email"         element={<VerifyEmailPage />} />

          {/* Protected */}
          <Route path="/profil" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/admin"  element={<PrivateRoute roles={["agent", "admin"]}><AdminPage /></PrivateRoute>} />
          <Route path="/manuel-admin" element={
            <PrivateRoute roles={["admin"]}>
              <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Chargement…</div>}>
                <AdminManualPage />
              </Suspense>
            </PrivateRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
      <Toast />
    </BrowserRouter>
  );
}
