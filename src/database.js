import { supabase } from './lib/customSupabaseClient';

// --- Funções Auxiliares ---

const getClinicId = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // 1. Tenta metadados (mais rápido)
    if (session.user?.user_metadata?.clinic_id) {
        return session.user.user_metadata.clinic_id;
    }

    // 2. Fallback para query no profile
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

  // Select com Join para trazer as Tags e Contagem
  let query = supabase
    .from('patients')
    .select('*, tags:patient_tags(tag:tags(*))', { count: 'exact' }) 
    .eq('clinic_id', clinicId);

  if (searchTerm) {
    query = query.or(
      `name.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
    );
  }

  // Ordenação
  if (sortBy) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  }
  
  // Paginação
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  
  if (error) {
      console.error("[DB] Error fetching patients:", error);
      throw error;
  }
  
  return { data, count };
};

export const getPatientById = async (id) => {
  const clinicId = await getClinicId();
  if (!clinicId) return null;

  const { data, error } = await supabase
    .from('patients')
    .select(`
      *, 
      tags:patient_tags(tag:tags(*)),
      phones:patient_phones(*) 
    `) 
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .single();
    
  if (error) {
      console.error("[DB] Error fetching patient by ID:", error);
      return null;
  }
  return data;
};

export const addPatient = async (patientData) => {
  const clinicId = await getClinicId();
  if (!clinicId) throw new Error('Clinic ID not found');
  const userId = await getUserId();

  const cleanData = Object.fromEntries(
      Object.entries(patientData).map(([k, v]) => [k, v === undefined ? null : v])
  );

  const { data, error } = await supabase
    .from('patients')
    .insert([{ 
        ...cleanData, 
        clinic_id: clinicId,
        created_by: userId,
        created_at: new Date().toISOString()
    }])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updatePatient = async (patientId, updates) => {
  const clinicId = await getClinicId();
  if (!clinicId) throw new Error('Clinic ID not found');

  const cleanUpdates = Object.fromEntries(
      Object.entries(updates).map(([k, v]) => [k, v === undefined ? null : v])
  );

  const { data, error } = await supabase
    .from('patients')
    .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
    .eq('id', patientId)
    .eq('clinic_id', clinicId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deletePatient = async (patientId) => {
  const clinicId = await getClinicId();
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', patientId)
    .eq('clinic_id', clinicId);
    
  if (error) throw error;
};

export const checkDuplicatePatient = async (name, cpf) => {
    const clinicId = await getClinicId();
    if (!clinicId) return false;
    
    const conditions = [];
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

export const getTags = async (page = 1, pageSize = 10, searchTerm = '', sortBy = 'name', sortOrder = 'asc') => {
  const clinicId = await getClinicId();
  if (!clinicId) return { data: [], count: 0 };
  
  let query = supabase
    .from('tags')
    .select('*', { count: 'exact' })
    .eq('clinic_id', clinicId);

  if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count } = await query;
  return { data: data || [], count: count || 0 };
};

export const addTag = async (tagData) => {
  const clinicId = await getClinicId();
  const { data, error } = await supabase.from('tags').insert([{ ...tagData, clinic_id: clinicId }]).select().single();
  if (error) throw error;
  return data;
};

export const deleteTag = async (id) => {
  const clinicId = await getClinicId();
  const { error } = await supabase.from('tags').delete().eq('id', id).eq('clinic_id', clinicId);
  if (error) throw error;
  return true;
};

export const addPatientTag = async (patientId, tagId) => {
   const { data: existing } = await supabase.from('patient_tags').select('id').eq('patient_id', patientId).eq('tag_id', tagId).maybeSingle();
   if (existing) return existing;
   const { data, error } = await supabase.from('patient_tags').insert([{ patient_id: patientId, tag_id: tagId }]).select().single();
   if (error) throw error;
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

export const getPatientsByTags = async (tagIds) => {
  const clinicId = await getClinicId();
  if (!clinicId || !tagIds || tagIds.length === 0) return { data: [], count: 0 };
  const { data: relations } = await supabase.from('patient_tags').select('patient_id').in('tag_id', tagIds);
  if (!relations || relations.length === 0) return { data: [], count: 0 };
  
  const patientIds = [...new Set(relations.map(r => r.patient_id))];
  const { data, count } = await supabase.from('patients').select('*', {count: 'exact'}).in('id', patientIds).eq('clinic_id', clinicId);
  return { data, count };
};

// ======================================================================
// Agendamentos (Appointments) - CORRIGIDO E ROBUSTO
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

// --- CORREÇÃO: Remove ID antes de inserir para evitar erro 23505 ---
export const addAppointment = async (d) => {
    const cid = await getClinicId();
    // Remove o ID do objeto para garantir que o banco gere um novo
    const { id, ...dataToInsert } = d;
    
    const { data, error } = await supabase
        .from('appointments')
        .insert([{ ...dataToInsert, clinic_id: cid }])
        .select()
        .single();
    
    if(error) throw error; 
    return data;
};

// --- CORREÇÃO: Aceita (objeto) OU (id, updates) para evitar TypeError ---
export const updateAppointment = async (arg1, arg2) => {
    const cid = await getClinicId();
    
    let id, updates;

    // Lógica para detectar como a função foi chamada
    // Se arg1 for um objeto com dados, extrai o ID dele
    if (typeof arg1 === 'object' && arg1 !== null) {
        id = arg1.id;
        updates = { ...arg1 };
        delete updates.id; // Remove ID do corpo do update
    } else {
        // Se arg1 for o ID e arg2 for os updates (formato antigo)
        id = arg1;
        updates = arg2;
    }

    if (!id) throw new Error("ID do agendamento é obrigatório para atualização.");
    if (!updates) throw new Error("Dados para atualização não fornecidos.");

    const allowedColumns = [
        'clinic_id', 'patient_id', 'professional_id', 'appointment_date', 
        'status', 'appointment_type', 'duration', 'notes', 'obs',
        'contact_id', 'title', 'start_time', 'end_time', 
        'location', 'professional_name' // Incluído para Domiciliar
    ];

    const cleanUpdates = Object.keys(updates)
        .filter(key => allowedColumns.includes(key))
        .reduce((obj, key) => {
            obj[key] = updates[key];
            return obj;
        }, {});

    const { data, error } = await supabase
        .from('appointments')
        .update(cleanUpdates)
        .eq('id', id)
        .eq('clinic_id', cid)
        .select()
        .single();
        
    if(error) {
        console.error('[DB] Erro no Update:', error);
        throw error;
    } 
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
    
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
        
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

// ======================================================================
// Outras Entidades (Tasks, Leads, Social, Repairs, Team)
// ======================================================================

export const getRepairs = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('repairs').select('*').eq('clinic_id', cid).order('created_at', {ascending: false});
    return data || [];
};
export const addRepair = async (d) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('repairs').insert([{...d, clinic_id: cid}]).select().single();
    if(error) throw error; return data;
};
export const updateRepair = async (id, u) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('repairs').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    if(error) throw error; return data;
};
export const deleteRepair = async (id) => {
    const cid = await getClinicId();
    const { error } = await supabase.from('repairs').delete().eq('id', id).eq('clinic_id', cid);
    if(error) throw error;
};

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
// Dashboard Analytics
// ======================================================================

export const getDashboardMetrics = async () => {
  const clinicId = await getClinicId();
  if (!clinicId) return null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: leads, error } = await supabase
    .from('leads')
    .select('status, source, response_time_seconds, followup_count, estimated_value, created_at')
    .eq('clinic_id', clinicId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (error) {
      console.error('Erro ao buscar métricas:', error);
      return null;
  }

  const leadsWithResponse = leads.filter(l => l.response_time_seconds > 0);
  const avgResponseTimeSeconds = leadsWithResponse.length > 0
    ? leadsWithResponse.reduce((acc, curr) => acc + curr.response_time_seconds, 0) / leadsWithResponse.length
    : 0;
  
  const leadsRecebendoFollowup = leads.filter(l => l.followup_count > 0);
  const leadsResgatados = leadsRecebendoFollowup.filter(l => 
    !['stopped_responding', 'no_purchase'].includes(l.status)
  );
  
  const taxaResgate = leadsRecebendoFollowup.length > 0 
    ? Math.round((leadsResgatados.length / leadsRecebendoFollowup.length) * 100) 
    : 0;

  const sources = {};
  leads.forEach(l => {
    const src = l.source || 'Desconhecido';
    sources[src] = (sources[src] || 0) + 1;
  });
  
  const funnel = {
    total: leads.length,
    scheduled: leads.filter(l => ['scheduled', 'arrived', 'purchased'].includes(l.status)).length,
    purchased: leads.filter(l => l.status === 'purchased').length
  };

  return {
    avgResponseTimeMinutes: Math.round(avgResponseTimeSeconds / 60),
    rescueRate: taxaResgate,
    totalRescued: leadsResgatados.length,
    totalFollowups: leadsRecebendoFollowup.length,
    sources,
    funnel,
    totalLeadsMonth: leads.length
  };
};

export { supabase, getClinicId };