import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  Briefcase,
  Settings,
  User,
  Wrench,
  Bot,
  Bell,
  Share2,
  UploadCloud,
  BarChart3,
  Receipt,
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useTheme } from '@/contexts/ThemeContext';
import logoWhite from '@/assets/logo-white.svg';
import logoGreen from '@/assets/logo-green.svg';
import usePermissions from '@/hooks/usePermissions';

const mainNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/patients', icon: Users, label: 'Pacientes' },
  { href: '/appointments', icon: Calendar, label: 'Agendamentos' },
  { href: '/inbox', icon: MessageSquare, label: 'Inbox' },
  { href: '/crm', icon: BarChart3, label: 'CRM' },
  { href: '/tasks', icon: Briefcase, label: 'Tarefas' },
  { href: '/repairs', icon: Wrench, label: 'Reparos' },
  { href: '/invoices', icon: Receipt, label: 'Notas Fiscais' },
];

const secondaryNavItems = [
  { href: '/knowledge-base', icon: BookOpen, label: 'Base de Conhecimento' },
  { href: '/social-media', icon: Share2, label: 'Social Media' },
  { href: '/automations', icon: Bot, label: 'Automações' },
  { href: '/notifications', icon: Bell, label: 'Notificações' },
];

const adminNavItems = [
  { href: '/users', icon: User, label: 'Usuários' },
  { href: '/import', icon: UploadCloud, label: 'Importar Dados' },
  { href: '/settings', icon: Settings, label: 'Configurações' },
];

const NavItem = ({ item, isCollapsed }) => {
  const location = useLocation();
  const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={item.href}
          className={cn(
            "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300 relative z-10",
            "hover:bg-muted/50 hover:text-foreground hover:translate-x-1",
            isActive
              ? "bg-gradient-to-r from-primary/10 to-transparent dark:from-primary/20 text-primary dark:text-primary-foreground font-bold shadow-sm border-l-4 border-primary"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <item.icon className={cn(
            "h-5 w-5 transition-transform duration-300",
            isActive ? "scale-110" : "group-hover:scale-110"
          )} />
          {!isCollapsed && (
            <span className={cn(
              "transition-opacity duration-300",
              isActive ? "font-semibold tracking-wide" : "font-medium"
            )}>
              {item.label}
            </span>
          )}
        </NavLink>
      </TooltipTrigger>
      {isCollapsed && (
        <TooltipContent side="right" className="rounded-lg">
          <p className="font-medium">{item.label}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
};

const Sidebar = ({ isCollapsed, onToggle }) => {
  const { theme } = useTheme();
  const { canAccessRoute } = usePermissions();
  const navigate = useNavigate();

  return (
    <aside className={cn(
      "flex flex-col gap-y-3 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 p-5 transition-all duration-300 shadow-sm h-full relative",
      isCollapsed ? "items-center" : ""
    )}>
      {/* Collapse Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-md z-50 hidden md:flex"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {/* Logo Section */}
      <div className={cn(
        "flex items-center mb-6 pt-2 h-10",
        isCollapsed ? "justify-center" : "justify-center"
      )}>
        <img
          src={theme === 'dark' ? logoWhite : logoGreen}
          alt="Audicare"
          className={cn(
            "h-9 w-auto transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95",
            isCollapsed ? "opacity-0 scale-0 w-0" : "opacity-100"
          )}
          onClick={() => navigate('/dashboard')}
        />
        {isCollapsed && (
          <div
            className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            <span className="text-white font-bold text-lg">A</span>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-1.5 overflow-x-hidden">
        {mainNavItems
          .filter(item => canAccessRoute(item.href))
          .map(item => <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />)}
      </nav>

      {/* Secondary Navigation */}
      {secondaryNavItems.some(item => canAccessRoute(item.href)) && (
        <div className="overflow-x-hidden flex flex-col gap-1.5">
          {!isCollapsed && (
            <div className="px-3 py-2 mt-2">
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.1em]">
                Ferramentas
              </p>
            </div>
          )}
          <nav className="flex flex-col gap-1.5">
            {secondaryNavItems
              .filter(item => canAccessRoute(item.href))
              .map(item => <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />)}
          </nav>
        </div>
      )}

      {/* Admin Navigation */}
      {adminNavItems.some(item => canAccessRoute(item.href)) && (
        <div className="mt-auto pt-4 border-t border-border/50 overflow-x-hidden">
          {!isCollapsed && (
            <div className="px-3 py-2 mb-1">
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.1em]">
                Admin
              </p>
            </div>
          )}
          <nav className="flex flex-col gap-1.5">
            {adminNavItems
              .filter(item => canAccessRoute(item.href))
              .map(item => <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />)}
          </nav>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;