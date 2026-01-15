import { QueryClient } from '@tanstack/react-query';

// Configuração otimizada do React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (anteriormente cacheTime)

      // Retry inteligente
      retry: (failureCount, error) => {
        // Não retry para erros 4xx (cliente)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry até 3 vezes para outros erros
        return failureCount < 3;
      },

      // Retry delay exponencial
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch nas janelas focadas
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,

      // Background refetch
      refetchOnMount: true,
    },

    mutations: {
      // Retry para mutations também
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Query keys centralizadas para evitar duplicação
export const queryKeys = {
  // Patients
  patients: ['patients'],
  patient: (id) => ['patients', id],
  patientCount: ['patients', 'count'],

  // Appointments
  appointments: ['appointments'],
  appointment: (id) => ['appointments', id],
  appointmentsToday: ['appointments', 'today'],

  // Conversations
  conversations: ['conversations'],
  conversation: (id) => ['conversations', id],
  conversationMessages: (id) => ['conversations', id, 'messages'],

  // Notifications
  notifications: ['notifications'],
  unreadNotifications: ['notifications', 'unread'],
  notificationSettings: ['notifications', 'settings'],

  // Tasks
  tasks: ['tasks'],
  task: (id) => ['tasks', id],

  // Repairs
  repairs: ['repairs'],
  repair: (id) => ['repairs', id],

  // Dashboard
  dashboardStats: ['dashboard', 'stats'],
  dashboardMetrics: ['dashboard', 'metrics'],

  // User/Profile
  profile: ['profile'],
  userSettings: ['user', 'settings'],
};
