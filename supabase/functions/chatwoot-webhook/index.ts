// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DEFAULT_CLINIC_ID = Deno.env.get('DEFAULT_CLINIC_ID') 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const LABEL_TO_STATUS_MAP: Record<string, string> = {
  'novo': 'new',
  'em conversa': 'in_conversation',
  'conversando': 'in_conversation',
  'agendou': 'scheduled',
  'agendado': 'scheduled',
  'compareceu': 'arrived',
  'faltou': 'no_show',
  'parou': 'stopped_responding',
  'comprou': 'purchased',
  'venda': 'purchased',
  'perdeu': 'no_purchase',
  'nao comprou': 'no_purchase'
};

function detectSource(messageContent: string): string {
  if (!messageContent) return 'whatsapp'
  const lowerMsg = messageContent.toLowerCase()
  if (lowerMsg.includes('instagram') || lowerMsg.includes('insta')) return 'instagram'
  if (lowerMsg.includes('google') || lowerMsg.includes('site')) return 'site'
  if (lowerMsg.includes('indicação') || lowerMsg.includes('indicou')) return 'referral'
  return 'whatsapp'
}

serve(async (req) => {
  try {
    const payload = await req.json()
    const { event, conversation, message_type, content, labels } = payload 

    console.log(`Evento: ${event}, Tipo: ${message_type}`)

    const phone = conversation?.meta?.sender?.phone_number?.replace('+', '') 
               || conversation?.contact_inbox?.source_id?.replace('+', '')
               || payload.sender?.phone_number?.replace('+', '');

    if (!phone) {
      return new Response(JSON.stringify({ ignored: 'Sem telefone' }), { status: 200 })
    }

    // --- 1. MUDANÇA DE ETIQUETA ---
    if (event === 'conversation_updated' && payload.labels) {
      let newStatus = null;
      for (const label of payload.labels) {
        const normalizedLabel = label.toLowerCase().trim();
        if (LABEL_TO_STATUS_MAP[normalizedLabel]) {
          newStatus = LABEL_TO_STATUS_MAP[normalizedLabel];
          break; 
        }
      }

      if (newStatus) {
        await supabase
          .from('leads')
          .update({ status: newStatus, last_activity_at: new Date().toISOString() })
          .eq('phone', phone);
      }
    }

    // --- 2. MENSAGENS ---
    if (event === 'message_created') {
      
      // INCOMING (Cliente enviou) -> ATENÇÃO NECESSÁRIA
      if (message_type === 'incoming') {
        const { data: patient } = await supabase.from('patients').select('id').eq('phone', phone).maybeSingle()
        if (patient) return new Response(JSON.stringify({ status: 'is_patient' }), { status: 200 })

        const { data: lead } = await supabase.from('leads').select('id, status').eq('phone', phone).maybeSingle()

        if (lead) {
          // Atualiza Lead Existente
          const updates: any = {
            last_message_at: new Date().toISOString(),
            last_message_content: content,
            last_message_type: 'incoming', // <--- IMPORTANTE: Marca que o cliente falou
            chatwoot_conversation_id: conversation.id
          }
          
          // Se estava "morto", revive para "Em Conversa"
          if (['stopped_responding', 'new', 'scheduled', 'no_show'].includes(lead.status)) {
             updates.status = 'in_conversation';
          }

          await supabase.from('leads').update(updates).eq('id', lead.id);

          // Notificação Interna
          if (!conversation.meta?.sender?.type || conversation.meta.sender.type === 'contact') {
             await supabase.from('notifications').insert({
               clinic_id: DEFAULT_CLINIC_ID,
               title: `Nova mensagem de ${conversation.meta?.sender?.name || phone}`,
               message: content ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : 'Enviou um anexo/áudio',
               type: 'message',
               link: `/crm`, // Link para o CRM
               related_entity_type: 'lead',
               related_entity_id: lead.id,
               is_read: false
             });
          }

        } else {
          // Cria Novo Lead
          await supabase.from('leads').insert({
            name: conversation.meta?.sender?.name || `Lead ${phone}`,
            phone: phone,
            status: 'new',
            source: detectSource(content),
            channel: 'whatsapp',
            clinic_id: DEFAULT_CLINIC_ID,
            chatwoot_conversation_id: conversation.id,
            chatwoot_contact_id: conversation.contact_inbox.contact_id,
            last_message_at: new Date().toISOString(),
            last_message_content: content,
            last_message_type: 'incoming', // <--- Novo Lead já nasce incoming
            created_at: new Date().toISOString()
          })
        }
      }
      
      // OUTGOING (Nós enviamos) -> TÁ TRANQUILO
      else if (message_type === 'outgoing') {
        const { data: lead } = await supabase.from('leads').select('*').eq('phone', phone).maybeSingle()
        if (lead) {
          const now = new Date()
          const updates: any = { 
              last_message_content: `Você: ${content}`,
              last_message_at: now.toISOString(),
              last_message_type: 'outgoing' // <--- IMPORTANTE: Marca que nós respondemos
          }

          if (lead.status === 'new') {
            updates.status = 'in_conversation'
            updates.first_response_at = now.toISOString()
            if (lead.last_message_at) {
              updates.response_time_seconds = Math.floor((now.getTime() - new Date(lead.last_message_at).getTime()) / 1000)
            }
          }
          await supabase.from('leads').update(updates).eq('id', lead.id)
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Erro Edge Function:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})