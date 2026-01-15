import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { MessageSquare, ArrowLeft, Search, MoreVertical, Paperclip, Mic, Send, Smile, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InfiniteList } from '@/components/ui/VirtualizedList';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatePresence } from 'framer-motion';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import { useToast } from '@/components/ui/use-toast';
import { validatePhoneE164, formatPhoneE164 } from '@/lib/phoneUtils';
import { supabase } from '@/database.js';
import ConversationSearch from './ConversationSearch';
import QuickReplyPopover from './QuickReplyPopover';
import EmojiPicker from './EmojiPicker';
import FileUploadButton from './FileUploadButton';
import AudioRecorder from './AudioRecorder';
import AdvancedMessageSearch from './AdvancedMessageSearch';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" stroke="currentColor" strokeWidth="0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const MessageSkeleton = () => (
  <div className="p-6 space-y-8 opacity-40">
    <div className="flex gap-4"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-12 w-64 rounded-2xl rounded-tl-sm" /></div>
    <div className="flex justify-end"><Skeleton className="h-12 w-48 rounded-2xl rounded-tr-sm" /></div>
  </div>
);

const ChatWindow = ({
  conversation,
  messages,
  loadingMessages,
  isSending,
  onSendMessage,
  onBack,
  searchTerm,
  onSearchTermChange,
  onToggleInfo,
  onConversationUpdate
}) => {
  // TODOS OS HOOKS DEVEM SER CHAMADOS ANTES DE QUALQUER RETURN
  const scrollAreaRef = useRef(null);
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  
  // Indicador de digitação - sempre chamado, mesmo se conversation for null
  const { isContactTyping, startTyping } = useTypingIndicator(
    conversation?.id,
    conversation?.contact_id || conversation?.contact?.id
  );

  const safeMessages = Array.isArray(messages) ? messages : [];
  const canSend = typeof onSendMessage === 'function';

  // Validação de telefone reutilizável - memoizada para evitar recriação
  const validateContactPhone = useCallback(() => {
    if (!conversation) return null;
    const phoneToValidate = conversation?.contact_phone || conversation?.contact?.phone || conversation?.contact?.mobile_phone;
    const phoneE164 = formatPhoneE164(phoneToValidate);
    if (!phoneE164 || !validatePhoneE164(phoneE164)) {
      toast({ variant: 'destructive', title: 'Número inválido', description: 'Verifique o cadastro.' });
      return null;
    }
    return phoneE164;
  }, [conversation, toast]);

  const handleSendMessage = useCallback((contentInput) => {
    if (!conversation) return;
    const messageContent = typeof contentInput === 'string' ? contentInput : text;
    if (!messageContent || !messageContent.trim()) return;

    const phoneE164 = validateContactPhone();
    if (!phoneE164) return;

    onSendMessage({ type: 'text', content: messageContent, phone: phoneE164 });
    setText('');
  }, [text, conversation, onSendMessage, validateContactPhone]);

  const handleQuickReplySelect = useCallback((reply) => {
    setText(reply.content);
  }, []);
  
  const handleEmojiSelect = useCallback((emoji) => {
    setText(prev => prev + emoji);
  }, []);

  const handleFileSelected = useCallback(async (fileData) => {
    if (!conversation) return;
    const phoneE164 = validateContactPhone();
    if (!phoneE164) return;

    onSendMessage({
      message_type: fileData.message_type,
      content: fileData.content,
      media_url: fileData.media_url,
      file: fileData.file
    });
  }, [conversation, onSendMessage, validateContactPhone]);

  const handleAudioRecorded = useCallback(async (audioBlob) => {
    if (!conversation) return;
    const phoneE164 = validateContactPhone();
    if (!phoneE164) return;

    onSendMessage({
      message_type: 'audio',
      file: audioBlob,
      content: 'Áudio'
    });
  }, [conversation, onSendMessage, validateContactPhone]);

  // Handler para atualizar status do lead
  const handleStatusChange = useCallback(async (newStatus) => {
    if (!conversation?.id) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ lead_status: newStatus })
        .eq('id', conversation.id);

      if (error) throw error;

      // Atualizar estado local imediatamente para reatividade
      const updatedConversation = { ...conversation, lead_status: newStatus };
      if (onConversationUpdate) {
        onConversationUpdate(updatedConversation);
      }

      toast({
        title: 'Status atualizado',
        description: `Status alterado para ${newStatus}`,
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
      });
    }
  }, [conversation, onConversationUpdate, toast]);

  // Memoizar handlers para evitar re-renders desnecessários
  const handleEdit = useCallback(() => {
    toast({ title: 'Em desenvolvimento', description: 'Funcionalidade de edição em breve.' });
  }, [toast]);

  const handleDelete = useCallback((deleteForEveryone) => {
    toast({ title: 'Em desenvolvimento', description: `Funcionalidade de exclusão ${deleteForEveryone ? 'para todos' : 'para mim'} em breve.` });
  }, [toast]);

  const handleForward = useCallback(() => {
    toast({ title: 'Em desenvolvimento', description: 'Funcionalidade de encaminhamento em breve.' });
  }, [toast]);

  // Memoizar mensagens destacadas
  const highlightedMessages = useMemo(() => {
    if (!searchTerm) return new Set();
    const term = searchTerm.toLowerCase();
    return new Set(
      safeMessages
        .map((msg, idx) => msg.content?.toLowerCase().includes(term) ? idx : null)
        .filter(idx => idx !== null)
    );
  }, [safeMessages, searchTerm]);

  // Dados derivados
  const contact = conversation?.contact || {};
  const displayName = contact.name || conversation?.contact_name || 'Paciente';

  useEffect(() => {
    if (!scrollAreaRef.current || safeMessages.length === 0 || !conversation) return;
    const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      setTimeout(() => {
         viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [safeMessages.length, conversation?.id]);

  const renderContent = useMemo(() => {
    if (loadingMessages) return <MessageSkeleton />;
    if (safeMessages.length === 0) {
      return (
        <div className="flex h-full items-center justify-center p-8">
            <div className="bg-background/80 backdrop-blur border px-6 py-3 rounded-full shadow-sm text-xs text-muted-foreground text-center">
                🔒 Início da conversa com <strong>{displayName}</strong>
            </div>
        </div>
      );
    }
    return (
      <div className="p-4 md:p-8 space-y-6 pb-4 w-full max-w-full">
        {safeMessages.map((msg, index) => (
          <ChatMessage 
            key={msg.id} 
            message={{ ...msg, _index: index }}
            highlight={highlightedMessages.has(index)}
            onEdit={handleEdit}
            onDelete={(msg, deleteForEveryone) => handleDelete(deleteForEveryone)}
            onForward={handleForward}
          />
        ))}
      </div>
    );
  }, [loadingMessages, safeMessages, displayName, highlightedMessages, handleEdit, handleDelete, handleForward]);

  // AGORA SIM, podemos fazer o early return DEPOIS de todos os hooks
  if (!conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-sm">
        <div className="text-center space-y-4">
            <div className="bg-primary/5 rounded-full h-24 w-24 mx-auto flex items-center justify-center ring-8 ring-primary/5">
                <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Sistema Audicare</h2>
            <p className="text-muted-foreground text-sm">Selecione uma conversa para iniciar o atendimento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-zinc-950/30 relative min-w-0">
      
      {/* HEADER LIMPO */}
      <div className="flex items-center gap-4 px-6 py-3 bg-background/85 backdrop-blur-md border-b sticky top-0 z-20 shadow-sm transition-all w-full">
        <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={onBack}>
          <ArrowLeft className="h-5 w-5"/>
        </Button>
        
        <Avatar className="h-10 w-10 ring-2 ring-primary/10 cursor-pointer" onClick={onToggleInfo}>
          <AvatarImage src={contact.profile_pic_url} className="object-cover"/>
          <AvatarFallback className="bg-primary/5 text-primary font-medium">{displayName?.[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleInfo}>
          <div className="flex items-center gap-2">
             <h3 className="font-semibold text-base truncate text-foreground">{displayName}</h3>
             <Select value={conversation.lead_status || 'novo'} onValueChange={handleStatusChange}>
               <SelectTrigger className="w-auto h-6 text-xs border-none bg-transparent hover:bg-muted/50 px-2">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="novo">Novo</SelectItem>
                 <SelectItem value="atendendo">Em Atendimento</SelectItem>
                 <SelectItem value="agendado">Agendado</SelectItem>
                 <SelectItem value="finalizado">Finalizado</SelectItem>
               </SelectContent>
             </Select>
             <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center bg-green-50 text-green-700 hover:bg-green-100 border-green-200 shadow-none rounded-full">
                <WhatsAppIcon />
             </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate font-medium">
            {contact.phone}
            {isContactTyping && (
              <span className="ml-2 text-xs text-primary animate-pulse">digitando...</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
             <AdvancedMessageSearch 
               onSelectConversation={(conv) => {
                 // Se selecionar uma conversa diferente, pode navegar
                 console.log('Conversa selecionada:', conv);
               }}
             />
             <Button variant="ghost" size="icon" onClick={() => setIsSearchVisible(!isSearchVisible)} className="hover:text-primary">
                <Search className="h-5 w-5"/>
             </Button>
             <Button variant="ghost" size="icon" onClick={onToggleInfo} className="hover:text-primary" title="Dados do Contato">
                <MoreVertical className="h-5 w-5"/>
             </Button>
        </div>
      </div>

      <AnimatePresence>
        {isSearchVisible && (
          <div className="bg-background/95 backdrop-blur border-b z-10 shadow-inner">
             <ConversationSearch 
               searchTerm={searchTerm} 
               onSearchTermChange={onSearchTermChange}
               messages={safeMessages}
             />
          </div>
        )}
      </AnimatePresence>
      
      <div className="flex-1 relative overflow-hidden w-full">
        {loadingMessages ? (
          <div className="h-full w-full">
            <MessageSkeleton />
          </div>
        ) : safeMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="bg-background/80 backdrop-blur border px-6 py-3 rounded-full shadow-sm text-xs text-muted-foreground text-center">
              🔒 Início da conversa com <strong>{displayName}</strong>
            </div>
          </div>
        ) : (
          <InfiniteList
            items={safeMessages}
            renderItem={(msg, index) => (
              <ChatMessage
                key={msg.id}
                message={{ ...msg, _index: index }}
                highlight={highlightedMessages.has(index)}
                onEdit={handleEdit}
                onDelete={(msg, deleteForEveryone) => handleDelete(deleteForEveryone)}
                onForward={handleForward}
              />
            )}
            hasNextPage={false} // TODO: implementar paginação histórica
            isFetchingNextPage={false}
            fetchNextPage={() => {}} // TODO: implementar carregamento histórico
            itemHeight={80} // Altura estimada de mensagens
            containerHeight="100%"
            className="p-4 md:p-8 pb-4"
          />
        )}
      </div>
      
      {/* FOOTER - NOVO LAYOUT */}
      <div className="flex-shrink-0 p-3 bg-transparent z-20 w-full">
        <div className="bg-background border shadow-lg shadow-black/5 rounded-2xl flex items-end p-2 gap-2 focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
            
            {/* Ferramentas à Esquerda */}
            <div className="flex items-center gap-1 pb-1">
                <QuickReplyPopover onSelectQuickReply={handleQuickReplySelect} messages={safeMessages}>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5" title="Respostas Rápidas">
                        <Zap className="h-5 w-5"/>
                    </Button>
                </QuickReplyPopover>
                <EmojiPicker onEmojiSelect={handleEmojiSelect}>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5" title="Emoji">
                    <Smile className="h-5 w-5"/>
                  </Button>
                </EmojiPicker>
                <FileUploadButton onFileSelected={handleFileSelected} disabled={isSending || loadingMessages || !canSend}>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5" title="Anexar">
                    <Paperclip className="h-5 w-5"/>
                  </Button>
                </FileUploadButton>
            </div>

            {/* Input no Centro */}
            <div className="flex-1">
                <ChatInput
                    text={text}
                    onTextChange={setText}
                    onSendMessage={handleSendMessage}
                    onTyping={startTyping}
                    disabled={isSending || loadingMessages || !canSend}
                    className="border-none shadow-none focus-visible:ring-0 px-2 min-h-[40px] max-h-[120px] bg-transparent resize-none py-2.5"
                    placeholder="Digite uma mensagem..."
                />
            </div>

            {/* Ação à Direita */}
            <div className="pb-1">
                {text.trim() ? (
                    <Button onClick={() => handleSendMessage()} size="icon" className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 transition-all shadow-sm">
                        <Send className="h-4 w-4 text-primary-foreground"/>
                    </Button>
                ) : (
                    <AudioRecorder 
                      onAudioRecorded={handleAudioRecorded}
                      disabled={isSending || loadingMessages || !canSend}
                    />
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
