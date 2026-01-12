import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ConversationSearch = ({ searchTerm, onSearchTermChange, messages = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Encontrar todas as mensagens que correspondem à busca
  const matchingMessages = useMemo(() => {
    if (!searchTerm || !messages.length) return [];
    const term = searchTerm.toLowerCase();
    return messages
      .map((msg, idx) => ({ msg, idx }))
      .filter(({ msg }) => 
        msg.content?.toLowerCase().includes(term)
      );
  }, [searchTerm, messages]);

  const resultCount = matchingMessages.length;

  // Navegar para a próxima ocorrência
  const goToNext = () => {
    if (matchingMessages.length === 0) return;
    const nextIndex = currentIndex < matchingMessages.length - 1 
      ? currentIndex + 1 
      : 0;
    setCurrentIndex(nextIndex);
    scrollToMessage(matchingMessages[nextIndex].idx);
  };

  // Navegar para a ocorrência anterior
  const goToPrev = () => {
    if (matchingMessages.length === 0) return;
    const prevIndex = currentIndex > 0 
      ? currentIndex - 1 
      : matchingMessages.length - 1;
    setCurrentIndex(prevIndex);
    scrollToMessage(matchingMessages[prevIndex].idx);
  };

  // Scroll para a mensagem
  const scrollToMessage = (messageIndex) => {
    const messageElement = document.querySelector(`[data-message-index="${messageIndex}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Destacar temporariamente
      messageElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }, 2000);
    }
  };

  // Resetar índice quando o termo de busca mudar
  useEffect(() => {
    setCurrentIndex(-1);
  }, [searchTerm]);

  const handleClear = () => {
    onSearchTermChange('');
    setCurrentIndex(-1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-3 border-b bg-background/95 backdrop-blur flex items-center gap-2"
    >
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="Buscar na conversa..."
          className="h-9 pr-8"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      
      {searchTerm && resultCount > 0 && (
        <>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9" 
              onClick={goToPrev}
              title="Anterior"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9" 
              onClick={goToNext}
              title="Próxima"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            {currentIndex >= 0 ? `${currentIndex + 1} / ${resultCount}` : resultCount}
          </Badge>
        </>
      )}
      
      {searchTerm && resultCount === 0 && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Nenhum resultado
        </span>
      )}
    </motion.div>
  );
};

export default ConversationSearch;