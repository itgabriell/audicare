import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';

const passwordSchema = z.object({
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

const SecuritySettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });

      if (error) throw error;

      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi atualizada com sucesso. Use a nova senha no próximo login.',
        className: 'bg-green-100 border-green-500',
      });
      form.reset();
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar senha',
        description: error.message || 'Ocorreu um erro inesperado. Verifique se a senha atende aos requisitos mínimos.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>Atualize sua senha de acesso ao sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input 
                id="password" 
                type="password" 
                {...form.register('password')} 
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                {...form.register('confirmPassword')} 
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar Senha
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
           <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Autenticação de Dois Fatores (2FA)
          </CardTitle>
          <CardDescription>Adicione uma camada extra de segurança à sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="bg-muted p-4 rounded-lg border border-dashed text-center">
              <p className="text-sm text-muted-foreground">
                  A configuração de 2FA está sendo atualizada para o novo padrão de segurança e estará disponível em breve.
              </p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;