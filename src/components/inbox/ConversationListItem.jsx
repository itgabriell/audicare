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
                'flex items-start gap-3 p-3 mx-2 my-1 rounded-lg cursor-pointer transition-all border border-transparent',
                isSelected 
                    ? 'bg-primary/5 border-primary/10 shadow-sm' 
                    : 'hover:bg-muted/50 border-transparent'
            )}
        >
            <div className="relative mt-1">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                    <AvatarImage src={conversation.contact?.avatar_url} alt={contactName} className="object-cover" />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                        {contactName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow border border-border">
                    <ChannelIconSmall channel={channel} />
                </div>
            </div>

            <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex justify-between items-center mb-0.5">
                    <h3 className={cn("font-medium truncate text-sm", isSelected ? "text-primary" : "text-foreground")}>
                        {contactName}
                    </h3>
                    <p className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                        {formatTimestamp(conversation.last_message_at)}
                    </p>
                </div>
                
                <div className="flex justify-between items-start">
                    <p className={cn(
                        "text-xs truncate max-w-[180px] line-clamp-1",
                        unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                        {conversation.last_message_preview || 'Nova conversa'}
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