import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Download, Send, Calendar, User } from 'lucide-react';
import { documentService } from '@/services/documentService';
import { documentSenderService } from '@/services/documentSenderService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

const DocumentList = ({ patientId, patient }) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    if (patientId) {
      loadDocuments();
    }
  }, [patientId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentService.getPatientDocuments(patientId);
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar documentos',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (document) => {
    if (document.pdf_url) {
      window.open(document.pdf_url, '_blank');
    }
  };

  const handleSend = async (document) => {
    if (!patient) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Dados do paciente não disponíveis.',
      });
      return;
    }

    try {
      setSending(document.id);
      await documentSenderService.sendDocument(
        document.id,
        patient,
        document.clinic_id
      );

      toast({
        title: 'Documento enviado',
        description: 'O documento foi enviado ao paciente.',
        className: 'bg-green-100 border-green-500',
      });

      // Recarregar lista para atualizar status
      loadDocuments();
    } catch (error) {
      console.error('Error sending document:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar',
        description: error.message || 'Não foi possível enviar o documento.',
      });
    } finally {
      setSending(null);
    }
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      prescription: 'Receita',
      medical_certificate: 'Atestado',
      report: 'Relatório',
      invoice: 'Nota Fiscal',
      other: 'Outro',
    };
    return labels[type] || type;
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

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum documento encontrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <Card key={document.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {document.title}
                </CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(document.issued_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {document.profiles?.full_name || 'Sistema'}
                  </div>
                </div>
              </div>
              <Badge variant="outline">{getDocumentTypeLabel(document.document_type)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(document)}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSend(document)}
                disabled={sending === document.id}
              >
                {sending === document.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar ao Paciente
              </Button>
              <div className="flex gap-2 ml-auto">
                {document.sent_via_whatsapp && (
                  <Badge variant="secondary" className="text-xs">WhatsApp</Badge>
                )}
                {document.sent_via_email && (
                  <Badge variant="secondary" className="text-xs">Email</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DocumentList;

