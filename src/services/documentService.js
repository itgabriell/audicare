import { supabase } from '@/lib/customSupabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Serviço para gerenciar documentos médicos
 */
class DocumentService {
  /**
   * Buscar templates de documentos da clínica
   */
  async getTemplates(clinicId, type = null) {
    try {
      let query = supabase
        .from('document_templates')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('name');

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * Buscar um template específico
   */
  async getTemplate(templateId) {
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  }

  /**
   * Criar ou atualizar template
   */
  async saveTemplate(templateData) {
    try {
      if (templateData.id) {
        const { data, error } = await supabase
          .from('document_templates')
          .update(templateData)
          .eq('id', templateData.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('document_templates')
          .insert([templateData])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  /**
   * Gerar PDF do documento
   */
  async generatePDF(documentData, template, patient, clinic, issuedBy) {
    try {
      // Criar elemento HTML temporário para renderização
      const container = document.createElement('div');
      container.style.width = '210mm'; // A4 width
      container.style.padding = '20mm';
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.backgroundColor = '#ffffff';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);

      // Renderizar cabeçalho
      if (template.header_content) {
        const header = this.renderHeader(template.header_content, clinic);
        container.appendChild(header);
      }

      // Renderizar conteúdo do documento
      const content = this.renderDocumentContent(documentData, template, patient);
      container.appendChild(content);

      // Renderizar rodapé
      if (template.footer_content) {
        const footer = this.renderFooter(template.footer_content, clinic, issuedBy);
        container.appendChild(footer);
      }

      // Converter para canvas e depois para PDF
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(container);

      // Criar PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Adicionar marca d'água se habilitada
      if (template.watermark_enabled) {
        this.addWatermark(pdf, template.watermark_text || 'DOCUMENTO MÉDICO');
      }

      // Adicionar assinatura se habilitada
      if (template.signature_enabled) {
        this.addSignature(pdf, issuedBy, template.signature_position || 'bottom-right');
      }

      return pdf;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Renderizar cabeçalho do documento
   */
  renderHeader(headerContent, clinic) {
    const header = document.createElement('div');
    header.style.marginBottom = '20px';
    header.style.borderBottom = '2px solid #000';
    header.style.paddingBottom = '10px';

    if (headerContent.logo_url) {
      const logo = document.createElement('img');
      logo.src = headerContent.logo_url;
      logo.style.maxHeight = '50px';
      logo.style.marginBottom = '10px';
      header.appendChild(logo);
    }

    const clinicName = document.createElement('h1');
    clinicName.textContent = clinic.name || headerContent.clinic_name;
    clinicName.style.fontSize = '18px';
    clinicName.style.fontWeight = 'bold';
    clinicName.style.marginBottom = '5px';
    header.appendChild(clinicName);

    if (clinic.address) {
      const address = document.createElement('p');
      address.textContent = clinic.address;
      address.style.fontSize = '10px';
      address.style.color = '#666';
      header.appendChild(address);
    }

    return header;
  }

  /**
   * Renderizar conteúdo do documento
   */
  renderDocumentContent(documentData, template, patient) {
    const content = document.createElement('div');
    content.style.marginBottom = '20px';

    // Título do documento
    const title = document.createElement('h2');
    title.textContent = documentData.title || template.name;
    title.style.fontSize = '16px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '15px';
    content.appendChild(title);

    // Dados do paciente
    const patientInfo = document.createElement('div');
    patientInfo.style.marginBottom = '15px';
    patientInfo.style.padding = '10px';
    patientInfo.style.backgroundColor = '#f5f5f5';
    patientInfo.innerHTML = `
      <p><strong>Paciente:</strong> ${patient.name}</p>
      <p><strong>Data de Nascimento:</strong> ${patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
      <p><strong>CPF:</strong> ${patient.cpf || 'N/A'}</p>
      <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
    `;
    content.appendChild(patientInfo);

    // Conteúdo específico do template
    const templateContent = document.createElement('div');
    templateContent.style.marginTop = '15px';
    templateContent.innerHTML = this.replacePlaceholders(
      template.template_content.html || '',
      { ...documentData, patient }
    );
    content.appendChild(templateContent);

    return content;
  }

  /**
   * Renderizar rodapé
   */
  renderFooter(footerContent, clinic, issuedBy) {
    const footer = document.createElement('div');
    footer.style.marginTop = '30px';
    footer.style.paddingTop = '10px';
    footer.style.borderTop = '1px solid #ccc';
    footer.style.fontSize = '9px';
    footer.style.color = '#666';

    if (footerContent.text) {
      footer.innerHTML = footerContent.text;
    } else {
      footer.innerHTML = `
        <p>${clinic.name || ''}</p>
        <p>Emitido por: ${issuedBy?.full_name || 'Sistema'}</p>
        <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
      `;
    }

    return footer;
  }

  /**
   * Substituir placeholders no template
   */
  replacePlaceholders(html, data) {
    let result = html;
    
    // Substituir placeholders {{campo}}
    const placeholders = html.match(/\{\{(\w+)\}\}/g) || [];
    placeholders.forEach(placeholder => {
      const field = placeholder.replace(/[{}]/g, '');
      const value = this.getNestedValue(data, field) || '';
      result = result.replace(placeholder, value);
    });

    return result;
  }

  /**
   * Obter valor aninhado de objeto
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Adicionar marca d'água ao PDF
   */
  addWatermark(pdf, text) {
    const pageCount = pdf.internal.pages.length - 1;
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.saveState();
      pdf.setGState(pdf.GState({ opacity: 0.1 }));
      pdf.setFontSize(50);
      pdf.setTextColor(200, 200, 200);
      pdf.text(text, 105, 150, { angle: 45, align: 'center' });
      pdf.restoreState();
    }
  }

  /**
   * Adicionar assinatura ao PDF
   */
  addSignature(pdf, issuedBy, position = 'bottom-right') {
    const pageCount = pdf.internal.pages.length;
    pdf.setPage(pageCount);
    
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    
    let x, y;
    switch (position) {
      case 'bottom-left':
        x = 20;
        y = 280;
        break;
      case 'bottom-center':
        x = 105;
        y = 280;
        break;
      case 'bottom-right':
      default:
        x = 190;
        y = 280;
        break;
    }

    pdf.text(`Emitido por: ${issuedBy?.full_name || 'Sistema'}`, x, y);
    pdf.text(`CRF: ${issuedBy?.crf || 'N/A'}`, x, y + 5);
    pdf.text(new Date().toLocaleDateString('pt-BR'), x, y + 10);
  }

  /**
   * Salvar documento no banco e storage
   */
  async saveDocument(documentData, pdfBlob, clinicId, patientId, consultationId, issuedBy) {
    try {
      // Upload do PDF para storage
      const fileName = `doc_${Date.now()}_${documentData.template_id || 'custom'}.pdf`;
      const filePath = `${patientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Salvar registro no banco
      const { data, error } = await supabase
        .from('documents')
        .insert([{
          clinic_id: clinicId,
          patient_id: patientId,
          template_id: documentData.template_id,
          consultation_id: consultationId,
          document_type: documentData.type,
          title: documentData.title,
          content: documentData.content,
          pdf_url: publicUrl,
          pdf_storage_path: filePath,
          metadata: documentData.metadata || {},
          issued_by: issuedBy.id,
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }

  /**
   * Buscar documentos de um paciente
   */
  async getPatientDocuments(patientId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          document_templates(name, type),
          profiles!documents_issued_by_fkey(full_name)
        `)
        .eq('patient_id', patientId)
        .order('issued_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching patient documents:', error);
      throw error;
    }
  }

  /**
   * Buscar mensagem padrão para tipo de documento
   */
  async getDocumentMessage(clinicId, documentType) {
    try {
      const { data, error } = await supabase
        .from('document_messages')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('document_type', documentType)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching document message:', error);
      throw error;
    }
  }

  /**
   * Salvar ou atualizar mensagem padrão
   */
  async saveDocumentMessage(messageData) {
    try {
      const { data, error } = await supabase
        .from('document_messages')
        .upsert(messageData, {
          onConflict: 'clinic_id,document_type',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving document message:', error);
      throw error;
    }
  }
}

export const documentService = new DocumentService();

