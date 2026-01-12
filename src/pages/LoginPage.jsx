import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Lock, Mail } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("[LoginPage:handleSubmit] Form submitted.");
      console.log("[LoginPage:handleSubmit] Checking if signIn function exists:", typeof signIn);
      
      if (typeof signIn !== 'function') {
        throw new TypeError("A função de login (signIn) não está disponível. Verifique o AuthContext.");
      }

      console.log("[LoginPage:handleSubmit] About to call signIn.");
      const { error } = await signIn(email, password);
      console.log("[LoginPage:handleSubmit] signIn result:", { error });

      if (!error) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo(a) de volta ao Audicare.",
        });
        console.log("[LoginPage:handleSubmit] Login successful. About to navigate to '/'.");
        navigate('/');
      } else {
        // Error toast is already handled by signIn function in context
        console.error("[LoginPage:handleSubmit] Login failed:", error);
      }
    } catch (err) {
      console.error("[LoginPage:handleSubmit] Caught an exception:", err);
      toast({
        variant: "destructive",
        title: "Erro Inesperado",
        description: err.message || "Ocorreu um erro durante o login. Tente novamente.",
      });
    } finally {
      console.log("[LoginPage:handleSubmit] Re-enabling form.");
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - Audicare</title>
        <meta name="description" content="Acesse o sistema de gestão Audicare" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-no-repeat bg-cover bg-center opacity-20"
          style={{backgroundImage: "url('https://horizons-cdn.hostinger.com/1bbc4272-c963-40da-a72d-73cd033c2e2e/9899872ae90135d41d939ce5c9b17370.jpg')"}}
        ></div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md z-10"
        >
          <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border dark:border-border">
            <div className="text-center mb-8">
               <img src="https://horizons-cdn.hostinger.com/1bbc4272-c963-40da-a72d-73cd033c2e2e/3094f61e7d1e0cf6f6f83d903bbd089c.png" alt="Audicare Logo" className="h-10 mx-auto mb-4" />
              <p className="text-muted-foreground">Audicare Aparelhos Auditivos</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    disabled={loading}
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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
            
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Link to="/register" className="font-semibold text-primary hover:underline">
                  Cadastre-se
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default LoginPage;