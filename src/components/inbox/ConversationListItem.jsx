import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Instagram, Facebook, Mail } from 'lucide-react';

const ChannelIconSmall = ({ channel }) => {
    switch (channel) {
        case 'whatsapp': return <MessageCircle className="h-3 w-3 text-green-600" />;
        case 'instagram': return <Instagram className="h-3 w-3 text-pink-600" />;
        case 'facebook': return <Facebook className="h-3 w-3 text-blue-600" />;
        case 'email': return <Mail className="h-3 w-3 text-orange-600" />;
        default: return null;
    }
};

const ConversationListItem = ({ conversation, isSelected, onSelect }) => {
    const contactName = conversation.contact?.name || conversation.contact?.phone || 'Desconhecido';
    const unreadCount = conversation.unread_count || 0;
    const channel = conversation.channel || conversation.contact?.channel || 'whatsapp';
    const leadStatus = conversation.lead_status || 'novo';

    // Função para obter a cor do status do lead
    const getLeadStatusColor = (status) => {
        switch (status) {
            case 'novo': return 'border-blue-500';
            case 'atendendo': return 'border-yellow-500';
            case 'agendado': return 'border-green-500';
            case 'finalizado': return 'border-gray-400';
            default: return 'border-gray-300';
        }
    };

    // Função para obter as iniciais do nome
    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2);
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        try {
            return formatDistanceToNowStrict(new Date(timestamp), { locale: ptBR, addSuffix: false })
              .replace(/\s*segundo(s)?/, 's')
              .replace(/\s*minuto(s)?/, 'm')
              .replace(/\s*hora(s)?/, 'h')
              .replace(/\s*dia(s)?/, 'd')
              .replace(/\s*mês|meses/, 'M')
              .replace(/\s*ano(s)?/, 'a');
        } catch (e) {
            return '';
        }
    }

    return (
        <div
            onClick={onSelect}
            className={cn(
                'flex items-start gap-3 p-3 mx-2 my-1 rounded-lg cursor-pointer transition-all border-l-4',
                isSelected
                    ? 'bg-primary/5 border-primary/10 shadow-sm'
                    : 'hover:bg-muted/50 border-transparent',
                getLeadStatusColor(leadStatus)
            )}
        >
            <div className="relative mt-1">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                    <AvatarImage
                        src={conversation.contact?.profile_pic_url || conversation.contact?.avatar_url}
                        alt={contactName}
                        className="object-cover"
                    />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                        {getInitials(contactName)}
                    </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow border border-border">
                    <ChannelIconSmall channel={channel} />
                </div>
            </div>

            <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex justify-between items-center mb-0.5">
                    <h3 className={cn(
                        "truncate text-sm",
                        isSelected
                            ? "text-primary font-medium"
                            : unreadCount > 0
                                ? "text-foreground font-semibold" // Negrito apenas se não lida
                                : "text-foreground font-normal" // Normal se já foi vista
                    )}>
                        {contactName}
                    </h3>
                    <p className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                        {formatTimestamp(conversation.last_message_at)}
                    </p>
                </div>
                
                <div className="flex justify-between items-start">
                    <p className="text-xs text-gray-500 truncate max-w-[180px] line-clamp-1">
                        {conversation.last_message_preview && conversation.last_message_preview.trim()
                            ? (conversation.last_message_preview.length > 30
                                ? `${conversation.last_message_preview.substring(0, 30)}...`
                                : conversation.last_message_preview)
                            : 'Iniciar conversa'}
                    </p>

                    {unreadCount > 0 && (
                        <Badge className="h-4 min-w-[1rem] px-1 flex items-center justify-center text-[9px] rounded-full bg-primary text-primary-foreground shadow-none ml-2 mt-0.5">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(ConversationListItem, (prevProps, nextProps) => {
  // Otimização: só re-renderiza se realmente mudou
  return (
    prevProps.conversation?.id === nextProps.conversation?.id &&
    prevProps.conversation?.unread_count === nextProps.conversation?.unread_count &&
    prevProps.conversation?.last_message_at === nextProps.conversation?.last_message_at &&
    prevProps.conversation?.last_message_preview === nextProps.conversation?.last_message_preview &&
    prevProps.isSelected === nextProps.isSelected
  );
});
