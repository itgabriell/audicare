import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationsForUser as getNotificationsAPI,
  getUnreadNotificationCount as getUnreadCountAPI,
  markNotificationAsRead as markAsReadAPI,
  markAllNotificationsAsRead as markAllAsReadAPI,
  deleteNotification as deleteNotificationAPI,
  getNotificationSettings as getSettingsAPI,
  updateNotificationSettings as updateSettingsAPI,
  createNotification as createNotificationAPI,
  createManualNotification as createManualAPI
} from '@/database';
import { queryKeys } from '@/lib/queryClient';

// Hook para buscar notificações com paginação
export const useNotifications = (limit = 50, offset = 0) => {
  return useQuery({
    queryKey: [...queryKeys.notifications, limit, offset],
    queryFn: () => getNotificationsAPI(limit, offset),
    staleTime: 30 * 1000, // 30 segundos - dados frescos para notificações
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para contar notificações não lidas
export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: queryKeys.unreadNotifications,
    queryFn: getUnreadCountAPI,
    staleTime: 10 * 1000, // 10 segundos - atualiza frequentemente
    gcTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 30 * 1000, // Refetch a cada 30 segundos
  });
};

// Hook para buscar configurações de notificação
export const useNotificationSettings = () => {
  return useQuery({
    queryKey: queryKeys.notificationSettings,
    queryFn: getSettingsAPI,
    staleTime: 10 * 60 * 1000, // 10 minutos - configurações mudam pouco
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
};

// Hook para marcar notificação como lida
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsReadAPI,
    onSuccess: () => {
      // Invalidate contadores e listas
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
};

// Hook para marcar todas como lidas
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllAsReadAPI,
    onSuccess: () => {
      // Invalidate contadores e listas
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
};

// Hook para deletar notificação
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotificationAPI,
    onSuccess: () => {
      // Invalidate listas
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotifications });
    },
  });
};

// Hook para atualizar configurações
export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSettingsAPI,
    onSuccess: (data) => {
      // Update cache das configurações
      queryClient.setQueryData(queryKeys.notificationSettings, data);
    },
  });
};

// Hook para criar notificação manual
export const useCreateManualNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, message, targetUserId }) =>
      createManualAPI(title, message, targetUserId),
    onSuccess: () => {
      // Invalidate listas para mostrar nova notificação
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
};
