export const updateAppointment = async (id, updates) => {
    const cid = await getClinicId();
    
    // --- VERSÃO CORRIGIDA FINAL ---
    console.log('[DB] Iniciando updateAppointment - VERSÃO FINAL');

    // 1. Lista Branca (Allowlist)
    const allowedColumns = [
        'clinic_id', 
        'patient_id', 
        'professional_id', 
        'appointment_date', 
        'status', 
        'appointment_type', 
        'duration', 
        'notes', 
        'obs',
        'contact_id',
        'title',
        'start_time',
        'end_time'
    ];

    // 2. Filtragem
    const cleanUpdates = Object.keys(updates)
        .filter(key => allowedColumns.includes(key))
        .reduce((obj, key) => {
            obj[key] = updates[key];
            return obj;
        }, {});

    // 3. Regra de Negócio: Se professional_id for nulo, atribui Dra. Karine
    if (!cleanUpdates.professional_id) {
        cleanUpdates.professional_id = 'd717c381-7600-4ce5-a6e8-cb411533d1e6'; 
    }

    console.log('[DB] Update Appointment Payload Limpo:', cleanUpdates);

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

// ======================================================================
// Notifications (Recuperando funções perdidas)
// ======================================================================

export const getNotificationsForUser = async (uid) => {
    // Se não tiver UID, retorna vazio para não quebrar
    if (!uid) return []; 
    
    const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
    return data || [];
};

export const markNotificationAsRead = async (id) => {
    const { data } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .select()
        .single();
    return data;
};

export const markAllNotificationsAsRead = async (uid) => {
    if (!uid) return;
    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', uid)
        .eq('is_read', false);
    return true;
};

export const deleteNotification = async (id) => {
    await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
    return true;
};

// Adicione LOGO APÓS as funções de notificação que você colou agora há pouco:

export const getUnreadNotificationCount = async () => {
  const userId = await getUserId(); // Usa a função auxiliar interna do arquivo
  if (!userId) return 0;

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true }) // 'head: true' é mais rápido, só conta
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

// --- Prevenção: Adicione estas duas também para evitar que o build reclame depois ---

export const createNotification = async (notificationData) => {
  const clinicId = await getClinicId();
  const userId = await getUserId();

  if (!clinicId || !userId) return null;

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

  if (error) console.error("Error creating notification:", error);
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