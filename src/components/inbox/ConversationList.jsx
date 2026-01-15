import React, { useState, useMemo, memo, useCallback } from 'react';
import ConversationListItem from './ConversationListItem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { Loader2, Search, Inbox as InboxIcon, MessageCircle, Instagram, Facebook, Mail, Filter } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import ConversationFilters from './ConversationFilters';
import { isToday, isYesterday, differenceInDays, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ConversationList = ({ conversations, activeId, onSelect, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeChannel, setActiveChannel] = useState('all');
    const [filters, setFilters] = useState({
        status: 'all',
        onlyFavorites: false,
        onlyUnread: false,
        onlyArchived: false,
        dateRange: 'all', // all, today, week, month, older
        hasAttachments: false,
        leadStatus: 'all'
    });

    // Agrupamento de conversas por data
    const CONVERSATION_GROUPS = {
        TODAY: 'Hoje',
        YESTERDAY: 'Ontem',
        THIS_WEEK: 'Esta Semana',
        THIS_MONTH: 'Este Mês',
        OLDER: 'Mais Antigo'
    };

    const groupConversationsByDate = useCallback((conversations) => {
        const groups = {};
        const now = new Date();

        conversations.forEach(convo => {
            const date = convo.last_message_at ? new Date(convo.last_message_at) : new Date(convo.updated_at || convo.created_at);
            let group;

            if (isToday(date)) {
                group = CONVERSATION_GROUPS.TODAY;
            } else if (isYesterday(date)) {
                group = CONVERSATION_GROUPS.YESTERDAY;
            } else if (isWithinInterval(date, { start: startOfWeek(now), end: endOfWeek(now) })) {
                group = CONVERSATION_GROUPS.THIS_WEEK;
            } else if (isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) })) {
                group = CONVERSATION_GROUPS.THIS_MONTH;
            } else {
                group = CONVERSATION_GROUPS.OLDER;
            }

            if (!groups[group]) groups[group] = [];
            groups[group].push(convo);
        });

        return groups;
    }, []);

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
                // Filtros avançados de busca
                if (filters.dateRange !== 'all') {
                    const date = convo.last_message_at ? new Date(convo.last_message_at) : new Date(convo.updated_at || convo.created_at);
                    const now = new Date();

                    switch (filters.dateRange) {
                        case 'today':
                            if (!isToday(date)) return false;
                            break;
                        case 'week':
                            if (!isWithinInterval(date, { start: startOfWeek(now), end: endOfWeek(now) })) return false;
                            break;
                        case 'month':
                            if (!isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
                            break;
                        case 'older':
                            if (isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
                            break;
                    }
                }

                // Filtro por status do lead
                if (filters.leadStatus !== 'all') {
                    if (convo.lead_status !== filters.leadStatus) return false;
                }

                // Filtro por anexos (simplificado - verificar se tem media_url)
                if (filters.hasAttachments) {
                    // TODO: Implementar verificação real de anexos
                    // Por enquanto, verificar se tem media_url em mensagens recentes
                    if (!convo.last_message_preview?.includes('[Arquivo]') &&
                        !convo.last_message_preview?.includes('[Imagem]')) return false;
                }

                // Busca por texto (inteligente)
                if (!searchTerm) return true;
                const lowercasedTerm = searchTerm.toLowerCase().trim();

                // Busca em múltiplos campos
                const searchableFields = [
                    convo.contact?.name,
                    convo.contact?.phone,
                    convo.contact?.email,
                    convo.last_message_preview,
                    convo.lead_status,
                    convo.channel
                ].filter(Boolean);

                return searchableFields.some(field =>
                    String(field).toLowerCase().includes(lowercasedTerm)
                );
            });
    }, [conversations, searchTerm, activeChannel, filters]);

    // Agrupar conversas filtradas por data
    const groupedConversations = useMemo(() => {
        return groupConversationsByDate(filteredConversations);
    }, [filteredConversations, groupConversationsByDate]);

    // Criar lista plana com headers de grupo
    const conversationsWithHeaders = useMemo(() => {
        const result = [];
        const groupOrder = [
            CONVERSATION_GROUPS.TODAY,
            CONVERSATION_GROUPS.YESTERDAY,
            CONVERSATION_GROUPS.THIS_WEEK,
            CONVERSATION_GROUPS.THIS_MONTH,
            CONVERSATION_GROUPS.OLDER
        ];

        groupOrder.forEach(groupName => {
            const groupConversations = groupedConversations[groupName];
            if (groupConversations && groupConversations.length > 0) {
                // Adicionar header do grupo
                result.push({
                    id: `header_${groupName}`,
                    type: 'header',
                    title: groupName,
                    count: groupConversations.length
                });

                // Adicionar conversas do grupo
                result.push(...groupConversations);
            }
        });

        return result;
    }, [groupedConversations]);

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

            {loading && conversations.length === 0 ? (
                <div className="flex justify-center items-center h-full p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : conversationsWithHeaders.length > 0 ? (
                <VirtualizedList
                    items={conversationsWithHeaders}
                    itemHeight={(item) => item.type === 'header' ? 40 : 72} // Headers menores
                    containerHeight="100%"
                    className="flex-1"
                    renderItem={(item, index) => {
                        if (item.type === 'header') {
                            // Renderizar header do grupo
                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between px-4 py-2 bg-muted/30 border-y border-border/50 sticky top-0 z-10"
                                >
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        {item.title}
                                    </h3>
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        {item.count}
                                    </span>
                                </div>
                            );
                        } else {
                            // Renderizar conversa normal
                            return (
                                <ConversationListItem
                                    key={item.id || index}
                                    conversation={item}
                                    isSelected={item.id === activeId}
                                    onSelect={() => onSelect(item)}
                                />
                            );
                        }
                    }}
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground opacity-50">
                    <InboxIcon className="h-10 w-10 mb-2" />
                    <p className="text-sm">Nenhuma conversa encontrada.</p>
                </div>
            )}
        </div>
    );
};

export default memo(ConversationList);
