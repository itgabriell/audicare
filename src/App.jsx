import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { cacheManager } from '@/utils/cacheManager';
import { Loader2 } from 'lucide-react';

// --- Critical Pages (Eagerly Loaded for speed) ---
import LoginPage from '@/pages/LoginPage';

// --- Global Loading Spinner with Branding ---
const FullPageSpinner = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-background text-primary">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-pulse" />
      </div>
    </div>
    <p className="mt-4 text-sm text-muted-foreground animate-pulse">Carregando Audicare...</p>
  </div>
);

// --- Lazy Loaded Pages (Split Chunks) ---
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const Home = lazy(() => import('@/pages/Home'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Patients = lazy(() => import('@/pages/Patients'));
const PatientDetails = lazy(() => import('@/pages/PatientDetails'));
const PatientCare = lazy(() => import('@/pages/PatientCare'));
const Appointments = lazy(() => import('@/pages/Appointments'));
const CRM = lazy(() => import('@/pages/CRM'));
const Users = lazy(() => import('@/pages/Users'));
const ImportData = lazy(() => import('@/pages/ImportData'));
const Tasks = lazy(() => import('@/pages/Tasks'));
const ChatIntegration = lazy(() => import('@/pages/ChatIntegration'));

// NOVA PÁGINA: Knowledge Base
const KnowledgeBase = lazy(() => import('@/pages/KnowledgeBase'));

// --- ALTERAÇÃO AQUI: Apontando para o novo Kanban de Reparos ---
const Repairs = lazy(() => import('@/components/crm/RepairKanban'));

const SocialMedia = lazy(() => import('@/pages/SocialMedia'));
const Automations = lazy(() => import('@/pages/Automations'));
const EmailCampaigns = lazy(() => import('@/pages/EmailCampaigns'));
const NotificationsAdmin = lazy(() => import('@/pages/NotificationsAdmin'));
const Invoices = lazy(() => import('@/pages/Invoices'));
const Profile = lazy(() => import('@/pages/Profile'));

// Settings
const Settings = lazy(() => import('@/pages/Settings'));
const ProfileSettings = lazy(() => import('@/components/settings/ProfileSettings'));
const ActivityLogSettings = lazy(() => import('@/components/settings/ActivityLogSettings'));
const InterfaceSettings = lazy(() => import('@/components/settings/InterfaceSettings'));
const SecuritySettings = lazy(() => import('@/components/settings/SecuritySettings'));

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) return <FullPageSpinner />;

  // If not authenticated, redirect to login
  if (!session) return <Navigate to="/login" replace />;

  return children;
};

function App() {
  const { theme } = useTheme();
  const { loading } = useAuth();

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    cacheManager.openDB().catch(e => console.warn("[App] Cache Init Failed", e));
  }, []);

  // Show spinner only on initial cold start check
  if (loading) {
    return <FullPageSpinner />;
  }

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ErrorBoundary>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/"
            element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="home" element={<Home />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:id" element={<PatientDetails />} />
            <Route path="patients/:id/care" element={<PatientCare />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="crm" element={<CRM />} />
            <Route path="tasks" element={<Tasks />} />

            {/* Rota de Reparos (Carrega o Kanban) */}
            <Route path="repairs" element={<Repairs />} />

            {/* Rota da Base de Conhecimento */}
            <Route path="knowledge-base" element={<KnowledgeBase />} />

            <Route path="inbox" element={<ChatIntegration />} />
            <Route path="social-media" element={<SocialMedia />} />
            <Route path="email-campaigns" element={<EmailCampaigns />} />
            <Route path="automations" element={<Automations />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="notifications" element={<NotificationsAdmin />} />
            <Route path="users" element={<Users />} />
            <Route path="import" element={<ImportData />} />
            <Route path="profile" element={<Profile />} />

            {/* Settings Sub-routes */}
            <Route path="settings" element={<Settings />}>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="activity-log" element={<ActivityLogSettings />} />
              <Route path="interface" element={<InterfaceSettings />} />
              <Route path="security" element={<SecuritySettings />} />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </Suspense>
  );
}

export default App;