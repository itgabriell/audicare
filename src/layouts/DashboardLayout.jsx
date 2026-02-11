import React, { useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import ConfigValidationBanner from '@/components/Debug/ConfigValidationBanner';
import { CommandPalette } from '@/components/ui/command-palette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { AIAssistant } from '@/components/AIAssistant';
import InternalChatWidget from '@/components/intercom/InternalChatWidget';

const DashboardLayout = () => {
  console.log("[DashboardLayout] Rendering...");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
      {/* <ConfigValidationBanner /> */}

      {/* Mobile Sidebar Overlay */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} isCollapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex flex-col transition-all duration-300 ease-in-out border-r border-border/50",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}>
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
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
          <Suspense fallback={
            <div className="flex items-center justify-center h-full min-h-[50vh]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando conteúdo...</span>
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>

      </div>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* <InternalChatWidget /> */}
    </div>
  );
};
export default DashboardLayout;