import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Forward, Edit, Trash2, Share2, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const MessageActionsMenu = ({ message, onEdit, onDelete, onForward, onShare }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const isUserMessage = message.sender_type === 'user' || message.sender_type === 'bot';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || '');
    toast({ title: 'Copiado', description: 'Mensagem copiada para a área de transferência.' });
    setIsOpen(false);
  };

  const handleShare = () => {
    if (navigator.share && message.content) {
      navigator.share({
        text: message.content,
        title: 'Mensagem do WhatsApp',
      }).catch(() => {
        handleCopy();
      });
    } else {
      handleCopy();
    }
    setIsOpen(false);
    onShare?.();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copiar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { onForward?.(); setIsOpen(false); }}>
          <Forward className="h-4 w-4 mr-2" />
          Encaminhar
        </DropdownMenuItem>
        {isUserMessage && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { onEdit?.(); setIsOpen(false); }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => { onDelete?.(); setIsOpen(false); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar para mim
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => { onDelete?.(true); setIsOpen(false); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar para todos
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MessageActionsMenu;

