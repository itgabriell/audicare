import React, { Suspense } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { User, Building, Clock, Shield, Bell, Radio, Activity, Network, FileText, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet';
import { Loader2 } from 'lucide-react';

const SettingsLayout = () => {
  const navItems = [
    { to: 'profile', label: 'Meu Perfil', icon: User },
    { to: 'clinic', label: 'Clínica', icon: Building },
    { to: 'hours', label: 'Horários', icon: Clock },
    { to: 'security', label: 'Segurança', icon: Shield },
    { to: 'notifications', label: 'Notificações', icon: Bell },
    { to: 'channels', label: 'Canais & Integrações', icon: Radio },
    { to: 'webhooks', label: 'Webhooks', icon: Network },
    { to: 'document-templates', label: 'Templates de Documentos', icon: FileText },
    { to: 'document-messages', label: 'Mensagens de Documentos', icon: MessageSquare },
    { to: 'diagnostics', label: 'Diagnóstico', icon: Activity },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-5xl">
      <Helmet>
        <title>Configurações | Audicare</title>
      </Helmet>
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e configurações do sistema.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-1/4">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 overflow-x-auto pb-2 lg:pb-0">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary hover:bg-muted",
                    isActive ? "bg-secondary text-primary shadow-sm" : "text-muted-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        
        <main className="flex-1 bg-card rounded-xl border shadow-sm p-6 min-h-[500px]">
          <Suspense 
            fallback={
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
           <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default SettingsLayout;