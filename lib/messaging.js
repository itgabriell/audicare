import { supabase, getClinicId } from '@/database';

// 1) Encaminhar mensagem para outra conversa
export async function forwardMessage({ sourceMessageId, targetConversationId }) {
  const clinicId = await getClinicId();

  const { data: msg, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', sourceMessageId)
    .single();

  if (error || !msg) {
    throw error || new Error('Mensagem não encontrada');
  }

  const { data: targetConv, error: convError } = await supabase
    .from('conversations')
    .select('id, contact_id, clinic_id')
    .eq('id', targetConversationId)
    .single();

  if (convError || !targetConv) {
    throw convError || new Error('Conversa destino não encontrada');
  }

  const { data: newMsg, error: insertError } = await supabase
    .from('messages')
    .insert({
      clinic_id: clinicId || targetConv.clinic_id,
      conversation_id: targetConv.id,
      contact_id: targetConv.contact_id,
      content: msg.content,
      message_type: msg.message_type,
      media_url: msg.media_url,
      media_mime_type: msg.media_mime_type,
      wa_media_id: msg.wa_media_id,
      direction: 'outbound',
      status: 'pending',
      sender_type: 'user',
      momment: Date.now(),
    })
    .select('*')
    .single();

  if (insertError) throw insertError;

  // dispara edge function de envio
  try {
    await fetch('/functions/v1/send-whatsapp-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: newMsg.id }),
    });
  } catch (err) {
    console.error('[forwardMessage] Erro ao chamar função de envio:', err);
  }

  return newMsg;
}

// 2) Atualizar estágio CRM do lead (campo notes ou crm_stage, ajuste se tiver coluna própria)
export async function updateLeadStage(contactId, newStage) {
  const { error } = await supabase
    .from('contacts')
    .update({
      notes: newStage, // se tiver coluna crm_stage, troque aqui
      updated_at: new Date().toISOString(),
    })
    .eq('id', contactId);

  if (error) throw error;
}

// 3) Criar agendamento a partir da Inbox
// Assumindo tabela appointments simples; ajuste nomes de colunas conforme seu schema real.
export async function createAppointment({
  contactId,
  clinicId,
  startAt,       // Date ou string ISO
  professionalId,
  type,          // ex: 'Avaliação', 'Retorno'
  notes,
}) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      clinic_id: clinicId || (await getClinicId()),
      contact_id: contactId,
      start_at: startAt,
      professional_id: professionalId,
      type,
      notes,
      status: 'scheduled',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}