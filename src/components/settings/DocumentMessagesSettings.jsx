import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, MessageSquare } from 'lucide-react';
import { documentService } from '@/services/documentService';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const DOCUMENT_TYPES = [
  { value: 'prescription', label: 'Receita' },
  { value: 'medical_certificate', label: 'Atestado' },
  { value: 'report', label: 'Relatório' },
  { value: 'invoice', label: 'Nota Fiscal' },
  { value: 'other', label: 'Outro' },
];

const DocumentMessagesSettings = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({});
  const [messages, setMessages] = useState({});

  useEffect(() => {
    if (profile?.clinic_id) {
      loadMessages();
    }
  }, [profile]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const loadedMessages = {};

      for (const type of DOCUMENT_TYPES) {
        try {
          const message = await documentService.getDocumentMessage(
            profile.clinic_id,
            type.value
          );
          if (message) {
            loadedMessages[type.value] = message;
          } else {
            // Criar estrutura vazia
            loadedMessages[type.value] = {
              document_type: type.value,
              whatsapp_message: '',
              email_subject: '',
              email_body: '',
            };
          }
        } catch (error) {
          // Se não encontrar, criar estrutura vazia
          loadedMessages[type.value] = {
            document_type: type.value,
            whatsapp_message: '',
            email_subject: '',
            email_body: '',
          };
        }
      }

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar mensagens',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (documentType) => {
    try {
      setSaving(prev => ({ ...prev, [documentType]: true }));

      const messageData = {
        clinic_id: profile.clinic_id,
        document_type: documentType,
        whatsapp_message: messages[documentType].whatsapp_message,
        email_subject: messages[documentType].email_subject,
        email_body: messages[documentType].email_body,
        is_active: true,
      };

      await documentService.saveDocumentMessage(messageData);

      toast({
        title: 'Mensagem salva',
        description: `Mensagem padrão para ${DOCUMENT_TYPES.find(t => t.value === documentType)?.label} foi salva.`,
        className: 'bg-green-100 border-green-500',
      });
    } catch (error) {
      console.error('Error saving message:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar a mensagem.',
      });
    } finally {
      setSaving(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const handleChange = (documentType, field, value) => {
    setMessages(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-10 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mensagens Padrão de Documentos</h2>
        <p className="text-muted-foreground">
          Configure as mensagens que serão enviadas automaticamente quando um documento for gerado.
        </p>
      </div>

      {DOCUMENT_TYPES.map(type => (
        <Card key={type.value}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {type.label}
            </CardTitle>
            <CardDescription>
              Mensagens padrão para envio de documentos do tipo {type.label.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mensagem WhatsApp</Label>
              <Textarea
                value={messages[type.value]?.whatsapp_message || ''}
                onChange={(e) => handleChange(type.value, 'whatsapp_message', e.target.value)}
                placeholder="Olá! Segue o documento {{title}} emitido em {{date}}..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use {{title}} e {{date}} como placeholders que serão substituídos automaticamente.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Assunto do Email</Label>
              <Input
                value={messages[type.value]?.email_subject || ''}
                onChange={(e) => handleChange(type.value, 'email_subject', e.target.value)}
                placeholder="Documento: {{title}}"
              />
            </div>

            <div className="space-y-2">
              <Label>Corpo do Email</Label>
              <Textarea
                value={messages[type.value]?.email_body || ''}
                onChange={(e) => handleChange(type.value, 'email_body', e.target.value)}
                placeholder="Olá,\n\nSegue em anexo o documento {{title}}..."
                rows={6}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => handleSave(type.value)}
                disabled={saving[type.value]}
              >
                {saving[type.value] ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Mensagem
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DocumentMessagesSettings;

