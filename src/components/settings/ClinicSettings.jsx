import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Save, Building2 } from 'lucide-react';

const clinicSchema = z.object({
  name: z.string().min(2, 'Nome da clínica é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  description: z.string().optional(),
});

const ClinicSettings = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const form = useForm({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      description: '',
    },
  });

  useEffect(() => {
    const fetchClinic = async () => {
      if (!profile?.clinic_id) {
        setFetching(false);
        return;
      }

      try {
        setFetching(true);
        const { data, error } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', profile.clinic_id)
          .single();

        if (error) {
          // Se não encontrar a clínica, não é necessariamente um erro crítico
          if (error.code === 'PGRST116') {
            console.warn('Clínica não encontrada para o usuário');
          } else {
            throw error;
          }
        }

        if (data) {
          form.reset({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zip_code: data.zip_code || '',
            description: data.description || '',
          });
        }
      } catch (error) {
        console.error('Error fetching clinic:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar',
          description: error.message || 'Não foi possível carregar os dados da clínica.',
        });
      } finally {
        setFetching(false);
      }
    };

    if (profile) {
    fetchClinic();
    } else {
      setFetching(false);
    }
  }, [profile, form, toast]);

  const onSubmit = async (data) => {
    if (!profile?.clinic_id) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Você não possui uma clínica associada. Entre em contato com o suporte.',
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.clinic_id);

      if (error) throw error;

      toast({
        title: 'Clínica atualizada',
        description: 'As informações da clínica foram salvas com sucesso.',
        className: 'bg-green-100 border-green-500',
      });
    } catch (error) {
      console.error('Error updating clinic:', error);
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
        <CardContent className="p-10 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!profile?.clinic_id) {
    return (
      <Card>
        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Você não possui uma clínica associada. Entre em contato com o suporte.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Dados da Clínica
        </CardTitle>
        <CardDescription>Informações exibidas em documentos e comunicações.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nome da Clínica *</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Comercial</Label>
              <Input id="email" type="email" {...form.register('email')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone Comercial</Label>
              <Input id="phone" {...form.register('phone')} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" {...form.register('address')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" {...form.register('city')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado (UF)</Label>
              <Input id="state" {...form.register('state')} maxLength={2} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP</Label>
              <Input id="zip_code" {...form.register('zip_code')} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descrição / Sobre</Label>
              <Textarea 
                id="description" 
                {...form.register('description')} 
                className="min-h-[100px]"
                placeholder="Breve descrição da clínica..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!loading && <Save className="mr-2 h-4 w-4" />}
              Salvar Dados da Clínica
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ClinicSettings;