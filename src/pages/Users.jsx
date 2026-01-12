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

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
            <p className="text-muted-foreground mt-1">
              Gerenciamento de colaboradores e permissões
            </p>
          </div>
          {canManageUsers && (
            <Button
              onClick={() => {
                setEditingUser(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          )}
        </div>

        {/* Estatísticas por Role */}
        {!loading && users.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{roleStats.total}</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                  <Shield className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{roleStats.admin}</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Médicos</CardTitle>
                  <Stethoscope className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{roleStats.medico}</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Atendimento</CardTitle>
                  <User className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{roleStats.atendimento}</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Filtros e Busca */}
        {!loading && users.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Todos os perfis" />
                    </SelectTrigger>
                    <SelectContent>
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
            </CardContent>
          </Card>
        )}

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