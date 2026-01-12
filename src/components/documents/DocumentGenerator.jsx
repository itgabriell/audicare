import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, FileText, Download, Send } from 'lucide-react';
import { documentService } from '@/services/documentService';
import { documentSenderService } from '@/services/documentSenderService';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const DocumentGenerator = ({ 
  open, 
  onClose, 
  patient, 
  consultationId,
  templateId = null,
  onDocumentGenerated 
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [generatedDocument, setGeneratedDocument] = useState(null);

  useEffect(() => {
    if (open && profile?.clinic_id) {
      loadTemplates();
    }
  }, [open, profile]);

  useEffect(() => {
    if (selectedTemplate) {
      initializeFormData();
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await documentService.getTemplates(profile.clinic_id);
      setTemplates(data);
      
      // Se templateId foi passado, selecionar automaticamente
      if (templateId) {
        const template = data.find(t => t.id === templateId);
        if (template) {
          setSelectedTemplate(template);
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar templates',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeFormData = () => {
    if (!selectedTemplate?.template_content?.fields) return;

    const initialData = {};
    selectedTemplate.template_content.fields.forEach(field => {
      // Preencher com dados do paciente se disponível
      if (field.patientField) {
        initialData[field.name] = patient[field.patientField] || '';
      } else {
        initialData[field.name] = field.defaultValue || '';
      }
    });

    setFormData(initialData);
  };

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione um template primeiro.',
      });
      return;
    }

    try {
      setGenerating(true);

      // Buscar dados da clínica
      const { data: clinic } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', profile.clinic_id)
        .single();

      // Preparar dados do documento
      const documentData = {
        template_id: selectedTemplate.id,
        type: selectedTemplate.type,
        title: formData.title || selectedTemplate.name,
        content: formData,
        metadata: {
          consultation_id: consultationId,
          generated_at: new Date().toISOString(),
        },
      };

      // Gerar PDF
      const pdf = await documentService.generatePDF(
        documentData,
        selectedTemplate,
        patient,
        clinic,
        { id: user.id, full_name: profile?.full_name || user.email, crf: profile?.crf }
      );

      // Converter para blob
      const pdfBlob = pdf.output('blob');

      // Salvar no banco e storage
      const savedDocument = await documentService.saveDocument(
        documentData,
        pdfBlob,
        profile.clinic_id,
        patient.id,
        consultationId,
        { id: user.id, full_name: profile?.full_name || user.email }
      );

      setGeneratedDocument(savedDocument);

      toast({
        title: 'Documento gerado',
        description: 'O documento foi gerado e salvo com sucesso.',
        className: 'bg-green-100 border-green-500',
      });

      if (onDocumentGenerated) {
        onDocumentGenerated(savedDocument);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar documento',
        description: error.message || 'Não foi possível gerar o documento.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedDocument?.pdf_url) return;

    window.open(generatedDocument.pdf_url, '_blank');
  };

  const handleSend = async () => {
    if (!generatedDocument) return;

    try {
      setSending(true);

      await documentSenderService.sendDocument(
        generatedDocument.id,
        patient,
        profile.clinic_id
      );

      toast({
        title: 'Documento enviado',
        description: 'O documento foi enviado ao paciente.',
        className: 'bg-green-100 border-green-500',
      });

      onClose();
    } catch (error) {
      console.error('Error sending document:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar',
        description: error.message || 'Não foi possível enviar o documento.',
      });
    } finally {
      setSending(false);
    }
  };

  const renderFormFields = () => {
    if (!selectedTemplate?.template_content?.fields) return null;

    return selectedTemplate.template_content.fields.map(field => {
      switch (field.type) {
        case 'textarea':
          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Textarea
                id={field.name}
                value={formData[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows={field.rows || 4}
              />
            </div>
          );

        case 'select':
          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Select
                value={formData[field.name] || ''}
                onValueChange={(value) => handleFieldChange(field.name, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );

        default:
          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                type={field.type || 'text'}
                value={formData[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Documento
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Seleção de Template */}
            <div className="space-y-2">
              <Label>Template do Documento</Label>
              <Select
                value={selectedTemplate?.id || ''}
                onValueChange={(value) => {
                  const template = templates.find(t => t.id === value);
                  setSelectedTemplate(template);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campos do Formulário */}
            {selectedTemplate && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Preencha os dados do documento</h3>
                {renderFormFields()}
              </div>
            )}

            {/* Documento Gerado */}
            {generatedDocument && (
              <div className="border-t pt-4 space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    ✓ Documento gerado com sucesso!
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownload} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Baixar PDF
                  </Button>
                  <Button onClick={handleSend} disabled={sending}>
                    {sending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Enviar ao Paciente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {!generatedDocument && (
            <Button onClick={handleGenerate} disabled={generating || !selectedTemplate}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar Documento
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentGenerator;

