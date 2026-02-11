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

import { motion, AnimatePresence } from 'framer-motion';

// --- Premium Splash Screen with Branding ---
const FullPageSpinner = () => {
  const { slowLoading } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]"
    >
      {/* Abstract Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 relative"
        >
          <img
            src="https://horizons-cdn.hostinger.com/1bbc4272-c963-40da-a72d-73cd033c2e2e/3094f61e7d1e0cf6f6f83d903bbd089c.png"
            alt="Audicare Logo"
            className="h-16 md:h-20 drop-shadow-2xl relative z-10"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-4 border-2 border-primary/20 rounded-full blur-sm"
          />
        </motion.div>

        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden relative">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-primary"
          />
        </div>

        <AnimatePresence>
          {slowLoading ? (
            <motion.p
              key="slow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-[10px] font-bold tracking-[0.2em] text-primary/60 uppercase animate-pulse"
            >
              Conectando ao sistema...
            </motion.p>
          ) : (
            <motion.p
              key="normal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-[10px] font-bold tracking-[0.2em] text-primary/40 uppercase"
            >
              Sincronizando Audicare
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

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
const NotificationSettings = lazy(() => import('@/components/settings/NotificationSettings'));

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) return <FullPageSpinner />;

  // If not authenticated, redirect to login
  if (!session) {
    console.log("[ProtectedRoute] No session, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  console.log("[ProtectedRoute] Session valid, rendering content");
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
    console.log("[App] Loading state active...");
    return <FullPageSpinner />;
  }

  console.log("[App] Loading complete. Rendering routes.");

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
              <Route path="notifications" element={<NotificationSettings />} />
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