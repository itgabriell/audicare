import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Bell, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NotificationDialog = ({ open, onOpenChange, onSave, users }) => {
  const [formData, setFormData] = useState({ title: '', message: '', user_id: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ title: '', message: '', user_id: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Nova Notificação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="user_id">Enviar para *</Label>
            <Select required value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="Selecione um usuário..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                {users.map(user => <SelectItem key={user.id} value={user.id}>
                  {user.full_name || 'Sem nome'}
                </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-11 rounded-xl bg-slate-50 border-slate-200"
              placeholder="Ex: Atualização do Sistema"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="min-h-[100px] rounded-xl bg-slate-50 border-slate-200 resize-none"
              placeholder="Digite sua mensagem aqui..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl hover:bg-slate-100 text-slate-500">Cancelar</Button>
            <Button type="submit" className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 px-6">Enviar Notificação</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};


const NotificationsAdmin = () => {
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: notifData, error: notifError } = await supabase.from('notifications').select('*, profiles(full_name)').order('created_at', { ascending: false });
      if (notifError) throw notifError;
      setNotifications(notifData);

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true });
      if (usersError) throw usersError;
      setUsers(usersData);
    } catch (error) {
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveNotification = async (formData) => {
    try {
      const { error } = await supabase.from('notifications').insert([{ ...formData, type: 'manual' }]);
      if (error) throw error;
      toast({ title: "Sucesso!", description: "Notificação enviada." });
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    // Placeholder for delete functionality
    toast({ title: "Em breve!", description: "A funcionalidade de apagar notificações será implementada." })
  }

  return (
    <>
      <Helmet>
        <title>Notificações - Audicare</title>
        <meta name="description" content="Administração e programação de notificações" />
      </Helmet>

      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Administração de Notificações</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Envie alertas e comunicados importantes para os usuários do sistema.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 h-10 px-6">
            <Plus className="mr-2 h-4 w-4" /> Nova Notificação
          </Button>
        </div>

        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Histórico de Envios</h3>
          </div>
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {notifications.map(n => (
                <div key={n.id} className="p-6 flex justify-between items-start hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{n.title}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider border border-slate-200 dark:border-slate-700">
                        Manual
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">{n.message}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                      <span>Enviado para <strong className="text-slate-600 dark:text-slate-300">{n.profiles?.full_name || 'Usuário'}</strong></span>
                      <span>•</span>
                      <span>{new Date(n.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Bell className="h-12 w-12 text-slate-200 dark:text-slate-800 mb-4" />
                  <p>Nenhuma notificação enviada ainda.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <NotificationDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSaveNotification} users={users} />
    </>
  );
};

export default NotificationsAdmin;