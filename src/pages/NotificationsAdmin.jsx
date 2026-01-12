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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Nova Notificação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="user_id">Enviar para *</Label>
            <Select required value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário..." />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => <SelectItem key={user.id} value={user.id}>
                  {user.full_name || 'Sem nome'}
                </SelectItem>
)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input id="title" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea id="message" required value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Enviar</Button>
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
      toast({title: "Em breve!", description: "A funcionalidade de apagar notificações será implementada."})
  }

  return (
    <>
      <Helmet>
        <title>Notificações - Audicare</title>
        <meta name="description" content="Administração e programação de notificações" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Administração de Notificações</h1>
            <p className="text-muted-foreground">Envie e gerencie alertas para os usuários.</p>
          </div>
           <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Enviar Notificação
          </Button>
        </div>

        <div className="bg-card rounded-xl shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Histórico de Envios</h3>
          </div>
          {loading ? <p className="p-4">Carregando...</p> : (
            <div className="divide-y divide-border">
              {notifications.map(n => (
                <div key={n.id} className="p-4 flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
  Enviado para: {n.profiles?.full_name || 'Usuário'} em{' '}
  {new Date(n.created_at).toLocaleString('pt-BR')}
</p>

                  </div>
                  <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <p className="p-4 text-muted-foreground">Nenhuma notificação enviada ainda.</p>}
            </div>
          )}
        </div>
      </div>
      <NotificationDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSaveNotification} users={users} />
    </>
  );
};

export default NotificationsAdmin;