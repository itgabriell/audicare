import { supabase } from '@/lib/customSupabaseClient';

export const knowledgeBaseService = {
  // Listar documentos
  async getDocuments() {
    const { data, error } = await supabase
      .from('knowledge_docs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Upload de arquivo e registro no banco
  async uploadDocument({ title, description, category, file, userId }) {
    try {
      // 1. Upload para o Storage (Bucket 'documents')
      const fileExt = file.name.split('.').pop();
      // Sanitiza o nome do arquivo para evitar problemas com caracteres especiais
      const sanitizedFileName = file.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${Date.now()}_${sanitizedFileName}`;
      const filePath = `knowledge-base/${category}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Pegar URL Pública
      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. Salvar metadados na tabela
      const { data, error: dbError } = await supabase
        .from('knowledge_docs')
        .insert([
          {
            title,
            description,
            category,
            file_url: publicUrlData.publicUrl,
            file_path: filePath,
            file_type: fileExt,
            user_id: userId
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;
      return data;

    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  },

  // Deletar documento
  async deleteDocument(id, filePath) {
    // 1. Remove do Storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath]);
    
    if (storageError) console.warn('Erro ao deletar arquivo do storage:', storageError);

    // 2. Remove do Banco
    const { error: dbError } = await supabase
      .from('knowledge_docs')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;
  }
};