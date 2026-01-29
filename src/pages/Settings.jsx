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
    <div className="container mx-auto py-6 space-y-8 max-w-6xl">
      <Helmet>
        <title>Configurações | Audicare</title>
      </Helmet>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Configurações</h1>
        <p className="text-muted-foreground text-lg">
          Gerencie suas preferências e configurações do sistema.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-1/4">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-2 overflow-x-auto pb-2 lg:pb-0">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  )
                }
              >
                <item.icon className={cn("h-5 w-5", ({ isActive }) => isActive ? "text-primary" : "text-slate-400")} />
                <span className="whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm p-6 lg:p-8 min-h-[600px]">
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