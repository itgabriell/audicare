import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, X, Filter, CalendarIcon, FileText, Image, Video, Mic, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';

const AdvancedMessageSearch = ({ onSelectMessage, onSelectConversation }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    messageType: 'all', // all, text, image, video, audio, document
    senderType: 'all', // all, user, contact
    dateFrom: null,
    dateTo: null,
    conversationId: null
  });

  const searchMessages = async () => {
    if (!searchQuery.trim() && filters.messageType === 'all' && filters.senderType === 'all' && !filters.dateFrom && !filters.dateTo) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          conversation:conversations(
            id,
            contact:contacts(id, name, phone, avatar_url)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Filtro de texto
      if (searchQuery.trim()) {
        query = query.ilike('content', `%${searchQuery}%`);
      }

      // Filtro de tipo de mensagem
      if (filters.messageType !== 'all') {
        query = query.eq('message_type', filters.messageType);
      }

      // Filtro de remetente
      if (filters.senderType !== 'all') {
        const senderTypeMap = {
          user: 'user',
          contact: 'contact'
        };
        query = query.eq('sender_type', senderTypeMap[filters.senderType]);
      }

      // Filtro de data
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      // Filtro de conversa específica
      if (filters.conversationId) {
        query = query.eq('conversation_id', filters.conversationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Erro na busca:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (open) {
        searchMessages();
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filters, open]);

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'image': return <Image className="h-3 w-3" />;
      case 'video': return <Video className="h-3 w-3" />;
      case 'audio': return <Mic className="h-3 w-3" />;
      case 'document': return <FileText className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  const handleResultClick = (message) => {
    if (onSelectMessage) {
      onSelectMessage(message);
    }
    if (onSelectConversation && message.conversation) {
      onSelectConversation(message.conversation);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Search className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Busca Avançada de Mensagens</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Barra de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar em todas as mensagens..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filtros */}
          <Tabs defaultValue="filters" className="flex-1 flex flex-col min-h-0">
            <TabsList>
              <TabsTrigger value="filters">Filtros</TabsTrigger>
              <TabsTrigger value="results">
                Resultados {results.length > 0 && `(${results.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="filters" className="flex-1 overflow-auto">
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Mensagem</label>
                    <Select
                      value={filters.messageType}
                      onValueChange={(value) => setFilters({ ...filters, messageType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="image">Imagem</SelectItem>
                        <SelectItem value="video">Vídeo</SelectItem>
                        <SelectItem value="audio">Áudio</SelectItem>
                        <SelectItem value="document">Documento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Remetente</label>
                    <Select
                      value={filters.senderType}
                      onValueChange={(value) => setFilters({ ...filters, senderType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="user">Eu</SelectItem>
                        <SelectItem value="contact">Contato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Inicial</label>
                    <Input
                      type="date"
                      value={filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        setFilters({ ...filters, dateFrom: date });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Final</label>
                    <Input
                      type="date"
                      value={filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        setFilters({ ...filters, dateTo: date });
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilters({
                        messageType: 'all',
                        senderType: 'all',
                        dateFrom: null,
                        dateTo: null,
                        conversationId: null
                      });
                      setSearchQuery('');
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="results" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-muted-foreground">Buscando...</div>
                  </div>
                ) : results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <Search className="h-12 w-12 mb-4 opacity-20" />
                    <p>Nenhuma mensagem encontrada</p>
                    <p className="text-xs mt-2">Tente ajustar os filtros ou a busca</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {results.map((message) => (
                      <div
                        key={message.id}
                        onClick={() => handleResultClick(message)}
                        className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {getMessageTypeIcon(message.message_type)}
                                <span className="ml-1 capitalize">{message.message_type || 'text'}</span>
                              </Badge>
                              <Badge variant={message.sender_type === 'user' ? 'default' : 'secondary'} className="text-xs">
                                {message.sender_type === 'user' ? 'Você' : message.conversation?.contact?.name || 'Contato'}
                              </Badge>
                            </div>
                            <p className="text-sm line-clamp-2">
                              {message.content || '(Mídia)'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                            {message.conversation?.contact && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Conversa: {message.conversation.contact.name || message.conversation.contact.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedMessageSearch;

