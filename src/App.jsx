import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { QueryProvider } from '@/contexts/QueryProvider';
import DashboardLayout from '@/layouts/DashboardLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { cacheManager } from '@/utils/cacheManager';

// --- Global Loading Spinner ---
const FullPageSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// --- Lazy Loaded Pages ---
const LoginPage = lazy(() => import('@/pages/LoginPage'));
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
const Repairs = lazy(() => import('@/pages/Repairs'));
const SocialMedia = lazy(() => import('@/pages/SocialMedia'));
const Automations = lazy(() => import('@/pages/Automations'));
const EmailCampaigns = lazy(() => import('@/pages/EmailCampaigns'));
const NotificationsAdmin = lazy(() => import('@/pages/NotificationsAdmin'));
const Invoices = lazy(() => import('@/pages/Invoices'));
const Profile = lazy(() => import('@/pages/Profile'));

// Settings Pages & Components
const Settings = lazy(() => import('@/pages/Settings'));
const ProfileSettings = lazy(() => import('@/components/settings/ProfileSettings'));
const ClinicSettings = lazy(() => import('@/components/settings/ClinicSettings'));
const WorkingHoursSettings = lazy(() => import('@/components/settings/WorkingHoursSettings'));
const SecuritySettings = lazy(() => import('@/components/settings/SecuritySettings'));
const NotificationSettings = lazy(() => import('@/components/settings/NotificationSettings'));
const ChannelSettings = lazy(() => import('@/pages/ChannelSettings'));
const WebhookSettings = lazy(() => import('@/components/settings/WebhookSettings'));
const DocumentTemplateManager = lazy(() => import('@/components/documents/DocumentTemplateManager'));
const DocumentMessagesSettings = lazy(() => import('@/components/settings/DocumentMessagesSettings'));
const HealthCheckPanel = lazy(() => import('@/components/HealthCheckPanel'));

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  return session ? children : <Navigate to="/login" />;
};

function App() {
  const { theme } = useTheme();

  React.useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
     cacheManager.openDB().then(() => {
         console.log("[App] Local Cache Initialized");
     }).catch(e => console.warn("[App] Cache Init Failed", e));
  }, []);

  const { session, loading } = useAuth();

  if (loading) {
    return <FullPageSpinner />;
  }

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/home" />} />
          <Route path="/register" element={!session ? <RegisterPage /> : <Navigate to="/home" />} />
          
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
            <Route path="repairs" element={<Repairs />} />
            <Route path="inbox" element={<ChatIntegration />} />
            <Route path="social-media" element={<SocialMedia />} />
            <Route path="email-campaigns" element={<EmailCampaigns />} />
            <Route path="automations" element={<Automations />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="notifications" element={<NotificationsAdmin />} />
            <Route path="users" element={<Users />} />
            <Route path="import" element={<ImportData />} />
            <Route path="profile" element={<Profile />} />
            
            {/* Nested Settings Routes */}
            <Route path="settings" element={<Settings />}>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="clinic" element={<ClinicSettings />} />
              <Route path="hours" element={<WorkingHoursSettings />} />
              <Route path="security" element={<SecuritySettings />} />
              <Route path="notifications" element={<NotificationSettings />} />
              <Route path="channels" element={<ChannelSettings />} />
              <Route path="webhooks" element={<WebhookSettings />} /> 
              <Route path="document-templates" element={<DocumentTemplateManager />} />
              <Route path="document-messages" element={<DocumentMessagesSettings />} />
              <Route path="diagnostics" element={<HealthCheckPanel />} />
            </Route>
          </Route>
        </Routes>
      </ErrorBoundary>
    </Suspense>
  );
}

export default App;
