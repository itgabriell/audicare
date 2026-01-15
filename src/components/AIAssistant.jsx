import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Loader2 } from 'lucide-react';
import { aiAssistantService } from '@/services/aiAssistantService';

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const currentMessage = message.trim();
    setMessage(''); // Limpa o input imediatamente
    setIsLoading(true);

    try {
      const aiResponse = await aiAssistantService.askQuestion(currentMessage);
      setResponse(aiResponse);
    } catch (error) {
      console.error('Erro ao consultar IA:', error);
      setResponse(`Erro: ${error.message || 'Ocorreu um erro ao processar sua pergunta. Verifique se a chave da API está configurada corretamente.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          size="icon"
          title="Assistente de IA - Clique para ajuda"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>

      {/* AI Assistant Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              Assistente de IA
            </DialogTitle>
            <DialogDescription>
              Converse com inteligência artificial para obter ajuda e respostas rápidas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Response Area */}
            <div className="flex-1 border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
              {response ? (
                <div className="whitespace-pre-wrap text-sm">{response}</div>
              ) : (
                <div className="text-gray-500 text-center flex items-center justify-center h-full">
                  Faça uma pergunta para começar...
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua pergunta..."
                className="flex-1 resize-none"
                rows={3}
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                className="px-4"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
