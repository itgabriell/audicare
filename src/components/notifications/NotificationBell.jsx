import React, { useState, useEffect } from 'react';
import { Bell, X, Settings, CheckCheck, Trash2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationSettings,
  updateNotificationSettings
} from '@/database';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const NotificationBell = ({ userId }) => {
  const { user } = useAuth();
  const actualUserId = userId || user?.id;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!actualUserId) return;
    try {
      setLoading(true);
      const data = await getNotificationsForUser(actualUserId, 10); // Limitar a 10 notificações no sino
      if (data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!actualUserId) return;
    try {
      const count = await getUnreadNotificationCount(actualUserId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    // Buscar dados iniciais
    fetchNotifications();
    fetchUnreadCount();

    if (!actualUserId) return;

    // Realtime subscription for new notifications
    const channel = supabase
      .channel('notification-bell')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${actualUserId}`,
        },
        (payload) => {
          // Atualizar apenas contador para performance (notificações serão carregadas ao abrir)
          fetchUnreadCount();

          // Se popover estiver aberto, recarregar notificações
          if (isOpen) {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [actualUserId, isOpen]);

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead(actualUserId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications(prev => {
        const next = prev.filter(n => n.id !== id);
        const wasUnread = prev.find(n => n.id === id)?.is_read === false;
        if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
        return next;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    
    // Logic to navigate based on notification type
    if (notification.related_entity_id) {
        if (notification.type === 'patient') {
             navigate(`/patients/${notification.related_entity_id}`);
        } else if (notification.type === 'appointment') {
             navigate(`/appointments`);
        } else if (notification.type === 'task') {
             navigate(`/tasks`);
        }
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notificações</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-auto py-1" 
              onClick={handleMarkAllRead}
            >
              Ler todas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group ${!notification.is_read ? 'bg-muted/20' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="h-2 w-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => handleDelete(e, notification.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
