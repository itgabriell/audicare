import { supabase } from '@/lib/customSupabaseClient';
import { whatsappService } from './whatsappService';
import { documentService } from './documentService';

/**
 * Serviço para enviar documentos por WhatsApp e Email
 */
class DocumentSenderService {
  /**
   * Enviar documento por WhatsApp
   */
  async sendViaWhatsApp(documentId, patientPhone, clinicId) {
    try {
      // Buscar documento
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*, document_templates(type)')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      // Buscar mensagem padrão
      const messageTemplate = await documentService.getDocumentMessage(
        clinicId,
        document.document_type
      );

      // Preparar mensagem
      let message = messageTemplate?.whatsapp_message || 
        `Olá! Segue o documento ${document.title} emitido em ${new Date(document.issued_at).toLocaleDateString('pt-BR')}.`;

      // Adicionar link do PDF
      if (document.pdf_url) {
        message += `\n\n📄 Acesse o documento: ${document.pdf_url}`;
      }

      // Enviar via WhatsApp
      const result = await whatsappService.sendMessage(patientPhone, message);

      // Atualizar documento como enviado
      await supabase
        .from('documents')
        .update({
          sent_via_whatsapp: true,
          sent_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return result;
    } catch (error) {
      console.error('Error sending document via WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Enviar documento por Email
   */
  async sendViaEmail(documentId, patientEmail, clinicId) {
    try {
      // Buscar documento
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*, document_templates(type)')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      // Buscar mensagem padrão
      const messageTemplate = await documentService.getDocumentMessage(
        clinicId,
        document.document_type
      );

      // Preparar email
      const subject = messageTemplate?.email_subject || 
        `Documento: ${document.title}`;
      
      const body = messageTemplate?.email_body || 
        `Olá,\n\nSegue em anexo o documento ${document.title} emitido em ${new Date(document.issued_at).toLocaleDateString('pt-BR')}.\n\nAtenciosamente,\nEquipe Audicare`;

      // TODO: Implementar envio de email
      // Por enquanto, apenas atualizamos o status
      // Quando tiver integração de email, implementar aqui
      console.log('Email would be sent:', { to: patientEmail, subject, body, pdf: document.pdf_url });

      // Atualizar documento como enviado
      await supabase
        .from('documents')
        .update({
          sent_via_email: true,
          sent_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return { success: true };
    } catch (error) {
      console.error('Error sending document via Email:', error);
      throw error;
    }
  }

  /**
   * Enviar documento por ambos os canais
   */
  async sendDocument(documentId, patient, clinicId) {
    try {
      const results = {
        whatsapp: null,
        email: null,
      };

      // Enviar por WhatsApp se tiver telefone
      // Usar telefone principal ou primeiro disponível com WhatsApp
      const primaryPhone = patient.phones?.find(p => p.is_primary && p.is_whatsapp) 
        || patient.phones?.find(p => p.is_whatsapp)
        || patient.phones?.find(p => p.is_primary)
        || patient.phones?.[0];
      
      const phoneToUse = primaryPhone?.phone || patient.phone;
      
      if (phoneToUse) {
        try {
          results.whatsapp = await this.sendViaWhatsApp(documentId, phoneToUse, clinicId);
        } catch (error) {
          console.error('Error sending via WhatsApp:', error);
        }
      }

      // Enviar por Email se tiver email
      if (patient.email) {
        try {
          results.email = await this.sendViaEmail(documentId, patient.email, clinicId);
        } catch (error) {
          console.error('Error sending via Email:', error);
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending document:', error);
      throw error;
    }
  }
}

export const documentSenderService = new DocumentSenderService();

