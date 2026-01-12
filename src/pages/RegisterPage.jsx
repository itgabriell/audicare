import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Lock, Mail, User } from 'lucide-react';

const RegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(email, password, {
      data: {
        full_name: fullName,
        role: 'reception' // Default role for new sign-ups
      }
    });

    if (!error) {
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Verifique seu e-mail para confirmar sua conta.",
      });
      navigate('/login');
    }
    
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Cadastro - Audicare</title>
        <meta name="description" content="Crie sua conta no sistema Audicare" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-no-repeat bg-cover bg-center opacity-20"
          style={{backgroundImage: "url('https://horizons-cdn.hostinger.com/1bbc4272-c963-40da-a72d-73cd033c2e2e/9899872ae90135d41d939ce5c9b17370.jpg')"}}
        ></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md z-10"
        >
          <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border dark:border-border">
            <div className="text-center mb-8">
              <img src="https://horizons-cdn.hostinger.com/1bbc4272-c963-40da-a72d-73cd033c2e2e/3094f61e7d1e0cf6f6f83d903bbd089c.png" alt="Audicare Logo" className="h-10 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground">Criar Nova Conta</h1>
              <p className="text-muted-foreground">Junte-se à plataforma Audicare</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full !mt-6" disabled={loading}>
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>
            
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Faça login
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default RegisterPage;