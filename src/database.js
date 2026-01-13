import { supabase } from './lib/customSupabaseClient';

const getClinicId = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;

    // Try metadata first for speed
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
// Patients
// ======================================================================

export const getPatients = async (page = 1, pageSize = 10, searchTerm = '', sortBy = 'created_at', sortOrder = 'desc') => {
  console.log(`[DB] Fetching patients. Page: ${page}, Search: "${searchTerm}"`);
  const clinicId = await getClinicId();
  if (!clinicId) return { data: [], count: 0 };

  try {
    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId);

    if (searchTerm) {
      query = query.or(
        `name.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`,
      );
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error("[DB] Error fetching patients:", error);
        throw error;
    }

    // Buscar telefones para cada paciente (opcional, pode falhar se tabela não existir)
    if (data && data.length > 0) {
      try {
        const patientIds = data.map(p => p.id);
        const { data: phonesData } = await supabase
          .from('patient_phones')
          .select('*')
          .in('patient_id', patientIds)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true });

        // Agrupar telefones por paciente
        const phonesByPatient = {};
        if (phonesData) {
          phonesData.forEach(phone => {
            if (!phonesByPatient[phone.patient_id]) {
              phonesByPatient[phone.patient_id] = [];
            }
            phonesByPatient[phone.patient_id].push(phone);
          });
        }

        // Adicionar telefones aos pacientes e manter compatibilidade
        data.forEach(patient => {
          patient.phones = phonesByPatient[patient.id] || [];
          // Manter telefone principal no campo phone para compatibilidade
          const primaryPhone = patient.phones.find(p => p.is_primary);
          if (primaryPhone) {
            patient.phone = primaryPhone.phone;
          } else if (patient.phones.length > 0) {
            patient.phone = patient.phones[0].phone;
          }
        });
      } catch (phonesError) {
        console.warn("[DB] Could not fetch patient phones, continuing without:", phonesError);
        // Continue sem telefones se a tabela não existir
      }
    }

    return { data, count };
  } catch (error) {
    console.error("[DB] Critical error fetching patients:", error);
    // Retornar dados vazios em caso de erro crítico para não quebrar a UI
    return { data: [], count: 0 };
  }
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

  // Buscar telefones do paciente
  if (data) {
    const { data: phones, error: phonesError } = await supabase
      .from('patient_phones')
      .select('*')
      .eq('patient_id', id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (!phonesError && phones) {
      data.phones = phones;
      // Manter compatibilidade: telefone principal no campo phone
      const primaryPhone = phones.find(p => p.is_primary);
      if (primaryPhone) {
        data.phone = primaryPhone.phone;
      } else if (phones.length > 0) {
        // Se não há principal, usar o primeiro
        data.phone = phones[0].phone;
      }
    }
  }

  return data;
};

export const checkDuplicatePatient = async (name, cpf) => {
    const clinicId = await getClinicId();
    if (!clinicId) return false;

    // Check logical duplication: Name OR CPF
    const conditions = [];
    if (name) {
        conditions.push(`name.eq.${name}`);
    }
    if (cpf) {
        conditions.push(`cpf.eq.${cpf}`);
    }
    
    if (conditions.length === 0) return false;

    const { data, error } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .or(conditions.join(','));

    if (error) {
        console.error("[DB] Error checking duplicates:", error);
        return false;
    }
    return data && data.length > 0;
};

export const addPatient = async (patientData) => {
  console.log("[DB] Adding patient:", patientData);
  const clinicId = await getClinicId();
  if (!clinicId) throw new Error('User is not associated with a clinic.');
  
  const userId = await getUserId();

  // Separar telefones e campos não existentes dos dados do paciente
  const { phones, avatar_url, ...patientInfo } = patientData;

  // Clean undefined values to avoid DB errors
  const cleanData = Object.fromEntries(
      Object.entries(patientInfo).map(([k, v]) => [k, v === undefined ? null : v])
  );

  // Remover phones do cleanData se existir
  delete cleanData.phones;

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
    
  if (error) {
      console.error("[DB] Error adding patient:", error);
      throw error;
  }

  // Salvar telefones se houver
  if (phones && phones.length > 0) {
    await savePatientPhones(data.id, phones);
  }

  return data;
};

// Função auxiliar para salvar telefones do paciente
const savePatientPhones = async (patientId, phones) => {
  if (!phones || phones.length === 0) return;

  try {
    // Remover todos os telefones antigos do paciente
    const { error: deleteError } = await supabase
      .from('patient_phones')
      .delete()
      .eq('patient_id', patientId);
    
    if (deleteError) {
      console.error("[DB] Error deleting old phones:", deleteError);
      throw deleteError;
    }

    // Preparar telefones para inserção (remover IDs temporários)
    const phonesToInsert = phones
      .filter(phone => phone.phone && phone.phone.trim()) // Filtrar telefones vazios
      .map(phone => ({
        patient_id: patientId,
        phone: phone.phone,
        phone_type: phone.phone_type || 'mobile',
        contact_name: phone.contact_name || null,
        is_primary: phone.is_primary || false,
        is_whatsapp: phone.is_whatsapp !== false,
        notes: phone.notes || null,
      }));
    
    // Inserir todos os telefones
    if (phonesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('patient_phones')
        .insert(phonesToInsert);
      
      if (insertError) {
        console.error("[DB] Error inserting phones:", insertError);
        throw insertError;
      }
    }
  } catch (error) {
    console.error("[DB] Error saving patient phones:", error);
    throw error;
  }
};

export const updatePatient = async (patientId, updates) => {
  console.log(`[DB] Updating patient ${patientId}`);
  const clinicId = await getClinicId();
  if (!clinicId) throw new Error('User is not associated with a clinic.');

  // Separar telefones dos dados do paciente
  const { phones, ...patientUpdates } = updates;

  // Remover phones do cleanUpdates se existir
  const cleanUpdates = Object.fromEntries(
      Object.entries(patientUpdates).map(([k, v]) => [k, v === undefined ? null : v])
  );

  const { data, error } = await supabase
    .from('patients')
    .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
    .eq('id', patientId)
    .eq('clinic_id', clinicId)
    .select()
    .single();
    
  if (error) throw error;

  // Salvar telefones se houver
  if (phones && phones.length > 0) {
    await savePatientPhones(patientId, phones);
  }

  return data;
};

export const deletePatient = async (patientId) => {
  console.log(`[DB] Deleting patient ${patientId}`);
  const clinicId = await getClinicId();
  if (!clinicId) throw new Error('User is not associated with a clinic.');

  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', patientId)
    .eq('clinic_id', clinicId);
    
  if (error) throw error;
};

export const getAppointments = async (filters = {}) => {
  const clinicId = await getClinicId();
  if (!clinicId) return [];

  try {
    // Primeiro, vamos buscar apenas os appointments sem filtros para descobrir as colunas
    const { data: testData, error: testError } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .limit(1);

    if (testError) {
      console.error("[DB] Error testing appointments table:", testError);
      throw testError;
    }

    // Verificar quais colunas existem nos dados de teste
    const sampleAppointment = testData?.[0];
    console.log("[DB] Sample appointment structure:", sampleAppointment);

    // Determinar qual coluna usar para data (tentar várias possibilidades)
    const dateColumn = sampleAppointment?.appointment_date ? 'appointment_date' :
                      sampleAppointment?.scheduled_at ? 'scheduled_at' :
                      sampleAppointment?.start_time ? 'start_time' :
                      sampleAppointment?.created_at ? 'created_at' : null;

    console.log("[DB] Using date column:", dateColumn);

    // Buscar appointments com ordenação baseada na coluna descoberta
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId);

    // Aplicar filtros se a coluna de data foi encontrada
    if (dateColumn && filters.startDate) {
      query = query.gte(dateColumn, filters.startDate);
    }
    if (dateColumn && filters.endDate) {
      query = query.lte(dateColumn, filters.endDate);
    }

    // Ordenar pela coluna de data se encontrada, senão por created_at
    const orderColumn = dateColumn || 'created_at';
    const { data: appointmentsData, error } = await query.order(orderColumn, { ascending: true });

    if (error) {
      console.error("[DB] Error fetching appointments:", error);
      throw error;
    }

    if (!appointmentsData || appointmentsData.length === 0) {
      return [];
    }

    // Buscar dados dos pacientes separadamente
    try {
      const patientIds = [...new Set(appointmentsData.map(app => app.patient_id).filter(Boolean))];

      if (patientIds.length > 0) {
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('id, name, phone')
          .in('id', patientIds)
          .eq('clinic_id', clinicId);

        if (!patientsError && patientsData) {
          // Criar mapa de pacientes
          const patientsMap = {};
          patientsData.forEach(patient => {
            patientsMap[patient.id] = patient;
          });

          // Combinar dados
          return appointmentsData.map(appointment => ({
            ...appointment,
            contact: appointment.patient_id ? {
              name: patientsMap[appointment.patient_id]?.name || 'Paciente não encontrado',
              phone: patientsMap[appointment.patient_id]?.phone || ''
            } : null
          }));
        }
      }

      // Se não conseguiu buscar pacientes, retornar sem dados de contato
      return appointmentsData.map(appointment => ({
        ...appointment,
        contact: null
      }));

    } catch (joinError) {
      console.warn("[DB] Could not fetch patient data for appointments, continuing without:", joinError);
      // Retornar appointments sem dados de pacientes
      return appointmentsData.map(appointment => ({
        ...appointment,
        contact: null
      }));
    }
  } catch (error) {
    console.error("[DB] Critical error fetching appointments:", error);
    // Retornar array vazio em caso de erro crítico para não quebrar a UI
    return [];
  }
};
export const addAppointment = async (d) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('appointments').insert([{...d, clinic_id: cid}]).select().single();
    if(error) throw error; return data;
};
export const updateAppointment = async (id, u) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('appointments').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    if(error) throw error; return data;
};
export const deleteAppointment = async (id) => {
    const cid = await getClinicId();
    const { error } = await supabase.from('appointments').delete().eq('id', id).eq('clinic_id', cid);
    if(error) throw error;
};
export const getRepairs = async () => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('repairs').select('*').eq('clinic_id', cid).order('created_at', {ascending: false});
    if(error) throw error; return data;
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
    const { data, error } = await supabase.from('tasks').select('*').eq('clinic_id', cid).order('created_at', {ascending: false});
    if(error) throw error; return data;
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
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, avatar_url').eq('clinic_id', cid);
    if(error) throw error; return data;
};

// ======================================================================
// Marketing Campaigns
// ======================================================================

export const getCampaigns = async () => {
    const clinicId = await getClinicId();
    if (!clinicId) return [];
    const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const addCampaign = async (campaignData, userId) => {
    const clinicId = await getClinicId();
    if (!clinicId) throw new Error('Clinic ID not found');
    const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert({ ...campaignData, clinic_id: clinicId })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateCampaign = async (id, campaignData) => {
    const { data, error } = await supabase
        .from('marketing_campaigns')
        .update(campaignData)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteCampaign = async (id) => {
    const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// ======================================================================
// Social Posts
// ======================================================================

export const getSocialPosts = async () => {
    const clinicId = await getClinicId();
    if (!clinicId) return [];
    const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('scheduled_date', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const addSocialPost = async (postData, userId) => {
    const clinicId = await getClinicId();
    if (!clinicId) throw new Error('Clinic ID not found');
    const { data, error } = await supabase
        .from('social_posts')
        .insert({ ...postData, clinic_id: clinicId })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateSocialPost = async (id, postData) => {
    const { data, error } = await supabase
        .from('social_posts')
        .update(postData)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteSocialPost = async (id) => {
    const { error } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', id);
    if (error) throw error;
};
export const getLeads = async () => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('leads').select('*').eq('clinic_id', cid).order('created_at', {ascending: false});
    if(error) throw error; return data;
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
export const getNotificationsForUser = async (uid) => {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', {ascending: false});
    if(error) throw error; return data;
};
export const markNotificationAsRead = async (id) => {
    const { data, error } = await supabase.from('notifications').update({is_read: true}).eq('id', id).select().single();
    if(error) throw error; return data;
};
export const markAllNotificationsAsRead = async (uid) => {
    const { error } = await supabase.from('notifications').update({is_read: true}).eq('user_id', uid).eq('is_read', false);
    if(error) throw error; return true;
};
export const deleteNotification = async (id) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if(error) throw error; return true;
};
export const getContactByPatientId = async (pid) => {
    const { data, error } = await supabase.from('contact_relationships').select('contact_id').eq('related_entity_id', pid).eq('related_entity_type', 'patient').maybeSingle();
    if(error || !data) return null;
    const { data: c, error: ce } = await supabase.from('contacts').select('*').eq('id', data.contact_id).single();
    if(ce) return null; return c;
};
export const getConversations = async (f={}) => {
    const cid = await getClinicId();
    let q = supabase.from('conversations').select('*, contact:contacts(*)').eq('clinic_id', cid);
    if(f.channel && f.channel !== 'all') q = q.eq('channel_type', f.channel);
    const { data, error } = await q.order('last_message_at', {ascending: false});
    if(error) throw error; return data;
};

export { supabase, getClinicId };
