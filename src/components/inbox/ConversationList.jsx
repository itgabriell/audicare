import React, { useState, useMemo, memo, useCallback } from 'react';
import ConversationListItem from './ConversationListItem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Inbox as InboxIcon, MessageCircle, Instagram, Facebook, Mail, Filter } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import ConversationFilters from './ConversationFilters';

const ConversationList = ({ conversations, activeId, onSelect, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeChannel, setActiveChannel] = useState('all');
    const [filters, setFilters] = useState({
        status: 'all',
        onlyFavorites: false,
        onlyUnread: false,
        onlyArchived: false
    });

    const filteredConversations = useMemo(() => {
        const safeList = conversations || [];
        
        return safeList
            .filter(convo => {
                // Filtro de status
                if (filters.status !== 'all') {
                    const convoStatus = convo.status || 'active';
                    if (filters.status === 'archived' && convoStatus !== 'archived') return false;
                    if (filters.status === 'resolved' && convoStatus !== 'resolved') return false;
                    if (filters.status === 'pending' && convoStatus !== 'pending') return false;
                    if (filters.status === 'closed' && convoStatus !== 'closed') return false;
                    if (filters.status === 'active' && convoStatus !== 'active') return false;
                }
                
                // Filtro de favoritas
                if (filters.onlyFavorites && !convo.is_favorite) return false;
                
                // Filtro de não lidas
                if (filters.onlyUnread && (convo.unread_count || 0) === 0) return false;
                
                // Filtro de arquivadas
                if (filters.onlyArchived && convo.status !== 'archived') return false;
                
                return true;
            })
            .filter(convo => {
                if (activeChannel !== 'all') {
                    const channel = convo.channel || convo.contact?.channel || 'whatsapp'; 
                    return channel === activeChannel;
                }
                return true;
            })
            .filter(convo => {
                if (!searchTerm) return true;
                const lowercasedTerm = searchTerm.toLowerCase();
                return (
                    (convo.contact?.name && convo.contact.name.toLowerCase().includes(lowercasedTerm)) ||
                    (convo.contact?.phone && convo.contact.phone.includes(lowercasedTerm))
                );
            });
    }, [conversations, searchTerm, activeChannel, filters]);

    // Botões de Canal Minimalistas
    const ChannelFilterBtn = ({ channel, icon: Icon, label, colorClass }) => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={activeChannel === channel ? 'secondary' : 'ghost'}
                        size="icon"
                        className={cn(
                            "rounded-full h-8 w-8 transition-all",
                            activeChannel === channel ? "bg-secondary shadow-sm" : "opacity-60 hover:opacity-100",
                            activeChannel === channel ? colorClass : ""
                        )}
                        onClick={() => setActiveChannel(channel)}
                    >
                        <Icon className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    return (
        <div className="flex flex-col h-full bg-card">
            <div className="p-4 border-b space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Inbox</h2>
                </div>

                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar conversa..." 
                        className="pl-9 h-9 bg-muted/30 border-none focus-visible:ring-1" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filtros Avançados */}
                <ConversationFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                />

                {/* Barra de Filtros de Canal (Ícones) */}
                <div className="flex items-center justify-start gap-2 pt-1">
                    <ChannelFilterBtn channel="all" icon={Filter} label="Todos os Canais" colorClass="text-foreground" />
                    <div className="h-4 w-[1px] bg-border mx-1" /> {/* Separador */}
                    <ChannelFilterBtn channel="whatsapp" icon={MessageCircle} label="WhatsApp" colorClass="text-green-600" />
                    <ChannelFilterBtn channel="instagram" icon={Instagram} label="Instagram" colorClass="text-pink-600" />
                    <ChannelFilterBtn channel="facebook" icon={Facebook} label="Facebook" colorClass="text-blue-600" />
                    <ChannelFilterBtn channel="email" icon={Mail} label="Email" colorClass="text-orange-600" />
                </div>
            </div>

            <ScrollArea className="flex-1">
                {loading && conversations.length === 0 ? (
                    <div className="flex justify-center items-center h-full p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : filteredConversations.length > 0 ? (
                    <div className="flex flex-col">
                        {filteredConversations.map((convo) => (
                            <ConversationListItem
                                key={convo.id}
                                conversation={convo}
                                isSelected={convo.id === activeId}
                                onSelect={() => onSelect(convo)} // Agora usa a prop correta 'onSelect'
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground opacity-50">
                        <InboxIcon className="h-10 w-10 mb-2" />
                        <p className="text-sm">Nenhuma conversa encontrada.</p>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
};

export default memo(ConversationList);