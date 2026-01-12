import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  Briefcase,
  Settings,
  LifeBuoy,
  User,
  FileText,
  Wrench,
  Bot,
  Bell,
  Share2,
  UploadCloud,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
];

const secondaryNavItems = [
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
            "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 relative z-10",
            "hover:scale-[1.02] active:scale-[0.98]",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          <item.icon className={cn(
            "h-5 w-5 transition-transform duration-200",
            isActive ? "scale-110" : "group-hover:scale-110"
          )} />
          {!isCollapsed && (
            <span className={cn(
              "transition-opacity duration-200",
              isActive ? "font-semibold" : "font-medium"
            )}>
              {item.label}
            </span>
          )}
          {isActive && !isCollapsed && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground/30 rounded-r-full z-0" />
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

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { theme } = useTheme();
  const { canAccessRoute } = usePermissions();

  return (
    <aside className={cn(
      "flex flex-col gap-y-3 border-r border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 p-5 transition-all duration-300 shadow-sm h-full overflow-y-auto",
      isCollapsed ? "w-20" : "w-72"
    )}>
      {/* Logo Section */}
      <div className="flex items-center justify-center mb-6 pt-2">
        {!isCollapsed && (
          <div className="flex items-center justify-center w-full">
            <img 
              src={theme === 'dark' ? logoWhite : logoGreen}
              alt="Audicare"
              className="h-9 w-auto transition-opacity duration-300"
            />
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-1.5">
        {mainNavItems
          .filter(item => canAccessRoute(item.href))
          .map(item => <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />)}
      </nav>

      {/* Secondary Navigation - Canais */}
      {secondaryNavItems.some(item => canAccessRoute(item.href)) && (
        <>
          {!isCollapsed && (
            <div className="px-3 py-2 mt-2">
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.1em]">
                Canais
              </p>
            </div>
          )}
          <nav className="flex flex-col gap-1.5">
            {secondaryNavItems
              .filter(item => canAccessRoute(item.href))
              .map(item => <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />)}
          </nav>
        </>
      )}

      {/* Admin Navigation */}
      {adminNavItems.some(item => canAccessRoute(item.href)) && (
        <div className="mt-auto pt-4 border-t border-border/50">
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