import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfigValidationBanner from '@/components/Debug/ConfigValidationBanner';
import { CommandPalette } from '@/components/ui/command-palette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { AIAssistant } from '@/components/AIAssistant';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isOpen: commandPaletteOpen, setIsOpen: setCommandPaletteOpen, openPalette } = useCommandPalette();

  // Close sidebar on route change (mobile)
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isInbox = location.pathname.startsWith('/inbox');

  // --- NOVA LÓGICA DE TÍTULOS ---
  const getPageTitle = (pathname) => {
    if (pathname.startsWith('/dashboard')) return 'Visão Geral';
    if (pathname.startsWith('/appointments')) return 'Agenda';
    if (pathname.startsWith('/patients')) return 'Pacientes';
    if (pathname.startsWith('/crm')) return 'CRM';
    if (pathname.startsWith('/tasks')) return 'Tarefas';
    if (pathname.startsWith('/repairs')) return 'Reparos';
    if (pathname.startsWith('/social-media')) return 'Redes Sociais';
    if (pathname.startsWith('/email-campaigns')) return 'Campanhas';
    if (pathname.startsWith('/automations')) return 'Automações';
    if (pathname.startsWith('/invoices')) return 'Financeiro';
    if (pathname.startsWith('/users')) return 'Usuários';
    if (pathname.startsWith('/settings')) return 'Configurações';
    if (pathname.startsWith('/profile')) return 'Meu Perfil';
    if (pathname.startsWith('/inbox')) return 'Inbox'; // Título correto para Inbox
    
    return 'Audicare'; // Padrão
  };

  const currentTitle = getPageTitle(location.pathname);
  // -----------------------------

  return (
    <div className="flex min-h-screen bg-background">
      {/* Validation Banner is placed here to be visible across all dashboard pages */}
      <ConfigValidationBanner />
      
      {/* Mobile Sidebar Overlay */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-72 md:flex-col fixed inset-y-0 z-30">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 md:pl-72 flex flex-col relative min-w-0 overflow-hidden">
        
        {/* Renderiza o Header exceto no Inbox (que tem layout próprio) ou se quiser forçar o título */}
        {!isInbox && (
          <div className="relative z-10">
            <Header
              onMenuClick={() => setSidebarOpen(true)}
              showMenuButton={true}
              onCommandPaletteOpen={openPalette}
            >
              {/* Passando o título dinâmico aqui */}
              {currentTitle}
            </Header>
          </div>
        )}

        <main className={`flex-1 overflow-y-auto ${isInbox ? 'p-0 md:p-0 pb-0' : 'p-4 md:p-6 pb-20 md:pb-6'} relative`}>
          <Outlet />
        </main>

      </div>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
};

export default DashboardLayout;