import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Archive, 
  Star, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Filter,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ConversationFilters = ({ 
  filters, 
  onFiltersChange
}) => {
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'Todas', icon: MessageSquare, count: null },
    { value: 'active', label: 'Ativas', icon: MessageSquare, count: null },
    { value: 'unread', label: 'Não lidas', icon: Bell, count: null },
    { value: 'archived', label: 'Arquivadas', icon: Archive, count: null },
    { value: 'resolved', label: 'Resolvidas', icon: CheckCircle2, count: null },
    { value: 'pending', label: 'Pendentes', icon: Clock, count: null },
    { value: 'closed', label: 'Fechadas', icon: XCircle, count: null }
  ];

  // Status ativo atual
  const activeStatus = statusOptions.find(opt => opt.value === filters.status) || statusOptions[0];
  const ActiveIcon = activeStatus.icon;

  // Contar filtros ativos adicionais
  const activeFiltersCount = [
    filters.onlyFavorites,
    filters.onlyUnread,
    filters.onlyArchived
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-card/50">
      {/* Botão principal com status atual */}
      <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant={filters.status !== 'all' || activeFiltersCount > 0 ? 'default' : 'outline'} 
            size="sm" 
            className="h-8 text-xs gap-2"
          >
            <Filter className="h-3.5 w-3.5" />
            <ActiveIcon className="h-3.5 w-3.5" />
            <span>{activeStatus.label}</span>
            {activeFiltersCount > 0 && (
              <span className="ml-1 h-4 w-4 rounded-full bg-primary-foreground text-primary text-[10px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-3 space-y-3">
            {/* Status Principal */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {statusOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = filters.status === option.value;
                  return (
                    <Button
                      key={option.value}
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        "h-8 text-xs justify-start gap-2",
                        isActive && "shadow-sm"
                      )}
                      onClick={() => {
                        if (option.value === 'unread') {
                          // Se selecionar "não lidas", ativar o filtro também
                          onFiltersChange({ ...filters, status: 'all', onlyUnread: true });
                        } else {
                          onFiltersChange({ ...filters, status: option.value });
                        }
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Filtros Adicionais */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Filtros Adicionais
              </Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="only-favorites"
                    checked={filters.onlyFavorites}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ ...filters, onlyFavorites: checked })
                    }
                  />
                  <Label
                    htmlFor="only-favorites"
                    className="text-xs font-normal cursor-pointer flex items-center gap-2 flex-1"
                  >
                    <Star className="h-3.5 w-3.5 text-yellow-500" />
                    Apenas favoritas
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="only-unread"
                    checked={filters.onlyUnread}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ ...filters, onlyUnread: checked })
                    }
                  />
                  <Label
                    htmlFor="only-unread"
                    className="text-xs font-normal cursor-pointer flex items-center gap-2 flex-1"
                  >
                    <Bell className="h-3.5 w-3.5 text-blue-500" />
                    Apenas não lidas
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="only-archived"
                    checked={filters.onlyArchived}
                    onCheckedChange={(checked) =>
                      onFiltersChange({ ...filters, onlyArchived: checked })
                    }
                  />
                  <Label
                    htmlFor="only-archived"
                    className="text-xs font-normal cursor-pointer flex items-center gap-2 flex-1"
                  >
                    <Archive className="h-3.5 w-3.5 text-gray-500" />
                    Apenas arquivadas
                  </Label>
                </div>
              </div>
            </div>

            {/* Botão Limpar */}
            {(filters.status !== 'all' || activeFiltersCount > 0) && (
              <>
                <Separator />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-8"
                  onClick={() => {
                    onFiltersChange({
                      status: 'all',
                      onlyFavorites: false,
                      onlyUnread: false,
                      onlyArchived: false
                    });
                    setFilterPopoverOpen(false);
                  }}
                >
                  Limpar filtros
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ConversationFilters;

