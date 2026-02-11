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
  const { signIn, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- AUTO-REDIRECT IF ALREADY LOGGED IN ---
  // This prevents the "stuck at login" loop on page refreshes
  React.useEffect(() => {
    if (session && !authLoading) {
      console.log("[LoginPage] Active session detected. Redirecting to home...");
      navigate('/');
    }
  }, [session, authLoading, navigate]);

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
        {/* Abstract Background Gradient Overlay */}
        <div className="absolute inset-0 bg-primary/5 mix-blend-multiply z-0" />
        <div
          className="absolute inset-0 bg-no-repeat bg-cover bg-center opacity-10 blur-sm pointer-events-none"
          style={{ backgroundImage: "url('https://horizons-cdn.hostinger.com/1bbc4272-c963-40da-a72d-73cd033c2e2e/9899872ae90135d41d939ce5c9b17370.jpg')" }}
        ></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md z-10"
        >
          <div className="bg-white/70 dark:bg-card/60 backdrop-blur-xl rounded-3xl shadow-2xl shadow-primary/5 p-10 border border-white/20 dark:border-white/5">
            <div className="text-center mb-10">
              <img src="https://horizons-cdn.hostinger.com/1bbc4272-c963-40da-a72d-73cd033c2e2e/3094f61e7d1e0cf6f6f83d903bbd089c.png" alt="Audicare Logo" className="h-12 mx-auto mb-6 drop-shadow-sm" />
              <p className="text-muted-foreground font-medium tracking-wide">Bem-vindo ao Audicare</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground/80">E-mail</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-white/50 dark:bg-black/20 border-transparent focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all rounded-xl"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground/80">Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-white/50 dark:bg-black/20 border-transparent focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all rounded-xl"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5" disabled={loading}>
                {loading ? 'Entrando...' : 'Acessar Sistema'}
              </Button>

              {/* Reset Emergency Button */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={async () => {
                    console.log("[Emergency Reset] Clearing everything...");
                    localStorage.clear();
                    sessionStorage.clear();

                    // Unregister all Service Workers
                    if ('serviceWorker' in navigator) {
                      const registrations = await navigator.serviceWorker.getRegistrations();
                      for (let registration of registrations) {
                        await registration.unregister();
                        console.log("[Emergency Reset] Unregistered SW:", registration.scope);
                      }
                    }

                    // Clear all Cache Storage
                    if ('caches' in window) {
                      const cacheNames = await caches.keys();
                      for (let name of cacheNames) {
                        await caches.delete(name);
                        console.log("[Emergency Reset] Deleted Cache:", name);
                      }
                    }

                    toast({
                      title: "Reset concluído",
                      description: "Limpamos o sistema. O navegador vai reiniciar em instantes.",
                    });

                    setTimeout(() => {
                      window.location.href = '/login?v=' + Date.now();
                    }, 1000);
                  }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Problemas para carregar? Clique aqui para um Reset Completo.
                </button>
              </div>
            </form>

            <div className="text-center mt-8">
              <p className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Não tem uma conta?{' '}
                <Link to="/register" className="font-bold text-primary hover:text-primary/80 hover:underline decoration-2 underline-offset-4">
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