import { supabase, getClinicId, getUserId } from './baseService.js';

/**
 * Fetches tasks.
 * @returns {Promise<Array>} List of tasks.
 */
export const getTasks = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('tasks').select('*').eq('clinic_id', cid).order('created_at', { ascending: false });
    return data || [];
};

/**
 * Adds a task.
 * @param {Object} d - Task data.
 * @returns {Promise<Object>} Created task.
 */
export const addTask = async (d) => {
    const cid = await getClinicId();
    const uid = await getUserId();
    const { data, error } = await supabase.from('tasks').insert([{ ...d, clinic_id: cid, created_by: uid }]).select().single();
    if (error) throw error; return data;
};

/**
 * Updates a task.
 * @param {string} id - Task ID.
 * @param {Object} u - Update data.
 * @returns {Promise<Object>} Updated task.
 */
export const updateTask = async (id, u) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('tasks').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    if (error) throw error; return data;
};

/**
 * Deletes a task.
 * @param {string} id - Task ID.
 */
export const deleteTask = async (id) => {
    const cid = await getClinicId();
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('clinic_id', cid);
    if (error) throw error;
};

/**
 * Fetches team members profiles.
 * @returns {Promise<Array>} List of team members.
 */
export const getTeamMembers = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('profiles').select('id, full_name, role, avatar_url').eq('clinic_id', cid);
    return data || [];
};

/**
 * Fetches leads.
 * @returns {Promise<Array>} List of leads.
 */
export const getLeads = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('leads').select('*').eq('clinic_id', cid).order('created_at', { ascending: false });
    return data || [];
};

/**
 * Adds a new lead.
 * @param {Object} d - Lead data.
 * @returns {Promise<Object>} Created lead.
 */
export const addLead = async (d) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('leads').insert([{ ...d, clinic_id: cid }]).select().single();
    if (error) throw error; return data;
};

/**
 * Updates a lead.
 * @param {string} id - Lead ID.
 * @param {Object} u - Update data.
 * @returns {Promise<Object>} Updated lead.
 */
export const updateLead = async (id, u) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('leads').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    if (error) throw error; return data;
};

/**
 * Fetches campaigns.
 * @returns {Promise<Array>} List of campaigns.
 */
export const getCampaigns = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('campaigns').select('*').eq('clinic_id', cid);
    return data || [];
}

/**
 * Fetches social media posts.
 * @returns {Promise<Array>} List of posts.
 */
export const getSocialPosts = async () => {
    const cid = await getClinicId();
    const { data } = await supabase.from('social_posts').select('*').eq('clinic_id', cid);
    return data || [];
}

/**
 * Adds a social post.
 * @param {Object} d - Post data.
 * @returns {Promise<Object>} Created post.
 */
export const addSocialPost = async (d) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('social_posts').insert([{ ...d, clinic_id: cid }]).select().single();
    if (error) throw error; return data;
}

/**
 * Updates a social post.
 * @param {string} id - Post ID.
 * @param {Object} u - Update data.
 * @returns {Promise<Object>} Updated post.
 */
export const updateSocialPost = async (id, u) => {
    const cid = await getClinicId();
    const { data, error } = await supabase.from('social_posts').update(u).eq('id', id).eq('clinic_id', cid).select().single();
    if (error) throw error; return data;
}

/**
 * Deletes a social post.
 * @param {string} id - Post ID.
 */
export const deleteSocialPost = async (id) => {
    const cid = await getClinicId();
    const { error } = await supabase.from('social_posts').delete().eq('id', id).eq('clinic_id', cid);
    if (error) throw error;
}

/**
 * Gets contact info by patient ID.
 * @param {string} pid - Patient ID.
 * @returns {Promise<Object|null>} Contact object.
 */
export const getContactByPatientId = async (pid) => {
    const { data, error } = await supabase.from('contact_relationships').select('contact_id').eq('related_entity_id', pid).eq('related_entity_type', 'patient').maybeSingle();
    if (error || !data) return null;
    const { data: c } = await supabase.from('contacts').select('*').eq('id', data.contact_id).single();
    return c;
};

/**
 * Fetches conversations, optionally filtered by channel.
 * @param {Object} f - Filters.
 * @param {string} [f.channel] - Channel type (e.g., 'whatsapp').
 * @returns {Promise<Array>} List of conversations with contact info.
 */
export const getConversations = async (f = {}) => {
    const cid = await getClinicId();
    let q = supabase.from('conversations').select('*, contact:contacts(*)').eq('clinic_id', cid);
    if (f.channel && f.channel !== 'all') q = q.eq('channel_type', f.channel);
    const { data } = await q.order('last_message_at', { ascending: false });
    return data || [];
};
