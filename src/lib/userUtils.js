import { supabase } from '@/lib/customSupabaseClient';

/**
 * Initializes a new clinic for a user if they don't have one.
 * Creates a clinic, sets the user as the owner, and updates their profile.
 * @param {object} user - The Supabase user object.
 * @param {object} profile - The user's profile data.
 * @returns {Promise<object>} The updated user profile with the new clinic_id.
 */
export const initializeUserClinic = async (user, profile) => {
  console.log(`[userUtils:initializeUserClinic] Initializing clinic for user ${user.id}`);
  try {
    // 1. Create a default clinic for the new user using an RPC call
    const clinicName = profile.full_name ? `${profile.full_name}'s Clinic` : `My Clinic`;
    const { data: newClinic, error: clinicError } = await supabase.rpc(
      'create_clinic_and_add_owner',
      {
        clinic_data: { name: clinicName },
        p_owner_id: user.id,
      }
    );

    if (clinicError) {
      console.error('[userUtils:initializeUserClinic] Error creating clinic:', clinicError);
      throw new Error('Failed to create initial clinic for user.');
    }

    console.log(`[userUtils:initializeUserClinic] Clinic ${newClinic.id} created for user ${user.id}`);

    // 2. Update the user's profile with the new clinic_id
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({ clinic_id: newClinic.id })
      .eq('id', user.id)
      .select()
      .single();

    if (profileError) {
      console.error('[userUtils:initializeUserClinic] Error updating profile with clinic_id:', profileError);
      throw new Error('Failed to associate clinic with user profile.');
    }
    
    console.log(`[userUtils:initializeUserClinic] Profile for user ${user.id} updated with clinic_id ${newClinic.id}`);
    return updatedProfile;

  } catch (error) {
    console.error('[userUtils:initializeUserClinic] Full error:', error);
    // In case of failure, return the original profile to avoid breaking the auth flow
    return profile;
  }
};


export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export const updateUserProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getClinicMembers = async (clinicId) => {
  const { data, error } = await supabase
    .from('clinic_members')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        email,
        role,
        avatar_url
      )
    `)
    .eq('clinic_id', clinicId);

  if (error) throw error;
  return data;
};