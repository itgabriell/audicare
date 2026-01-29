import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Instagram, Facebook, MessageCircle, Calendar, User, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CHANNEL_ICONS = {
  instagram: Instagram,
  whatsapp: MessageCircle,
  facebook: Facebook,
};

const CHANNEL_COLORS = {
  instagram: 'text-pink-500',
  whatsapp: 'text-green-500',
  facebook: 'text-blue-500',
};

const SocialPostCard = ({ post, onEdit, onDelete, onUpdateStatus }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // channels pode vir como array ou como string JSON do banco
  let channels = [];
  if (Array.isArray(post.channels)) {
    channels = post.channels;
  } else if (typeof post.channels === 'string' && post.channels) {
    try {
      channels = JSON.parse(post.channels);
    } catch {
      // Se não for JSON válido, tenta como string simples
      channels = post.channels ? [post.channels] : [];
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      idea: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
      scripting: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      to_record: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      editing: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      ready: 'bg-green-500/10 text-green-600 border-green-500/20',
      scheduled: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
      published: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    };
    return colors[status] || colors.idea;
  };

  const getStatusLabel = (status) => {
    const labels = {
      idea: 'Ideia',
      scripting: 'Roteiro',
      to_record: 'Gravação',
      editing: 'Edição',
      ready: 'Pronto',
      scheduled: 'Agendado',
      published: 'Publicado',
    };
    return labels[status] || status;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-card rounded-lg p-4 shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-all group hover:border-primary/20 ${isDragging ? 'ring-2 ring-primary' : ''
        }`}
    >
      <div className="flex flex-col gap-3">
        {/* Header com Título e Menu */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-foreground text-sm flex-1 line-clamp-2">
            {post.title}
          </h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(post); }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Badge */}
        <Badge variant="outline" className={`text-xs w-fit ${getStatusColor(post.status)}`}>
          {getStatusLabel(post.status)}
        </Badge>

        {/* Canais */}
        {channels.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {channels.map((channel, idx) => {
              const Icon = CHANNEL_ICONS[channel] || MessageCircle;
              return (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <div className={`p-1.5 rounded bg-muted ${CHANNEL_COLORS[channel] || 'text-muted-foreground'}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="capitalize">{channel}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* Conteúdo Preview */}
        {post.content && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {post.content}
          </p>
        )}

        {/* Data Agendada */}
        {post.scheduled_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {format(new Date(post.scheduled_date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        )}

        {/* Responsável */}
        {post.assignee_id && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>Responsável atribuído</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(SocialPostCard);
