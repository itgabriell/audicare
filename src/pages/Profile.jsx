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

      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Meu Perfil</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie suas informações pessoais e de exibição.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <form onSubmit={handleUpdate} className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 border-b border-slate-100 dark:border-slate-800 pb-8">
              <div className="relative group">
                <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center overflow-hidden ring-4 ring-white dark:ring-slate-900 shadow-xl transition-all group-hover:shadow-2xl">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <User className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                  )}

                  {/* Overlay Loading State */}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>

                <label
                  htmlFor="avatar-upload"
                  className={`absolute bottom-0 right-0 p-2.5 rounded-2xl cursor-pointer shadow-lg transition-all duration-200
                                ${uploading ? 'opacity-0 scale-90' : 'opacity-100 scale-100 hover:scale-105 active:scale-95'}
                                bg-primary text-white hover:bg-primary/90 ring-4 ring-white dark:ring-slate-900`}
                >
                  <Upload className="w-5 h-5" />
                  <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
                </label>
              </div>

              <div className='flex-1 space-y-2 text-center sm:text-left pt-2'>
                <h3 className='text-xl font-bold text-slate-900 dark:text-slate-100'>{formData.full_name || 'Usuário'}</h3>
                <p className='text-slate-500 dark:text-slate-400 font-medium'>{formData.email}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-2 leading-relaxed">
                  Sua foto de perfil será visível para outros administradores e na sua identificação no sistema.
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  disabled={loading}
                  className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="h-12 rounded-xl bg-slate-100 dark:bg-slate-900/50 text-slate-500 border-transparent cursor-not-allowed"
                />
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">O email não pode ser alterado</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={loading || uploading}
                className="h-11 px-8 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-medium"
              >
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