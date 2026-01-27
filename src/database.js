import { supabase } from './lib/customSupabaseClient';

// --- Funções Auxiliares ---

const getClinicId = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    if (session.user?.user_metadata?.clinic_id) {
        return session.user.user_metadata.clinic_id;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('clinic_id')
      .eq('id', session.user.id)
      .single();
    return profile?.clinic_id;
  } catch (error) {
      console.error("Error getting clinic ID:", error);
      return null;
  }
};

const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
}

// ======================================================================
// Patients (Pacientes)
// ======================================================================

export const getPatients = async (page = 1, pageSize = 10, searchTerm = '', sortBy = 'created_at', sortOrder = 'desc') => {
  const clinicId = await getClinicId();
  if (!clinicId) return { data: [], count: 0 };

  let query = supabase
    .from('patients')
    .select('*, tags:patient_tags(tag:tags(*))', { count: 'exact' }) 
    .eq('clinic_id', clinicId);

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
  }

  if (sortBy) query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  
  return { data, count };
};

export const getPatientById = async (id) => {
  const clinicId = await getClinicId();
  if (!clinicId) return null;

  // CORREÇÃO: Removido 'tags:...' e 'phones:...'
  // Buscamos apenas os dados da tabela patients.
  // Tags são buscadas separadamente pelo frontend usando getPatientTags
  const { data, error } = await supabase
    .from('patients')
    .select('*') 
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .single();
    
  if (error) return null;
  return data;
};

export const addPatient = async (patientData) => {
  const clinicId = await getClinicId();
  if (!clinicId) throw new Error('Clinic ID not found');
  const userId = await getUserId();

  const cleanData = Object.fromEntries(Object.entries(patientData).map(([k, v]) => [k, v === undefined ? null : v]));

  const { data, error } = await supabase
    .from('patients')
    .insert([{ ...cleanData, clinic_id: clinicId, created_by: userId, created_at: new Date().toISOString() }])
    .select().single();
    
  if (error) throw error;
  return data;
};

export const updatePatient = async (patientId, updates) => {
  const clinicId = await getClinicId();
  const cleanUpdates = Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, v === undefined ? null : v]));

  const { data, error } = await supabase
    .from('patients')
    .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
    .eq('id', patientId).eq('clinic_id', clinicId).select().single();
    
  if (error) throw error;
  return data;
};

export const deletePatient = async (patientId) => {
  const clinicId = await getClinicId();
  const { error } = await supabase.from('patients').delete().eq('id', patientId).eq('clinic_id', clinicId);
  if (error) throw error;
};

// --- FUNÇÃO QUE FALTAVA (Correção do Build) ---
export const checkDuplicatePatient = async (name, cpf) => {
    const clinicId = await getClinicId();
    if (!clinicId) return false;
    
    const conditions = [];
    // Escapa aspas duplas para evitar erro na query
    if (name) conditions.push(`name.eq."${name.replace(/"/g, '""')}"`);
    if (cpf) conditions.push(`cpf.eq."${cpf.replace(/"/g, '""')}"`);
    
    if (conditions.length === 0) return false;

    const { data, error } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .or(conditions.join(','));

    if (error) return false;
    return data && data.length > 0;
};

// ======================================================================
// Tags 
// ======================================================================

export const getTags = async (page = 1, pageSize = 10, searchTerm = '') => {
  const clinicId = await getClinicId();
  if (!clinicId) return { data: [], count: 0 };
  
  let query = supabase.from('tags').select('*', { count: 'exact' }).eq('clinic_id', clinicId);
  if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
  
  const { data, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  return { data: data || [], count: count || 0 };
};

export const addTag = async (tagData) => {
  const clinicId = await getClinicId();
  const { data, error } = await supabase.from('tags').insert([{ ...tagData, clinic_id: clinicId }]).select().single();
  if (error) throw error; return data;
};

export const deleteTag = async (id) => {
  const clinicId = await getClinicId();
  const { error } = await supabase.from('tags').delete().eq('id', id).eq('clinic_id', clinicId);
  if (error) throw error; return true;
};

export const addPatientTag = async (patientId, tagId) => {
   const { data, error } = await supabase.from('patient_tags').insert([{ patient_id: patientId, tag_id: tagId }]).select().single();
   if (error && error.code !== '23505') throw error; 
   return data;
};

export const removePatientTag = async (patientId, tagId) => {
   const { error } = await supabase.from('patient_tags').delete().eq('patient_id', patientId).eq('tag_id', tagId);
   if (error) throw error;
};

export const getPatientTags = async (patientId) => {
    const { data } = await supabase.from('patient_tags').select('*, tag:tags(*)').eq('patient_id', patientId);
    return data || [];
};

// ======================================================================
// Agendamentos (Appointments)
// ======================================================================

export const getAppointments = async (filters = {}) => {
  const clinicId = await getClinicId();
  if (!clinicId) return [];
  
  let query = supabase
    .from('appointments')
    .select('*, patient:patients(id, name, phone, cpf)')
    .eq('clinic_id', clinicId);

  if (filters.startDate) query = query.gte('appointment_date', filters.startDate);
  if (filters.endDate) query = query.lte('appointment_date', filters.endDate);
  
  const { data, error } = await query.order('appointment_date', { ascending: true });
  if (error) throw error;
  
  return data.map(apt => ({
      ...apt,
      contact: apt.patient ? { id: apt.patient.id, name: apt.patient.name } : { name: 'Paciente' }
  }));
};

// Remove ID antes de inserir (evita erro 23505)
export const addAppointment = async (d) => {
    const cid = await getClinicId();
    const { id, ...dataToInsert } = d; 
    
    const { data, error } = await supabase
        .from('appointments')
        .insert([{ ...dataToInsert, clinic_id: cid }])
        .select().single();
    
    if(error) throw error; 
    return data;
};

// Aceita (objeto) OU (id, updates) para evitar TypeError
export const updateAppointment = async (arg1, arg2) => {
    const cid = await getClinicId();
    
    let id, updates;

    // Detecta se foi chamado com 1 argumento (objeto) ou 2 (id, updates)
    if (typeof arg1 === 'object' && arg1 !== null) {
        id = arg1.id;
        updates = { ...arg1 };
        delete updates.id; // Remove ID do corpo
    } else {
        id = arg1;
        updates = arg2;
    }

    if (!id || !updates) throw new Error("Dados inválidos para atualização.");

    // Lista estrita de campos permitidos
    const allowedColumns = [
        'clinic_id', 'patient_id', 'professional_id', 'appointment_date', 
        'status', 'appointment_type', 'duration', 'notes', 'obs',
        'contact_id', 'title', 'start_time', 'end_time', 
        'location', 'professional_name' 
    ];

    const cleanUpdates = Object.keys(updates)
        .filter(key => allowedColumns.includes(key))
        .reduce((obj, key) => { obj[key] = updates[key]; return obj; }, {});

    const { data, error } = await supabase
        .from('appointments')
        .update(cleanUpdates)
        .eq('id', id).eq('clinic_id', cid).select().single();
        
    if(error) throw error; 
    return data;
};

export const deleteAppointment = async (id) => {
    const cid = await getClinicId();
    const { error } = await supabase.from('appointments').delete().eq('id', id).eq('clinic_id', cid);
    if(error) throw error;
    return { success: true };
};

export const getPatientAppointments = async (patientId) => {
    const cid = await getClinicId();
    if (!cid) return [];
    const { data } = await supabase.from('appointments').select('*').eq('clinic_id', cid).eq('patient_id', patientId).order('appointment_date', {ascending: false});
    return data || [];
}

// ======================================================================
// Notifications
// ======================================================================

export const getNotificationsForUser = async (uid) => {
    if (!uid) return []; 
    const { data } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    return data || [];
};

export const getUnreadNotificationCount = async (uid) => {
    const userId = uid || await getUserId();
    if (!userId) return 0;
    const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
    if (error) return 0;
    return count || 0;
};

export const markNotificationAsRead = async (id) => {
    const { data } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).select().single();
    return data;
};

export const markAllNotificationsAsRead = async (uid) => {
    if (!uid) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', uid).eq('is_read', false);
    return true;
};

export const deleteNotification = async (id) => {
    await supabase.from('notifications').delete().eq('id', id);
    return true;
};

export const createNotification = async (notificationData) => {
  const clinicId = await getClinicId();
  const userId = await getUserId();
  if (!clinicId || !userId) return null;

  const { data } = await supabase.from('notifications').insert([{
      clinic_id: clinicId,
      user_id: userId,
      type: notificationData.type || 'system',
      title: notificationData.title,
      message: notificationData.message,
      related_entity_type: notificationData.related_entity_type,
      related_entity_id: notificationData.related_entity_id,
      metadata: notificationData.metadata || {},
      is_read: false,
      created_at: new Date().toISOString()
  }]).select().single();
  return data;
};

// ======================================================================
// Outros (Tasks, Leads, etc)
// ======================================================================

export const getTasks = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('tasks').select('*').eq('clinic_id', cid).order('created_at', {ascending: false});
    return data || [];
};
export const addTask = async (d) => {
    const cid = await getClinicId();
    const uid = await getUserId();
    const { data, error } = await supabase.from('tasks').insert([{...d, clinic_id: cid, created_by: uid}]).select().single();
    if(error) throw error; return data;
};
export const updateTask = async (id, u) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('tasks').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    if(error) throw error; return data;
};
export const deleteTask = async (id) => {
    const cid = await getClinicId();
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('clinic_id', cid);
    if(error) throw error;
};

export const getTeamMembers = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('profiles').select('id, full_name, role, avatar_url').eq('clinic_id', cid);
    return data || [];
};

export const getLeads = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('leads').select('*').eq('clinic_id', cid).order('created_at', {ascending: false});
    return data || [];
};
export const addLead = async (d) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('leads').insert([{...d, clinic_id: cid}]).select().single();
    if(error) throw error; return data;
};
export const updateLead = async (id, u) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('leads').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    if(error) throw error; return data;
};
export const getCampaigns = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('campaigns').select('*').eq('clinic_id', cid);
    return data || [];
}
export const getSocialPosts = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('social_posts').select('*').eq('clinic_id', cid);
    return data || [];
}
export const addSocialPost = async (d) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('social_posts').insert([{...d, clinic_id: cid}]).select().single();
    if(error) throw error; return data;
}
export const updateSocialPost = async (id, u) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('social_posts').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    if(error) throw error; return data;
}
export const deleteSocialPost = async (id) => {
    const cid = await getClinicId();
    const { error } = await supabase.from('social_posts').delete().eq('id', id).eq('clinic_id', cid);
    if(error) throw error;
}
export const getContactByPatientId = async (pid) => {
    const { data, error } = await supabase.from('contact_relationships').select('contact_id').eq('related_entity_id', pid).eq('related_entity_type', 'patient').maybeSingle();
    if(error || !data) return null;
    const { data: c } = await supabase.from('contacts').select('*').eq('id', data.contact_id).single();
    return c;
};
export const getConversations = async (f={}) => {
    const cid = await getClinicId();
    let q = supabase.from('conversations').select('*, contact:contacts(*)').eq('clinic_id', cid);
    if(f.channel && f.channel !== 'all') q = q.eq('channel_type', f.channel);
    const { data } = await q.order('last_message_at', {ascending: false});
    return data || [];
};

// ======================================================================
// Outras Entidades (Repairs)
// ======================================================================

export const getRepairs = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('repair_tickets').select('*').eq('clinic_id', cid).order('created_at', {ascending: false});
    return data || [];
};
export const addRepair = async (d) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('repair_tickets').insert([{...d, clinic_id: cid}]).select().single();
    if(error) throw error; return data;
};
export const updateRepair = async (id, u) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('repair_tickets').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    if(error) throw error; return data;
};
export const deleteRepair = async (id) => {
    const cid = await getClinicId();
    const { error } = await supabase.from('repair_tickets').delete().eq('id', id).eq('clinic_id', cid);
    if(error) throw error;
};

export const getDashboardMetrics = async () => {
  const clinicId = await getClinicId();
  if (!clinicId) return null;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: leads } = await supabase.from('leads').select('*').eq('clinic_id', clinicId).gte('created_at', thirtyDaysAgo.toISOString());
  if (!leads) return null;
  const scheduled = leads.filter(l => ['scheduled', 'arrived', 'purchased'].includes(l.status)).length;
  const purchased = leads.filter(l => l.status === 'purchased').length;
  return {
    totalLeadsMonth: leads.length,
    funnel: { total: leads.length, scheduled, purchased },
  };
};

// Exporta mais uma vez as configurações de notificação para garantir
export const getNotificationSettings = async () => {
  const userId = await getUserId();
  if (!userId) return { appointment: true, message: true, task: true, system: true, patient: true };
  const { data } = await supabase.from('notification_settings').select('*').eq('user_id', userId);
  if (!data) return { appointment: true, message: true, task: true, system: true, patient: true };
  const settings = {};
  data.forEach(s => settings[s.notification_type] = s.enabled);
  return settings;
};

export const updateNotificationSettings = async (settings) => {
  const userId = await getUserId();
  if (!userId) return;
  const settingsArray = Object.entries(settings).map(([type, enabled]) => ({
    user_id: userId,
    notification_type: type,
    enabled,
    updated_at: new Date().toISOString()
  }));
  await supabase.from('notification_settings').upsert(settingsArray, { onConflict: 'user_id,notification_type' });
  return true;
};

// ... (código anterior)

// ======================================================================
// DASHBOARD (NOVA FUNÇÃO AGREGADORA)
// ======================================================================

export const getDashboardStats = async () => {
  const clinicId = await getClinicId();
  if (!clinicId) return null;

  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // 1. Agendamentos de HOJE
  const { count: appointmentsToday } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .eq('appointment_date', today);

  // 2. Reparos ATIVOS (Não entregues)
  // Consideramos ativos tudo que não está 'ready' (Pronto) ou 'delivered' (Entregue - se tiver esse status)
  // No seu Kanban atual, o final é 'ready'.
  const { count: activeRepairs } = await supabase
    .from('repair_ticketss') // Atenção: Verifique se o nome da tabela no banco é 'repairs' ou 'repair_tickets'
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .neq('status', 'ready');

  // 3. Vendas no Mês (Leads com status 'purchased' ou 'won')
  // Ajuste o status conforme você usa no CRM ('ganho', 'vendido', 'purchased')
  const { count: salesMonth } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .eq('status', 'purchased') // <--- Confirme se é esse o status de venda no seu banco
    .gte('created_at', firstDayOfMonth);

  // 4. Total de Pacientes
  const { count: totalPatients } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId);

  // 5. Dados para Gráfico: Agendamentos da Semana (Próximos 7 dias)
  const { data: weekAppointments } = await supabase
    .from('appointments')
    .select('appointment_date')
    .eq('clinic_id', clinicId)
    .gte('appointment_date', today)
    .order('appointment_date', { ascending: true })
    .limit(50);

  // 6. Dados para Gráfico: Reparos por Status
  // Se o nome da tabela for 'repair_tickets', mude aqui
  const { data: repairsData } = await supabase
    .from('repair_tickets') 
    .select('status')
    .eq('clinic_id', clinicId);

  return {
    metrics: {
      appointmentsToday: appointmentsToday || 0,
      activeRepairs: activeRepairs || 0,
      salesMonth: salesMonth || 0,
      totalPatients: totalPatients || 0
    },
    charts: {
      weekAppointments: weekAppointments || [],
      repairsStatus: repairsData || []
    }
  };
};

// ... export { supabase, getClinicId, getDashboardStats ... };
export { supabase, getClinicId };