import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const FileUploadButton = ({ onFileSelected, disabled, children }) => {
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'O tamanho máximo é 10MB.' });
      return;
    }

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4'];
    if (!allowedTypes.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Tipo não suportado', description: 'Envie apenas imagens, PDFs ou vídeos.' });
      return;
    }

    try {
      // Upload para Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chat-media/${fileName}`;

      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      // Determinar tipo de mensagem
      let messageType = 'document';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';

      onFileSelected?.({
        content: file.name,
        media_url: publicUrl,
        message_type: messageType,
        file: file
      });

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao fazer upload do arquivo.' });
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      {children ? (
        <div onClick={() => !disabled && fileInputRef.current?.click()}>
          {children}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5"
          title="Anexar arquivo"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          type="button"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
      )}
    </>
  );
};

export default FileUploadButton;
