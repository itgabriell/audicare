import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Search, Filter, Users as UsersIcon, Shield, Stethoscope, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import UserCard from '@/components/users/UserCard';
import UserDialog from '@/components/users/UserDialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRoleConfig, getAvailableRoles, ROLES, hasPermission } from '@/lib/permissions';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

import { StatCard } from '@/components/ui/StatCard';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Verificar permissões
  const canManageUsers = currentUser?.profile?.role === ROLES.ADMIN;

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url, clinic_id, phone, updated_at, specialty')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      console.log('[Users] Usuários carregados:', data?.length || 0, data);
      setUsers(data || []);
    } catch (error) {
      console.error('[Users] Erro ao carregar usuários', error);
      toast({
        title: 'Erro ao carregar usuários',
        description:
          error?.message ||
          'Ocorreu um erro ao buscar os usuários. Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const callManageUsers = async (payload) => {
    const resp = await fetch('/functions/v1/manage-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    const text = await resp.text(); // lê como texto primeiro

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // se não for JSON válido, mantém data = null
      }
    }

    if (!resp.ok) {
      const message =
        (data && data.error) ||
        text ||
        'Erro na função manage-users';
      throw new Error(message);
    }

    return data;
  };


  const handleSaveUser = async (userData) => {
    try {
      if (!currentUser) {
        throw new Error('Usuário atual não autenticado.');
      }

      if (!canManageUsers) {
        throw new Error('Você não tem permissão para gerenciar usuários.');
      }

      if (editingUser) {
        // update existente
        await callManageUsers({
          action: 'update',
          currentUserRole: currentUser.profile?.role || 'admin',
          userId: editingUser.id,
          full_name: userData.full_name,
          role: userData.role,
          password: userData.password || null,
          phone: userData.phone || null,
        });

        toast({
          title: 'Sucesso!',
          description: 'Usuário atualizado com sucesso.',
        });
      } else {
        // create
        // Garantir que sempre tenha clinic_id ao criar usuário
        if (!currentUser.profile?.clinic_id) {
          throw new Error('Não é possível criar usuários sem estar associado a uma clínica.');
        }

        await callManageUsers({
          action: 'create',
          currentUserRole: currentUser.profile?.role || 'admin',
          email: userData.email,
          password: userData.password,
          full_name: userData.full_name,
          role: userData.role,
          phone: userData.phone || null,
          clinic_id: currentUser.profile.clinic_id, // Sempre passa clinic_id
        });

        toast({
          title: 'Sucesso!',
          description: 'Novo usuário criado com sucesso.',
        });
      }

      await loadUsers();
      setDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('[Users] Erro ao salvar usuário', error);
      toast({
        title: 'Erro ao salvar usuário',
        description:
          error?.message ||
          'Não foi possível salvar o usuário. Verifique os dados e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (user) => {
    setEditingUser({
      id: user.id,
      full_name: user.full_name,
      email: user.email || '',
      role: user.role,
      phone: user.phone || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (currentUser && id === currentUser.id) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode remover seu próprio usuário.',
        variant: 'destructive',
      });
      return;
    }

    if (!window.confirm('Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      if (!currentUser) {
        throw new Error('Usuário atual não autenticado.');
      }

      if (!canManageUsers) {
        throw new Error('Você não tem permissão para remover usuários.');
      }

      // Admins podem deletar usuários de qualquer clínica
      // Outros roles só podem deletar da mesma clínica
      const userRole = currentUser?.profile?.role;
      if (userRole !== ROLES.ADMIN) {
        const userToDelete = users.find(u => u.id === id);
        if (userToDelete && currentUser?.profile?.clinic_id &&
          userToDelete.clinic_id !== currentUser.profile.clinic_id) {
          throw new Error('Você não tem permissão para remover usuários de outras clínicas.');
        }
      }

      // Remover o usuário da lista local imediatamente (otimista)
      const userToDeleteIndex = users.findIndex(u => u.id === id);
      const updatedUsers = users.filter(u => u.id !== id);
      setUsers(updatedUsers);

      // Tentar usar a função manage-users primeiro
      try {
        await callManageUsers({
          action: 'delete',
          currentUserRole: currentUser.profile?.role || 'admin',
          userId: id,
        });
        console.log('[Users] Usuário deletado via manage-users:', id);
      } catch (manageUsersError) {
        // Se a função manage-users não existir ou não suportar delete,
        // tentar deletar diretamente do profile
        console.warn('[Users] Função manage-users não disponível, tentando exclusão direta:', manageUsersError);

        const { data: deleteData, error: deleteError, count } = await supabase
          .from('profiles')
          .delete()
          .eq('id', id)
          .select(); // Select para confirmar que deletou

        if (deleteError) {
          // Se falhou, restaurar o usuário na lista
          setUsers(users);
          console.error('[Users] Erro ao deletar usuário:', deleteError);
          throw new Error(`Não foi possível remover o usuário: ${deleteError.message}`);
        }

        // Verificar se realmente deletou
        if (!deleteData || deleteData.length === 0) {
          console.warn('[Users] Nenhum registro foi deletado. O usuário pode não existir.');
          // Verificar se o usuário ainda existe
          const { data: checkData } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', id)
            .single();

          if (checkData) {
            // Usuário ainda existe, restaurar lista
            console.error('[Users] Usuário ainda existe após tentativa de exclusão');
            setUsers(users);
            throw new Error('Falha ao excluir usuário. Tente novamente.');
          } else {
            console.log('[Users] Usuário não existe mais (pode ter sido deletado anteriormente)');
          }
        } else {
          console.log('[Users] Usuário deletado com sucesso:', id, deleteData);
        }
      }

      // Aguardar um pouco para garantir que a exclusão foi processada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Aguardar um pouco para garantir que a exclusão foi processada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verificar ANTES de recarregar se o usuário foi realmente removido
      const { data: verifyBeforeReload } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', id)
        .maybeSingle(); // maybeSingle retorna null se não encontrar, ao invés de erro

      if (verifyBeforeReload) {
        // Usuário ainda existe após tentativa de exclusão
        console.error('[Users] CRÍTICO: Usuário ainda existe após exclusão:', id);
        // Restaurar lista original
        setUsers(users);
        toast({
          title: 'Erro ao excluir',
          description: 'O usuário não foi removido. Verifique as permissões ou tente novamente.',
          variant: 'destructive',
        });
        return; // Sair da função sem recarregar
      }

      // Recarregar a lista de usuários do servidor para garantir sincronização
      await loadUsers();

      // Verificação final após reload
      const { data: verifyAfterReload } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (verifyAfterReload) {
        // Usuário apareceu novamente após reload (muito raro, mas possível)
        console.error('[Users] AVISO: Usuário reapareceu após reload:', id);
        toast({
          title: 'Atenção',
          description: 'O usuário pode não ter sido removido completamente. Verifique manualmente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso!',
          description: 'Usuário removido com sucesso.',
        });
      }
    } catch (error) {
      console.error('[Users] Erro ao remover usuário', error);
      toast({
        title: 'Erro ao remover usuário',
        description:
          error?.message ||
          'Não foi possível remover o usuário. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Filtros e busca
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Filtro por role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Busca por nome ou telefone
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(term) ||
        user.phone?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [users, searchTerm, roleFilter]);

  // Estatísticas por role
  const roleStats = useMemo(() => {
    const stats = {
      admin: users.filter(u => u.role === ROLES.ADMIN).length,
      medico: users.filter(u => u.role === ROLES.MEDICO).length,
      atendimento: users.filter(u => u.role === ROLES.ATENDIMENTO).length,
      total: users.length,
    };
    return stats;
  }, [users]);

  return (
    <>
      <Helmet>
        <title>Usuários - Audicare</title>
        <meta
          name="description"
          content="Gerenciamento de usuários do sistema"
        />
      </Helmet>

      <div className="h-full flex flex-col space-y-6 overflow-hidden pr-2">
        {/* Header Floating */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">Usuários</h1>
            <p className="text-muted-foreground text-sm">
              Gerenciamento de colaboradores e permissões
            </p>
          </div>
          {canManageUsers && (
            <Button
              onClick={() => {
                setEditingUser(null);
                setDialogOpen(true);
              }}
              className="rounded-2xl h-11 px-5 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          )}
        </div>

        {/* Estatísticas com StatCard */}
        {!loading && users.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total de Usuários"
              value={roleStats.total}
              icon={UsersIcon}
              colorClass={{ bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' }}
              delay={0}
            />
            <StatCard
              title="Administradores"
              value={roleStats.admin}
              subtitle="Acesso total"
              icon={Shield}
              // Purple Ban Fix: Using Slate (Black/Dark Grey) for Admin authority
              colorClass={{ bg: 'bg-slate-900/5 dark:bg-white/5', text: 'text-slate-900 dark:text-slate-100', border: 'border-slate-200 dark:border-slate-700' }}
              delay={100}
            />
            <StatCard
              title="Médicos"
              value={roleStats.medico}
              subtitle="Corpo clínico"
              icon={Stethoscope}
              colorClass={{ bg: 'bg-emerald-500/5', text: 'text-emerald-600', border: 'border-emerald-100 dark:border-emerald-900/30' }}
              delay={200}
            />
            <StatCard
              title="Atendimento"
              value={roleStats.atendimento}
              subtitle="Recepção"
              icon={User}
              colorClass={{ bg: 'bg-blue-500/5', text: 'text-blue-600', border: 'border-blue-100 dark:border-blue-900/30' }}
              delay={300}
            />
          </div>
        )}

        {/* Filtros e Busca Modernizados */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-3 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm z-10 shrink-0">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 rounded-2xl transition-all shadow-sm"
            />
          </div>
          <div className="w-full md:w-64 shrink-0">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Filter className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Todos os perfis" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 dark:border-slate-800 shadow-xl">
                <SelectItem value="all">Todos os perfis</SelectItem>
                {getAvailableRoles().map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Usuários */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onEdit={handleEdit}
                onDelete={handleDelete}
                currentUserId={currentUser?.id}
              />
            ))}
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <UsersIcon className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum usuário cadastrado</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Comece adicionando colaboradores ao sistema
              </p>
              {canManageUsers && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Usuário
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Search className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
              <p className="text-sm text-muted-foreground text-center">
                Tente ajustar os filtros de busca
              </p>
            </CardContent>
          </Card>
        )}

        <UserDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          user={editingUser}
          onSave={handleSaveUser}
        />
      </div>
    </>
  );
};

export default Users;