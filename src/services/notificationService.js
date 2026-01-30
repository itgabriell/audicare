import { supabase, getClinicId, getUserId } from './baseService.js';

/**
 * Fetches notifications for a specific user.
 * @param {string} uid - User ID.
 * @returns {Promise<Array>} List of notifications.
 */
export const getNotificationsForUser = async (uid) => {
  if (!uid) return [];
  const { data } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false });
  return data || [];
};

/**
 * Gets the count of unread notifications for a user.
 * @param {string} uid - User ID (optional, defaults to current user).
 * @returns {Promise<number>} Count of unread notifications.
 */
export const getUnreadNotificationCount = async (uid) => {
  const userId = uid || await getUserId();
  if (!userId) return 0;
  const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
  if (error) return 0;
  return count || 0;
};

/**
 * Marks a notification as read.
 * @param {string} id - Notification ID.
 * @returns {Promise<Object>} Updated notification.
 */
export const markNotificationAsRead = async (id) => {
  const { data } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).select().single();
  return data;
};

/**
 * Marks all notifications as read for a user.
 * @param {string} uid - User ID.
 * @returns {Promise<boolean>} Success status.
 */
export const markAllNotificationsAsRead = async (uid) => {
  if (!uid) return;
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', uid).eq('is_read', false);
  return true;
};

/**
 * Deletes a notification.
 * @param {string} id - Notification ID.
 * @returns {Promise<boolean>} Success status.
 */
export const deleteNotification = async (id) => {
  await supabase.from('notifications').delete().eq('id', id);
  return true;
};

/**
 * Creates a new notification.
 * @param {Object} notificationData - Notification payload.
 * @returns {Promise<Object>} Created notification.
 */
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

/**
 * Retrieves notification settings for the user.
 * @returns {Promise<Object>} Settings object (type: boolean).
 */
export const getNotificationSettings = async () => {
  const userId = await getUserId();
  if (!userId) return { appointment: true, message: true, task: true, system: true, patient: true };
  const { data } = await supabase.from('notification_settings').select('*').eq('user_id', userId);
  if (!data) return { appointment: true, message: true, task: true, system: true, patient: true };
  const settings = {};
  data.forEach(s => settings[s.notification_type] = s.enabled);
  return settings;
};

/**
 * Updates notification settings.
 * @param {Object} settings - Settings object.
 * @returns {Promise<boolean>} Success status.
 */
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

/**
 * Backward compatibility wrapper.
 */
export const notificationService = {
  notify: async (title, message, metadata = {}) => {
    return createNotification({
      title,
      message,
      metadata,
      type: 'system',
      related_entity_type: null,
      related_entity_id: null
    });
  }
};