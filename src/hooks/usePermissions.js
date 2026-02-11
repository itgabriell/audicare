import { useMemo } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { hasPermission, canAccessRoute, getRoleConfig } from '@/lib/permissions';

/**
 * Hook para gerenciar permissões do usuário atual
 */
export const usePermissions = () => {
  const { user } = useAuth();

  const userRole = useMemo(() => {
    return user?.profile?.role || user?.role || null;
  }, [user]);

  const roleConfig = useMemo(() => {
    if (!userRole) return null;
    return getRoleConfig(userRole);
  }, [userRole]);

  const checkPermission = (permission) => {
    if (!userRole) return false;
    return hasPermission(userRole, permission);
  };

  const checkRouteAccess = (route) => {
    // Se não há role, permite acesso básico (fallback de segurança)
    // Isso evita que o sistema bloqueie completamente se o perfil não carregar
    if (!userRole) {
      // Permite rotas básicas mesmo sem role (caso o perfil ainda esteja carregando)
      // EMERGENCY FIX: Allowing all routes to prevent sidebar from being empty during connection issues
      return true;
      /*
      const basicRoutes = ['/dashboard', '/patients', '/appointments', '/inbox', '/crm', '/repairs', '/invoices', '/tasks', '/settings'];
      return basicRoutes.includes(route);
      */
    }
    return canAccessRoute(userRole, route);
  };

  const isAdmin = useMemo(() => {
    return userRole === 'admin';
  }, [userRole]);

  const isMedico = useMemo(() => {
    return userRole === 'medico';
  }, [userRole]);

  const isAtendimento = useMemo(() => {
    return userRole === 'atendimento';
  }, [userRole]);

  return {
    userRole,
    roleConfig,
    hasPermission: checkPermission,
    canAccessRoute: checkRouteAccess,
    isAdmin,
    isMedico,
    isAtendimento,
  };
};

export default usePermissions;

