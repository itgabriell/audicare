import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import NotificationBell from '@/components/layout/NotificationBell';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Settings, Search, Menu } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import SocialLinks from '@/components/SocialLinks';

// --- NOVO IMPORT ---
import ClaraHeaderSwitch from '@/components/crm/ClaraHeaderSwitch';

const Header = ({ children, onMenuClick, showMenuButton, onCommandPaletteOpen }) => {
  // Convertendo children em array para extrair título e resto
  const childrenArray = React.Children.toArray(children);
  const title = childrenArray.length > 0 ? childrenArray[0] : null;
  const rest = childrenArray.length > 1 ? childrenArray.slice(1) : [];

  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      window.location.href = '/login';
    }
  };

  const getUserInitials = () => {
    if (user?.profile?.full_name) {
      return user.profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const getUserName = () => {
    return user?.profile?.full_name || user?.email || 'Usuário';
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-3 py-3 md:px-6 md:py-4 border-b border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
      {/* Lado esquerdo - Menu + Título */}
      <div className="flex items-center gap-2 md:gap-3">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="md:hidden h-11 w-11 p-0 hover:bg-muted/80 transition-all duration-200 hover:scale-105 active:scale-95 text-foreground"
            title="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        )}
        <div className="text-lg font-semibold text-foreground">{title}</div>
      </div>

      {/* Centro - Redes Sociais (Esconde em telas muito pequenas se necessário) */}
      <div className="flex-1 flex justify-center hidden sm:flex">
        <SocialLinks />
      </div>

      {/* Lado direito - Controles */}
      <div className="flex items-center gap-3">
        {rest}

        {/* --- AQUI ESTÁ A CLARA --- */}
        {/* Só mostra se o usuário estiver logado */}
        {user && <ClaraHeaderSwitch />}

        {/* Search Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onCommandPaletteOpen}
          className="h-9 w-9 p-0 hover:bg-muted/80 transition-all duration-200 hover:scale-105 active:scale-95"
          title="Buscar (Ctrl+K)"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        {user && <NotificationBell />}

        <ThemeToggle />

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-xl hover:bg-muted/80 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Avatar className="h-10 w-10 ring-2 ring-border/50 ring-offset-2 ring-offset-background">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 rounded-xl shadow-lg border-border/50"
              align="end"
              forceMount
            >
              <DropdownMenuLabel className="font-normal px-3 py-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">{getUserName()}</p>
                  {user?.email && (
                    <p className="text-xs leading-none text-muted-foreground mt-0.5">
                      {user.email}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => navigate('/settings')}
                className="rounded-lg mx-1 cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive rounded-lg mx-1 cursor-pointer focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default Header;