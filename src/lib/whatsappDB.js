import { supabase } from '@/lib/customSupabaseClient';

export const whatsappDB = {
  async getTemplates() {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createTemplate(template) {
    const { data, error } = await supabase
      .from('message_templates')
      .insert(template)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async updatePhoneConfig(config) {
    // Assuming single config row for now or per user
    // This is a simplified implementation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from('whatsapp_config')
      .upsert({ 
         updated_at: new Date(),
         phone_number: config.phone_number,
         status: 'active' // default
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  
  async getConfig() {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) return null;
      return data;
  }
};