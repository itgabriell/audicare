import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Save, User, Upload, X } from 'lucide-react';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional(), // Email is usually read-only from auth
  phone: z.string().optional(),
  specialty: z.string().optional(),
});

const ProfileSettings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [fetching, setFetching] = useState(true);

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      specialty: '',
    },
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setFetching(false);
        return;
      }

      try {
        setFetching(true);
        // Buscar dados atualizados do perfil
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone, specialty, avatar_url')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading profile:', error);
        } else if (data) {
          form.reset({
            full_name: data.full_name || '',
            email: user.email || '',
            phone: data.phone || '',
            specialty: data.specialty || '',
          });
          setAvatarUrl(data.avatar_url);
        } else {
          // Se não há perfil, usar dados do contexto
      form.reset({
            full_name: profile?.full_name || '',
        email: user.email || '',
            phone: profile?.phone || '',
            specialty: profile?.specialty || '',
      });
          setAvatarUrl(profile?.avatar_url || null);
        }
      } catch (error) {
        console.error('Error in loadProfile:', error);
      } finally {
        setFetching(false);
      }
    };

    loadProfile();
  }, [user, profile, form]);

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você precisa selecionar uma imagem para fazer o upload.');
      }

      const file = event.target.files[0];
      
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        throw new Error('Por favor, selecione apenas arquivos de imagem.');
      }

      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('A imagem deve ter no máximo 5MB.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = fileName; // Usar apenas o nome do arquivo, sem pasta

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar perfil com a nova URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({
        title: 'Foto atualizada',
        description: 'Sua foto de perfil foi atualizada com sucesso.',
        className: 'bg-green-100 border-green-500',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: error.message || 'Não foi possível fazer o upload da imagem. Tente novamente.',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploading(true);
      
      if (!avatarUrl) return;

      // Extrair o caminho do arquivo da URL
      const urlParts = avatarUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = fileName; // Usar apenas o nome do arquivo

      // Remover do storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

      // Atualizar perfil removendo a URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(null);
      toast({
        title: 'Foto removida',
        description: 'Sua foto de perfil foi removida.',
      });
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: 'Não foi possível remover a foto. Tente novamente.',
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          specialty: data.specialty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
        className: 'bg-green-100 border-green-500',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível salvar as alterações. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Card>
        <CardContent className="p-10 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Informações do Perfil
        </CardTitle>
        <CardDescription>Atualize seus dados pessoais e profissionais.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Seção de Foto de Perfil */}
          <div className="flex flex-col items-center gap-4 pb-6 border-b">
            <div className="relative">
              <div className="w-32 h-32 bg-secondary rounded-full flex items-center justify-center overflow-hidden border-4 border-border">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center ${avatarUrl ? 'hidden' : ''}`}>
                  <User className="w-16 h-16 text-muted-foreground" />
                </div>
              </div>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-0 right-0 w-8 h-8 rounded-full"
                  onClick={removeAvatar}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={uploading}
                >
                  <span>
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {avatarUrl ? 'Alterar Foto' : 'Adicionar Foto'}
                      </>
                    )}
                  </span>
                </Button>
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadAvatar}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground text-center">
                Formatos: JPG, PNG, GIF. Máximo 5MB
              </p>
            </div>
          </div>

          {/* Formulário de Dados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input 
                id="full_name" 
                {...form.register('full_name')} 
                disabled={loading || uploading}
              />
              {form.formState.errors.full_name && (
                <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                {...form.register('email')} 
                disabled 
                className="bg-muted" 
              />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado aqui.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input 
                id="phone" 
                {...form.register('phone')} 
                placeholder="(00) 00000-0000"
                disabled={loading || uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade</Label>
              <Input 
                id="specialty" 
                {...form.register('specialty')} 
                placeholder="Ex: Fonoaudiologia Clínica"
                disabled={loading || uploading}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={loading || uploading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!loading && <Save className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;