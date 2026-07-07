import { Routes, Route, Navigate } from "react-router";
import { useAuthSession } from "../lib/api";
import { GLOBAL_CSS } from "../styles/globalCss";
import { AdminLayout } from "./layout/AdminLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { UsersPage } from "./pages/UsersPage";
import { CitiesPage } from "./pages/CitiesPage";
import { ArtifactsPage } from "./pages/ArtifactsPage";
import { GalleryPage } from "./pages/GalleryPage";
import { HistoricalDocumentsPage } from "./pages/HistoricalDocumentsPage";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage";
import { QuestsPage } from "./pages/QuestsPage";
import { AchievementsPage } from "./pages/AchievementsPage";
import { AchievementDefinitionsPage } from "./pages/AchievementDefinitionsPage";
import { CertificatesPage } from "./pages/CertificatesPage";
import { HomepagePage } from "./pages/HomepagePage";
import { SettingsPage } from "./pages/SettingsPage";

function AccessDenied({ reason }: { reason: "guest" | "forbidden" }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center text-center px-6"
      style={{ background: "#0F1115", color: "#F6F4EC" }}
    >
      <style>{GLOBAL_CSS}</style>
      <div className="max-w-sm">
        <div className="text-3xl mb-4" style={{ color: "#D4AF37" }}>
          ⬦
        </div>
        <h1 className="orda-cinzel text-xl font-bold mb-3">
          {reason === "guest" ? "Sign in required" : "Access denied"}
        </h1>
        <p className="orda-inter text-sm mb-6" style={{ color: "#B7BAC3" }}>
          {reason === "guest"
            ? "You need to sign in with an administrator account to view this page."
            : "Your account does not have administrator access."}
        </p>
        <a href="/" className="btn-primary inline-flex items-center justify-center px-6 py-2.5 text-sm">
          Back to site
        </a>
      </div>
    </div>
  );
}

function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, profileQuery } = useAuthSession();

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1115" }}>
        <div className="animate-pulse-gold w-10 h-10 rounded-full" style={{ background: "rgba(212,175,55,0.15)" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AccessDenied reason="guest" />;
  }

  if (user?.role !== "admin") {
    return <AccessDenied reason="forbidden" />;
  }

  return <>{children}</>;
}

export function AdminApp() {
  return (
    <AdminRouteGuard>
      <AdminLayout>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="cities" element={<CitiesPage />} />
          <Route path="artifacts" element={<ArtifactsPage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="historical-documents" element={<HistoricalDocumentsPage />} />
          <Route path="knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="quests" element={<QuestsPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="achievement-definitions" element={<AchievementDefinitionsPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="homepage" element={<HomepagePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </AdminLayout>
    </AdminRouteGuard>
  );
}
