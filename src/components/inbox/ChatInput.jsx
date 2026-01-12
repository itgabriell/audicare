import React, { useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";

/**
 * Campo de mensagem controlado e simples para ser usado dentro do rodapé do chat.
 * A toolbar e botões externos ficam a cargo do container pai (ChatWindow).
 */
const ChatInput = ({
  text = '',
  onTextChange,
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = "Digite uma mensagem...",
  className = "",
}) => {
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Ajusta a altura automaticamente conforme o conteúdo
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (disabled) return;
    const value = (text || '').trim();
    if (!value) return;
    onSendMessage?.(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (value) => {
    onTextChange?.(value);
    
    // Indicar que está digitando
    if (onTyping && value.trim().length > 0) {
      onTyping();
      
      // Limpar timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  return (
    <Textarea
      ref={textareaRef}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      rows={1}
      className={`min-h-[40px] max-h-[120px] w-full px-3 py-2.5 bg-transparent border-0 focus-visible:ring-0 resize-none text-sm placeholder:text-muted-foreground/70 ${className}`}
    />
  );
};

export default ChatInput;