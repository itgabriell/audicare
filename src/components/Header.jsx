import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
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
import { User, LogOut, Settings, Search } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const Header = ({ children, onCommandPaletteOpen }) => {
  const [title, ...rest] = React.Children.toArray(children);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      // Força redirecionamento para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo em caso de erro, tenta redirecionar
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
    <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {rest}

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
