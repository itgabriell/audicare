/**
 * Sistema de Permissões e Roles do Audicare
 * Define roles e permissões granulares para cada tipo de usuário
 */

/**
 * Roles do Sistema Audicare
 * 
 * ADMIN: Gabriel Brandão - Gestor/Administrador com acesso completo
 * MEDICO: Dra. Karine Brandão - Médica responsável, dona da clínica
 * ATENDIMENTO: Secretária - Atendimento e gestão básica
 */
export const ROLES = {
  ADMIN: 'admin',           // Gabriel Brandão - Gestor/Administrador
  MEDICO: 'medico',         // Dra. Karine Brandão - Médica, dona da clínica
  ATENDIMENTO: 'atendimento' // Secretária - Atendimento geral
};

export const ROLE_CONFIG = {
  [ROLES.ADMIN]: {
    label: 'Administrador',
    description: 'Acesso completo ao sistema. Pode gerenciar usuários, configurações e todos os módulos.',
    icon: 'Shield',
    color: 'bg-slate-800/5 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700',
    permissions: {
      // Gestão
      users_manage: true,
      users_view: true,
      users_create: true,
      users_edit: true,
      users_delete: true,
      settings_manage: true,

      // Pacientes
      patients_view: true,
      patients_create: true,
      patients_edit: true,
      patients_delete: true,

      // Agendamentos
      appointments_view: true,
      appointments_create: true,
      appointments_edit: true,
      appointments_delete: true,
      appointments_cancel: true,

      // CRM
      crm_view: true,
      crm_manage: true,
      leads_manage: true,

      // Reparos
      repairs_view: true,
      repairs_manage: true,

      // Tarefas
      tasks_view: true,
      tasks_manage: true,

      // Inbox
      inbox_view: true,
      inbox_send: true,
      inbox_manage: true,

      // Relatórios e Analytics
      reports_view: true,
      analytics_view: true,

      // Social Media
      social_media_manage: true,

      // Configurações
      channel_settings: true,
      integrations: true,
    }
  },
  [ROLES.MEDICO]: {
    label: 'Médica',
    description: 'Acesso completo aos pacientes, agendamentos e atendimentos. Responsável pela clínica.',
    icon: 'Stethoscope',
    color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    permissions: {
      // Gestão (limitado)
      users_view: true,
      users_manage: false,
      users_create: false,
      users_edit: false,
      users_delete: false,
      settings_manage: false,

      // Pacientes (completo)
      patients_view: true,
      patients_create: true,
      patients_edit: true,
      patients_delete: true,

      // Agendamentos (completo)
      appointments_view: true,
      appointments_create: true,
      appointments_edit: true,
      appointments_delete: true,
      appointments_cancel: true,

      // CRM (visualização)
      crm_view: true,
      crm_manage: true,
      leads_manage: true,

      // Reparos (completo)
      repairs_view: true,
      repairs_manage: true,

      // Tarefas (completo)
      tasks_view: true,
      tasks_manage: true,

      // Inbox (completo)
      inbox_view: true,
      inbox_send: true,
      inbox_manage: true,

      // Relatórios
      reports_view: true,
      analytics_view: true,

      // Social Media (limitado)
      social_media_manage: false,

      // Configurações (limitado)
      channel_settings: false,
      integrations: false,
    }
  },
  [ROLES.ATENDIMENTO]: {
    label: 'Atendimento',
    description: 'Secretária com acesso a atendimento, agendamentos e gestão básica de pacientes.',
    icon: 'User',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    permissions: {
      // Gestão (nenhum)
      users_view: false,
      users_manage: false,
      users_create: false,
      users_edit: false,
      users_delete: false,
      settings_manage: false,

      // Pacientes (básico)
      patients_view: true,
      patients_create: true,
      patients_edit: true,
      patients_delete: false,

      // Agendamentos (completo)
      appointments_view: true,
      appointments_create: true,
      appointments_edit: true,
      appointments_delete: false,
      appointments_cancel: true,

      // CRM (visualização e edição básica)
      crm_view: true,
      crm_manage: true,
      leads_manage: true,

      // Reparos (visualização e criação)
      repairs_view: true,
      repairs_manage: true,

      // Tarefas (visualização e criação própria)
      tasks_view: true,
      tasks_manage: true,

      // Inbox (completo)
      inbox_view: true,
      inbox_send: true,
      inbox_manage: true,

      // Relatórios (limitado)
      reports_view: false,
      analytics_view: false,

      // Social Media (nenhum)
      social_media_manage: false,

      // Configurações (nenhum)
      channel_settings: false,
      integrations: false,
    }
  }
};

/**
 * Verifica se um usuário tem uma permissão específica
 */
export const hasPermission = (userRole, permission) => {
  const roleConfig = ROLE_CONFIG[userRole];
  if (!roleConfig) return false;

  // Admin tem todas as permissões
  if (userRole === ROLES.ADMIN) return true;

  return roleConfig.permissions[permission] === true;
};

/**
 * Verifica se um usuário tem acesso a uma rota
 */
export const canAccessRoute = (userRole, route) => {
  const routePermissions = {
    '/users': 'users_view',
    '/settings': 'settings_manage',
    '/patients': 'patients_view',
    '/appointments': 'appointments_view',
    '/crm': 'crm_view',
    '/repairs': 'repairs_view',
    '/tasks': 'tasks_view',
    '/inbox': 'inbox_view',
    '/social-media': 'social_media_manage',
    '/channel-settings': 'channel_settings',
  };

  const permission = routePermissions[route];
  if (!permission) return true; // Rota pública ou sem restrição

  return hasPermission(userRole, permission);
};

/**
 * Obtém a configuração de um role
 */
export const getRoleConfig = (role) => {
  return ROLE_CONFIG[role] || ROLE_CONFIG[ROLES.ATENDIMENTO];
};

/**
 * Lista todos os roles disponíveis
 */
export const getAvailableRoles = () => {
  return Object.values(ROLES).map(role => ({
    value: role,
    ...getRoleConfig(role)
  }));
};

