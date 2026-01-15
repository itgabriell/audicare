import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Calendar, Users, AlertCircle, CheckCheck, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '@/database';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const navigate = useNavigate();

  const PAGE_SIZE = 20;

  const fetchNotifications = async (reset = false) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const currentOffset = reset ? 0 : offset;
      const data = await getNotificationsForUser(user.id, PAGE_SIZE, currentOffset);

      if (data) {
        if (reset) {
          setNotifications(data);
          setOffset(PAGE_SIZE);
        } else {
          setNotifications(prev => [...prev, ...data]);
          setOffset(prev => prev + PAGE_SIZE);
        }

        setHasMore(data.length === PAGE_SIZE);

        // Atualizar contador apenas no reset
        if (reset) {
          const count = await getUnreadNotificationCount(user.id);
          setUnreadCount(count);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    try {
      const count = await getUnreadNotificationCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();

      // Realtime subscription for new notifications
      const channel = supabase
        .channel('inbox-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

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
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Navegação baseada no tipo de notificação
    if (notification.related_entity_type === 'conversation' && notification.related_entity_id) {
      navigate(`/inbox?conversation=${notification.related_entity_id}`);
    } else if (notification.type === 'appointment') {
      navigate('/appointments');
    } else if (notification.type === 'patient') {
      navigate('/patients');
    } else if (notification.type === 'task') {
      navigate('/tasks');
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'appointment':
        return <Calendar className="h-4 w-4 text-green-500" />;
      case 'patient':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'task':
        return <CheckCheck className="h-4 w-4 text-orange-500" />;
      case 'system':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-blue-600' : 'text-muted-foreground'}`} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h4 className="font-semibold">Notificações</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-auto py-1"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Ler todas
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1"
              onClick={() => navigate('/settings/notifications')}
            >
              <Settings className="h-3 w-3 mr-1" />
              Config
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground text-sm">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-center">
                Nenhuma notificação ainda.<br />
                <span className="text-xs">As notificações aparecerão aqui quando houver atividades importantes.</span>
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group ${
                    !notification.is_read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className={`text-sm font-medium ${!notification.is_read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                        {!notification.is_read && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate('/notifications')}
              >
                Ver todas as notificações
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
