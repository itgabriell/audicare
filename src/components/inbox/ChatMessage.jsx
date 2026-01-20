import React, { useState, memo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, FileText, Download, Clock, AlertCircle, AlertTriangle, Loader2, Play, Volume2, Image as ImageIcon } from 'lucide-react';
import MessageActionsMenu from './MessageActionsMenu';
import { AdvancedModal } from '@/components/ui/advanced-modal';

const ChatMessage = ({ message, highlight, onEdit, onDelete, onForward }) => {
  const [showActions, setShowActions] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { content, created_at, sender_type, message_type, media_url, status, direction } = message;

  // Usar direction se disponível, senão fallback para sender_type
  const isUser = direction === 'outbound' || sender_type === 'user' || sender_type === 'bot';
  const formattedTime = created_at ? format(new Date(created_at), 'HH:mm', { locale: ptBR }) : '';

  const isImage = message_type === 'image' && media_url;
  const isVideo = message_type === 'video' && media_url;
  const isAudio = message_type === 'audio' && media_url;
  const isDocument = message_type === 'document' && media_url;

  // Status completo de mensagens com animações
  const MESSAGE_STATUS = {
    SENDING: 'sending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
    PENDING: 'pending'
  };

  const renderStatusIcon = () => {
    if (!isUser) return null;

    const messageStatus = status || MESSAGE_STATUS.SENT;

    switch (messageStatus) {
      case MESSAGE_STATUS.SENDING:
        return <Loader2 className="w-3 h-3 animate-spin text-primary-foreground/50" />;

      case MESSAGE_STATUS.PENDING:
        return <Clock className="w-3 h-3 text-primary-foreground/50" />;

      case MESSAGE_STATUS.FAILED:
        return <AlertCircle className="w-3 h-3 text-red-400" />;

      case MESSAGE_STATUS.SENT:
        return <Check className="w-3 h-3 text-primary-foreground/70" />;

      case MESSAGE_STATUS.DELIVERED:
        return <CheckCheck className="w-3 h-3 text-primary-foreground/70" />;

      case MESSAGE_STATUS.READ:
        return <CheckCheck className="w-3 h-3 text-blue-400" />;

      default:
        return <Check className="w-3 h-3 text-primary-foreground/70" />;
    }
  };

  // Status text para screen readers
  const getStatusText = () => {
    if (!isUser) return '';

    const messageStatus = status || MESSAGE_STATUS.SENT;

    switch (messageStatus) {
      case MESSAGE_STATUS.SENDING: return 'Enviando...';
      case MESSAGE_STATUS.PENDING: return 'Pendente';
      case MESSAGE_STATUS.FAILED: return 'Falhou ao enviar';
      case MESSAGE_STATUS.SENT: return 'Enviada';
      case MESSAGE_STATUS.DELIVERED: return 'Entregue';
      case MESSAGE_STATUS.READ: return 'Lida';
      default: return '';
    }
  };

    return (
    <div 
      className={cn('flex w-full mb-2 group', isUser ? 'justify-end' : 'justify-start')}
      data-message-index={message._index}
    >
      <div className={cn(
          // FIX NUCLEAR: 'overflow-hidden' é a chave. Se o filho crescer, ele corta, não empurra.
          'relative px-3 py-2 shadow-sm text-sm flex flex-col overflow-hidden',
          'max-w-[85%] md:max-w-[70%]',
          isUser 
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm' 
            : 'bg-white dark:bg-card border border-border/50 text-foreground rounded-2xl rounded-tl-sm',
          highlight && 'ring-2 ring-yellow-400 ring-offset-2'
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Menu de ações */}
        <div className="absolute top-2 right-2 z-10">
          <MessageActionsMenu
            message={message}
            onEdit={() => onEdit?.(message)}
            onDelete={(deleteForEveryone) => onDelete?.(message, deleteForEveryone)}
            onForward={() => onForward?.(message)}
          />
        </div>
        {/* RENDERIZAÇÃO DE MÍDIAS */}
        <div className={cn("flex flex-col gap-2 w-full", (isImage || isVideo || isAudio || isDocument) ? "mb-1" : "")}>
            {/* IMAGEM com Lightbox */}
            {isImage && (
              <div className="relative">
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="block overflow-hidden rounded-xl bg-black/5 hover:bg-black/10 transition-colors cursor-pointer group"
                >
                  <img
                    src={media_url}
                    alt="Imagem"
                    className="w-full h-auto object-cover max-h-[300px] group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ImageIcon className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                </button>

                {/* Lightbox Modal */}
                <AdvancedModal
                  open={lightboxOpen}
                  onOpenChange={setLightboxOpen}
                  title="Imagem"
                  size="xl"
                  closeOnOutsideClick={true}
                  glassEffect={true}
                >
                  <div className="flex items-center justify-center p-4">
                    <img
                      src={media_url}
                      alt="Imagem ampliada"
                      className="max-w-full max-h-[80vh] object-contain rounded-lg"
                    />
                  </div>
                </AdvancedModal>
              </div>
            )}

            {/* VÍDEO */}
            {isVideo && (
              <div className="relative bg-black/5 rounded-xl overflow-hidden">
                <video
                  controls
                  className="w-full max-w-sm h-auto rounded-xl"
                  preload="metadata"
                >
                  <source src={media_url} type="video/mp4" />
                  Seu navegador não suporta a reprodução de vídeo.
                </video>
              </div>
            )}

            {/* ÁUDIO */}
            {isAudio && (
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border w-full max-w-sm",
                isUser
                  ? "bg-primary-foreground/10 border-primary-foreground/20"
                  : "bg-muted/50 border-border"
              )}>
                <div className="flex-shrink-0">
                  <Volume2 className={cn(
                    "w-5 h-5",
                    isUser ? "text-primary-foreground" : "text-muted-foreground"
                  )} />
                </div>
                <audio
                  controls
                  className="flex-1 h-8"
                  preload="metadata"
                >
                  <source src={media_url} type="audio/mpeg" />
                  Seu navegador não suporta a reprodução de áudio.
                </audio>
              </div>
            )}

            {/* DOCUMENTO */}
            {isDocument && (
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors w-full overflow-hidden cursor-pointer hover:shadow-md",
                isUser
                  ? "bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20"
                  : "bg-muted/50 border-border hover:bg-muted"
              )}>
                <FileText className={cn(
                  "h-5 w-5 shrink-0",
                  isUser ? "text-primary-foreground" : "text-muted-foreground"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium">
                    {content || 'Documento'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Clique para baixar
                  </p>
                </div>
                <a
                  href={media_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "p-1.5 rounded-md transition-colors shrink-0",
                    isUser
                      ? "hover:bg-primary-foreground/20 text-primary-foreground"
                      : "hover:bg-background text-muted-foreground"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            )}
        </div>

        {/* ÁREA DE TEXTO BLINDADA */}
        <div className="relative w-full min-w-0">
             {content && !isDocument && (
                // break-all: Quebra qualquer palavra em qualquer lugar se bater no limite
                // whitespace-pre-wrap: Mantém os parágrafos
                <p className="whitespace-pre-wrap break-all leading-relaxed text-[15px] pb-1 w-full">
                    {content}
                    <span className="inline-block w-12 h-0"></span> 
                </p>
             )}
             
             <div className={cn("flex items-center justify-end gap-1 select-none float-right -mt-1 ml-2", isUser ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                <span className="text-[10px] font-medium tracking-wide">{formattedTime}</span>
                {renderStatusIcon()}
             </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ChatMessage, (prevProps, nextProps) => {
  // Otimização: só re-renderiza se realmente mudou
  return (
    prevProps.message?.id === nextProps.message?.id &&
    prevProps.message?.status === nextProps.message?.status &&
    prevProps.highlight === nextProps.highlight
  );
});
