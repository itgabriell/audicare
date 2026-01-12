import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { User, Upload } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    full_name: '',
    email: user?.email || '',
    avatar_url: null,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
          toast({ title: "Erro ao carregar perfil", description: error.message, variant: "destructive" });
        } else if (data) {
          setFormData(prev => ({ ...prev, full_name: data.full_name, avatar_url: data.avatar_url }));
        }
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, toast]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: formData.full_name })
      .eq('id', user.id);

    if (error) {
      toast({ title: "Erro!", description: "Não foi possível atualizar o perfil.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso!", description: "Seu perfil foi atualizado." });
    }
    setLoading(false);
  };

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você precisa selecionar uma imagem para fazer o upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `${fileName}`;

      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        upsert: true,
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }
      
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({ title: "Sucesso!", description: "Avatar atualizado." });
    } catch (error) {
      toast({ title: "Erro no Upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Meu Perfil - Audicare</title>
        <meta name="description" content="Edite suas informações de perfil." />
      </Helmet>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Atualize suas informações pessoais e foto.</p>

        <div className="bg-card rounded-xl shadow-sm border p-8 mt-6">
            <form onSubmit={handleUpdate} className="space-y-6">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
                            {formData.avatar_url ? (
                                <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-12 h-12 text-primary" />
                            )}
                        </div>
                        <Button asChild type="button" size="icon" className="absolute bottom-0 right-0 w-8 h-8">
                           <Label htmlFor="avatar-upload" className="cursor-pointer flex items-center justify-center">
                                <Upload className="w-4 h-4" />
                                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
                           </Label>
                        </Button>
                    </div>
                    <div className='flex-1'>
                        <h2 className='text-xl font-semibold text-foreground'>{formData.full_name || 'Usuário'}</h2>
                        <p className='text-muted-foreground'>{formData.email}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} disabled={loading} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} disabled />
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={loading || uploading}>
                        {loading || uploading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </form>
        </div>
      </div>
    </>
  );
};

export default Profile;