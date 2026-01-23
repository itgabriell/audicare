import { supabase } from './lib/customSupabaseClient';

const getClinicId = async () => {
  try {
    console.log("[DB] 🔍 Buscando clinic_id...");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn("[DB] ❌ Sessão não encontrada");
      return null;
    }

    console.log("[DB] ✅ Sessão encontrada, user ID:", session.user.id);

    // Tenta metadados primeiro
    if (session.user?.user_metadata?.clinic_id) {
        console.log("[DB] ✅ clinic_id encontrado nos metadados:", session.user.user_metadata.clinic_id);
        return session.user.user_metadata.clinic_id;
    }

    console.log("[DB] 🔍 clinic_id não encontrado nos metadados, buscando na tabela profiles...");

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('clinic_id')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error("[DB] ❌ Erro ao buscar profile:", profileError);
      return null;
    }

    if (profile?.clinic_id) {
      console.log("[DB] ✅ clinic_id encontrado na tabela profiles:", profile.clinic_id);
      return profile.clinic_id;
    }

    console.warn("[DB] ⚠️ clinic_id não encontrado em nenhum lugar");
    return null;
  } catch (error) {
      console.error("[DB] ❌ Erro geral ao buscar clinic_id:", error);
      return null;
  }
};

const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
}

// ======================================================================
// Patients (Lógica Original Restaurada)
// ======================================================================

export const getPatients = async (page = 1, pageSize = 10, searchTerm = '', sortBy = 'created_at', sortOrder = 'desc') => {
  console.log(`[DB] Fetching patients...`);
  const clinicId = await getClinicId();
  if (!clinicId) {
      console.warn("[DB] getPatients abortado: Clinic ID não encontrado."); // AVISO IMPORTANTE
      return { data: [], count: 0 };
  }

  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .eq('clinic_id', clinicId);

  if (searchTerm) {
    query = query.or(
      `name.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`,
    );
  }

  // Ordenação e Paginação
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
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
    .select('*')
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
  if (!clinicId) throw new Error('User is not associated with a clinic.');
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
  if (!clinicId) throw new Error('User is not associated with a clinic.');

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
  if (!clinicId) throw new Error('User is not associated with a clinic.');

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
    let query = supabase.from('patients').select('id').eq('clinic_id', clinicId);
    const conditions = [];
    if (name) conditions.push(`name.eq."${name.replace(/"/g, '""')}"`);
    if (cpf) conditions.push(`cpf.eq."${cpf.replace(/"/g, '""')}"`);
    if (conditions.length > 0) {
        query = query.or(conditions.join(','));
        const { data } = await query;
        return data && data.length > 0;
    }
    return false;
};

// ======================================================================
// Tags System - Implementações básicas
// ======================================================================

export const getTags = async (page = 1, pageSize = 10, searchTerm = '', sortBy = 'name', sortOrder = 'asc') => {
  const clinicId = await getClinicId();
  if (!clinicId) return { data: [], count: 0 };

  let query = supabase
    .from('tags')
    .select('*', { count: 'exact' })
    .eq('clinic_id', clinicId)
    .eq('is_active', true);

  if (searchTerm) {
    query = query.ilike('name', `%${searchTerm}%`);
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("[DB] Error fetching tags:", error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
};

export const addTag = async (tagData) => {
  const clinicId = await getClinicId();
  if (!clinicId) throw new Error('User is not associated with a clinic.');

  const { data, error } = await supabase
    .from('tags')
    .insert([{ ...tagData, clinic_id: clinicId }])
    .select()
    .single();

  if (error) {
    console.error("[DB] Error adding tag:", error);
    throw error;
  }

  return data;
};

export const deleteTag = async (id) => {
  const clinicId = await getClinicId();
  if (!clinicId) throw new Error('User is not associated with a clinic.');

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id)
    .eq('clinic_id', clinicId);

  if (error) {
    console.error("[DB] Error deleting tag:", error);
    throw error;
  }

  return true;
};

export const getPatientTags = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('patient_tags')
      .select(`
        id,
        tag_id,
        tags (
          id,
          name,
          color,
          description
        )
      `)
      .eq('patient_id', patientId);

    if (error) {
      console.error("[DB] Error fetching patient tags:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[DB] Error fetching patient tags:", error);
    return [];
  }
};

export const addPatientTag = async (patientId, tagId) => {
  const { data, error } = await supabase
    .from('patient_tags')
    .insert({ patient_id: patientId, tag_id: tagId })
    .select()
    .single();

  if (error) {
    console.error("[DB] Error adding patient tag:", error);
    throw error;
  }

  return data;
};

export const removePatientTag = async (patientId, tagId) => {
  const { error } = await supabase
    .from('patient_tags')
    .delete()
    .eq('patient_id', patientId)
    .eq('tag_id', tagId);

  if (error) {
    console.error("[DB] Error removing patient tag:", error);
    throw error;
  }

  return true;
};

export const getPatientsByTags = async (tagIds = [], page = 1, pageSize = 10, searchTerm = '') => {
  const clinicId = await getClinicId();
  if (!clinicId) return { data: [], count: 0 };

  try {
    let query;

    if (tagIds.length > 0) {
      // Buscar pacientes que têm pelo menos uma das tags especificadas
      query = supabase
        .from('patient_tags')
        .select(`
          patient_id,
          patients!inner (
            id,
            name,
            cpf,
            phone,
            email,
            created_at,
            notes
          )
        `, { count: 'exact' })
        .in('tag_id', tagIds)
        .eq('patients.clinic_id', clinicId);
    } else {
      // Buscar todos os pacientes da clínica
      query = supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .eq('clinic_id', clinicId);
    }

    if (searchTerm) {
      if (tagIds.length > 0) {
        query = query.ilike('patients.name', `%${searchTerm}%`);
      } else {
        query = query.or(`name.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[DB] Error fetching patients by tags:", error);
      return { data: [], count: 0 };
    }

    // Se filtrou por tags, os dados vêm aninhados
    let patients = data;
    if (tagIds.length > 0 && data) {
      patients = data.map(item => item.patients).filter(Boolean);
      // Remover duplicatas (caso paciente tenha múltiplas tags)
      const seen = new Set();
      patients = patients.filter(patient => {
        if (seen.has(patient.id)) return false;
        seen.add(patient.id);
        return true;
      });
    }

    return { data: patients || [], count: count || 0 };
  } catch (error) {
    console.error("[DB] Critical error fetching patients by tags:", error);
    return { data: [], count: 0 };
  }
};

// ======================================================================
// Social Media - Campaigns & Posts
// ======================================================================

export const getCampaigns = async () => {
  const clinicId = await getClinicId();
  if (!clinicId) return [];

  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DB] Error fetching campaigns:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[DB] Critical error fetching campaigns:', error);
    return [];
  }
};

export const getSocialPosts = async () => {
  const clinicId = await getClinicId();
  if (!clinicId) return [];

  try {
    const { data, error } = await supabase
      .from('social_posts')
      .select(`
        *,
        campaigns (
          id,
          title,
          status
        )
      `)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DB] Error fetching social posts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[DB] Critical error fetching social posts:', error);
    return [];
  }
};

export const addSocialPost = async (postData) => {
  const clinicId = await getClinicId();
  if (!clinicId) throw new Error('User is not associated with a clinic.');
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('social_posts')
    .insert([{
      ...postData,
      clinic_id: clinicId,
      created_by: userId,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateSocialPost = async (postId, updates) => {
  const clinicId = await getClinicId();
  if (!clinicId) throw new Error('User is not associated with a clinic.');

  const { data, error } = await supabase
    .from('social_posts')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', postId)
    .eq('clinic_id', clinicId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteSocialPost = async (postId) => {
  const clinicId = await getClinicId();
  if (!clinicId) throw new Error('User is not associated with a clinic.');

  const { error } = await supabase
    .from('social_posts')
    .delete()
    .eq('id', postId)
    .eq('clinic_id', clinicId);

  if (error) throw error;
};

// ======================================================================
// Notifications - Função de criação
// ======================================================================

export const createNotification = async (notificationData) => {
  const clinicId = await getClinicId();
  const userId = await getUserId();

  if (!clinicId || !userId) {
    console.warn('[DB] Cannot create notification: missing clinic_id or user_id');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
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
      }])
      .select()
      .single();

    if (error) {
      console.error("[DB] Error creating notification:", error);
      throw error;
    }

    console.log("[DB] Notification created:", data.id);
    return data;
  } catch (error) {
    console.error("[DB] Critical error creating notification:", error);
    return null;
  }
};

// ======================================================================
// Notification Settings - Implementações básicas
// ======================================================================

export const getNotificationSettings = async () => {
  const userId = await getUserId();
  if (!userId) return {
    appointment: true,
    message: true,
    task: true,
    system: true,
    patient: true
  };

  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching notification settings:', error);
      // Retornar configurações padrão se não conseguir buscar
      return {
        appointment: true,
        message: true,
        task: true,
        system: true,
        patient: true
      };
    }

    // Converter array em objeto
    const settings = {};
    data.forEach(setting => {
      settings[setting.notification_type] = setting.enabled;
    });

    return settings;
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return {
      appointment: true,
      message: true,
      task: true,
      system: true,
      patient: true
    };
  }
};

export const updateNotificationSettings = async (settings) => {
  const userId = await getUserId();
  const clinicId = await getClinicId();

  if (!userId || !clinicId) {
    throw new Error('User or clinic not found');
  }

  // Converter objeto em array para upsert
  const settingsArray = Object.entries(settings).map(([type, enabled]) => ({
    user_id: userId,
    notification_type: type,
    enabled,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('notification_settings')
    .upsert(settingsArray, {
      onConflict: 'user_id,notification_type'
    });

  if (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }

  return true;
};

export const getUnreadNotificationCount = async () => {
  const userId = await getUserId();
  if (!userId) return 0;

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error counting unread notifications:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
};

// ======================================================================
// Patient Appointments - Função específica
// ======================================================================

export const getPatientAppointments = async (patientId) => {
  const clinicId = await getClinicId();
  if (!clinicId) return [];

  try {
    // Buscar agendamentos do paciente específico usando patient_id
    let query = supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        title,
        status,
        professional_id,
        obs,
        created_at,
        professionals:professional_id (
          id,
          full_name
        )
      `)
      .eq('clinic_id', clinicId)
      .eq('patient_id', patientId)
      .order('start_time', { ascending: false }); // Mais recentes primeiro

    const { data: appointmentsData, error } = await query;

    if (error) {
      console.error("[DB] Error fetching patient appointments:", error);
      throw error;
    }

    if (!appointmentsData || appointmentsData.length === 0) {
      return [];
    }

    // Processar dados dos profissionais
    return appointmentsData.map(appointment => ({
      ...appointment,
      professional: appointment.professionals ? {
        id: appointment.professionals.id,
        name: appointment.professionals.full_name || 'Profissional não informado'
      } : {
        name: 'Profissional não informado'
      }
    }));

  } catch (error) {
    console.error("[DB] Critical error fetching patient appointments:", error);
    return [];
  }
};

// ======================================================================
// Outras Entidades (Appointments, Tasks, etc.)
// ======================================================================

export const getAppointments = async (filters = {}) => {
  const clinicId = await getClinicId();
  if (!clinicId) return [];

  let query = supabase.from('appointments').select(`
    *,
    patients!patient_id (
      id,
      name,
      phone,
      cpf
    )
  `).eq('clinic_id', clinicId);

  if (filters.startDate) {
    query = query.gte('start_time', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('start_time', filters.endDate);
  }

  const { data, error } = await query.order('start_time', { ascending: true });

  if (error) {
    console.error('[DB] Error fetching appointments:', error);
    throw error;
  }

  // Transformar dados para manter compatibilidade com código existente
  return data.map(appointment => ({
    ...appointment,
    contact: appointment.patients ? {
      id: appointment.patients.id,
      name: appointment.patients.name || 'Paciente'
    } : { name: 'Paciente' }
  }));
};

export const addAppointment = async (d) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('appointments').insert([{...d, clinic_id: cid}]).select().single();
    if(error) throw error; return data;
};

export const updateAppointment = async (id, updates) => {
    const cid = await getClinicId();

    // Sanitização rigorosa: lista branca de colunas permitidas
    const allowedColumns = [
        'clinic_id', 'patient_id', 'professional_id', 'appointment_date',
        'status', 'appointment_type', 'notes', 'duration', 'obs'
    ];

    // Filtra o objeto updates para manter apenas chaves que estão na allowedColumns
    const cleanUpdates = Object.keys(updates)
        .filter(key => allowedColumns.includes(key))
        .reduce((obj, key) => {
            obj[key] = updates[key];
            return obj;
        }, {});

    const { data, error } = await supabase.from('appointments').update(cleanUpdates).eq('id', id).eq('clinic_id', cid).select().single();
    if(error) throw error; return data;
};

export const deleteAppointment = async (id) => {
    const cid = await getClinicId();
    const { error } = await supabase.from('appointments').delete().eq('id', id).eq('clinic_id', cid);
    if(error) throw error;
};

export const getNotificationsForUser = async (uid) => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', {ascending: false});
    return data || [];
};

export const markNotificationAsRead = async (id) => {
    const { data } = await supabase.from('notifications').update({is_read: true}).eq('id', id).select().single();
    return data;
};

export const markAllNotificationsAsRead = async (uid) => {
    await supabase.from('notifications').update({is_read: true}).eq('user_id', uid).eq('is_read', false);
    return true;
};

export const deleteNotification = async (id) => {
    await supabase.from('notifications').delete().eq('id', id);
    return true;
};

// Entidades restantes mantidas simples
export const getRepairs = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('repairs').select('*').eq('clinic_id', cid).order('created_at', {ascending: false});
    return data || [];
};

export const addRepair = async (d) => {
    const cid = await getClinicId();
    const { data } = await supabase.from('repairs').insert([{...d, clinic_id: cid}]).select().single();
    return data;
};

export const updateRepair = async (id, u) => {
    const cid = await getClinicId();
    const { data } = await supabase.from('repairs').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    return data;
};

export const deleteRepair = async (id) => {
    const cid = await getClinicId();
    await supabase.from('repairs').delete().eq('id', id).eq('clinic_id', cid);
};

export const getTasks = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('tasks').select('*').eq('clinic_id', cid).order('created_at', {ascending: false});
    return data || [];
};

export const addTask = async (d) => {
    const cid = await getClinicId();
    const uid = await getUserId();
    const { data } = await supabase.from('tasks').insert([{...d, clinic_id: cid, created_by: uid}]).select().single();
    return data;
};

export const updateTask = async (id, u) => {
    const cid = await getClinicId();
    const { data } = await supabase.from('tasks').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    return data;
};

export const deleteTask = async (id) => {
    const cid = await getClinicId();
    await supabase.from('tasks').delete().eq('id', id).eq('clinic_id', cid);
};

export const getTeamMembers = async () => {
    const cid = await getClinicId();
    // Verificar se a coluna clinic_id existe na tabela profiles
    // Se não existir, buscar todos os usuários (sem filtro de clínica)
    // Nota: Removido 'email' pois não existe na tabela profiles
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url')
        .eq('clinic_id', cid);

      if (error && error.code === 'PGRST116') {
        // Coluna clinic_id não existe, buscar sem filtro
        console.warn('[DB] clinic_id column not found in profiles table, fetching all users');
        const { data: allData } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url');
        return allData || [];
      }

      if (error) {
        console.error('[DB] Error fetching team members:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[DB] Critical error fetching team members:', error);
      // Fallback: tentar buscar sem filtro de clínica
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url');
        return data || [];
      } catch (fallbackError) {
        console.error('[DB] Fallback also failed:', fallbackError);
        return [];
      }
    }
};

export const getLeads = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('leads').select('*').eq('clinic_id', cid).order('created_at', {ascending: false});
    return data || [];
};

export const addLead = async (d) => {
    const cid = await getClinicId();
    const { data } = await supabase.from('leads').insert([{...d, clinic_id: cid}]).select().single();
    return data;
};

export const updateLead = async (id, u) => {
    const cid = await getClinicId();
    const { data } = await supabase.from('leads').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    return data;
};

export const getContactByPatientId = async (pid) => {
    const { data } = await supabase.from('contact_relationships').select('contact_id').eq('related_entity_id', pid).eq('related_entity_type', 'patient').maybeSingle();
    if(!data) return null;
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

export { supabase, getClinicId };
