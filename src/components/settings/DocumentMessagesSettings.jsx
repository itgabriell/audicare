import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, MessageSquare, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { documentService } from '@/services/documentService';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DOCUMENT_TYPES = [
  { value: 'prescription', label: 'Receita' },
  { value: 'medical_certificate', label: 'Atestado' },
  { value: 'report', label: 'Relatório' },
  { value: 'invoice', label: 'Nota Fiscal' },
  { value: 'other', label: 'Outro' },
];

const VARIABLES = [
  { label: 'Nome do Paciente', value: '{{patient_name}}' },
  { label: 'Título do Doc', value: '{{title}}' },
  { label: 'Data', value: '{{date}}' },
  { label: 'Hora', value: '{{time}}' },
  { label: 'Nome do Doutor', value: '{{doctor_name}}' },
];

const DocumentMessagesSettings = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({});
  const [messages, setMessages] = useState({});

  // State to track open states of accordions. Defaulting to first one open or none.
  const [openItems, setOpenItems] = useState(['prescription']);

  useEffect(() => {
    if (profile?.clinic_id) {
      loadMessages();
    }
  }, [profile]);

  const toggleItem = (value) => {
    setOpenItems(prev =>
      prev.includes(value)
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  const loadMessages = async () => {
    // ... logic same as before but ensured robust ...
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
            loadedMessages[type.value] = {
              document_type: type.value,
              whatsapp_message: '',
              email_subject: '',
              email_body: '',
            };
          }
        } catch (error) {
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

  const insertVariable = (documentType, field, variableValue) => {
    const currentText = messages[documentType]?.[field] || '';
    const newText = currentText + ' ' + variableValue; // Simple append for now
    handleChange(documentType, field, newText);

    // Optional: Visual feedback could be added here
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
          Personalize as mensagens automáticas enviadas via WhatsApp e E-mail.
        </p>
      </div>

      <div className="grid gap-4">
        {DOCUMENT_TYPES.map(type => {
          const isOpen = openItems.includes(type.value);
          return (
            <Collapsible
              key={type.value}
              open={isOpen}
              onOpenChange={() => toggleItem(type.value)}
              className="space-y-2"
            >
              <div className="flex items-center justify-between space-x-4 px-4 py-3 border rounded-lg hover:bg-muted/50 transition-all bg-card">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-full bg-primary/10 transition-colors", isOpen && "bg-primary/20")}>
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {type.label}
                  </h4>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", !isOpen && "-rotate-90")} />
                    <span className="sr-only">Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent className="space-y-2">
                <Card className="border-t-0 rounded-t-none mt-[-8px]">
                  <CardContent className="space-y-6 pt-6">
                    {/* WhatsApp Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium flex items-center gap-2">
                          WhatsApp
                          <span className="text-xs font-normal text-muted-foreground">(Envio rápido)</span>
                        </Label>
                        {/* Variáveis Rápidas para WhatsApp */}
                        <div className="flex flex-wrap gap-1 justify-end">
                          {VARIABLES.map(v => (
                            <Badge
                              key={v.value}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors font-mono text-[10px]"
                              onClick={() => insertVariable(type.value, 'whatsapp_message', v.value)}
                            >
                              <Plus className="h-2 w-2 mr-1" /> {v.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Textarea
                        value={messages[type.value]?.whatsapp_message || ''}
                        onChange={(e) => handleChange(type.value, 'whatsapp_message', e.target.value)}
                        placeholder="Ex: Olá, segue sua receita..."
                        className="min-h-[100px] font-sans"
                      />
                    </div>

                    {/* Email Section */}
                    <div className="space-y-4 pt-4 border-t">
                      <Label className="text-base font-medium">E-mail</Label>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Assunto</Label>
                          <div className="flex flex-wrap gap-1 justify-end">
                            <Badge
                              variant="outline"
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors font-mono text-[10px]"
                              onClick={() => insertVariable(type.value, 'email_subject', '{{title}}')}
                            >
                              <Plus className="h-2 w-2 mr-1" /> Título
                            </Badge>
                          </div>
                        </div>
                        <Input
                          value={messages[type.value]?.email_subject || ''}
                          onChange={(e) => handleChange(type.value, 'email_subject', e.target.value)}
                          placeholder="Assunto do email"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Corpo do Email</Label>
                          {/* Variáveis para Email Body */}
                          <div className="flex flex-wrap gap-1 justify-end">
                            {VARIABLES.map(v => (
                              <Badge
                                key={v.value}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors font-mono text-[10px]"
                                onClick={() => insertVariable(type.value, 'email_body', v.value)}
                              >
                                <Plus className="h-2 w-2 mr-1" /> {v.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Textarea
                          value={messages[type.value]?.email_body || ''}
                          onChange={(e) => handleChange(type.value, 'email_body', e.target.value)}
                          placeholder="Conteúdo do email..."
                          className="min-h-[150px]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => handleSave(type.value)}
                        disabled={saving[type.value]}
                        className="w-full sm:w-auto"
                      >
                        {saving[type.value] ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Alterações
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentMessagesSettings;
