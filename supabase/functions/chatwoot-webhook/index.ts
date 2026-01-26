// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DEFAULT_CLINIC_ID = Deno.env.get('DEFAULT_CLINIC_ID') 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Mapeamento de etiquetas do Chatwoot para status do CRM
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
    console.log("📨 Webhook recebido! Iniciando processamento...")

    if (!DEFAULT_CLINIC_ID) {
        console.error("❌ ERRO CRÍTICO: DEFAULT_CLINIC_ID não configurado nos Secrets!")
        return new Response(JSON.stringify({ error: "Configuration missing" }), { status: 500 })
    }

    const payload = await req.json()
    const { event, conversation, message_type, content } = payload 

    console.log(`🔍 Evento: ${event}, Tipo Mensagem: ${message_type}`)

    // Tenta extrair telefone de várias formas possíveis
    let phone = conversation?.meta?.sender?.phone_number?.replace('+', '') 
             || conversation?.contact_inbox?.source_id?.replace('+', '')
             || payload.sender?.phone_number?.replace('+', '');

    if (!phone) {
      console.warn("⚠️ Ignorado: Telefone não encontrado no payload.")
      return new Response(JSON.stringify({ ignored: 'Sem telefone' }), { status: 200 })
    }

    console.log(`📱 Telefone identificado: ${phone}`)

    // --- 1. MUDANÇA DE ETIQUETA ---
    if (event === 'conversation_updated' && payload.labels) {
      console.log(`🏷️ Atualização de etiquetas detectada:`, payload.labels)
      let newStatus = null;
      for (const label of payload.labels) {
        const normalizedLabel = label.toLowerCase().trim();
        if (LABEL_TO_STATUS_MAP[normalizedLabel]) {
          newStatus = LABEL_TO_STATUS_MAP[normalizedLabel];
          break; 
        }
      }

      if (newStatus) {
        const { error } = await supabase
          .from('leads')
          .update({ status: newStatus, last_activity_at: new Date().toISOString() })
          .eq('phone', phone);
        
        if (error) console.error("❌ Erro ao atualizar etiqueta no DB:", error)
        else console.log(`✅ Status atualizado para: ${newStatus}`)
      }
    }

    // --- 2. MENSAGENS ---
    if (event === 'message_created') {
      
      // -- VERIFICA SE JÁ É PACIENTE --
      // Se for paciente, não criamos lead (ou criamos? Depende da regra de negócio).
      // Por enquanto, vamos logar se achou.
      const { data: patient, error: patientError } = await supabase.from('patients').select('id, name').eq('phone', phone).maybeSingle()
      
      if (patientError) console.error("❌ Erro ao buscar paciente:", patientError)
      
      if (patient) {
        console.log(`👤 Identificado como Paciente já cadastrado: ${patient.name} (ID: ${patient.id}). Ignorando criação de Lead.`)
        // Se quiser que apareça no CRM mesmo sendo paciente, remova a linha abaixo
        return new Response(JSON.stringify({ status: 'is_patient', patient_id: patient.id }), { status: 200 })
      } else {
        console.log("👤 Não é paciente cadastrado. Verificando tabela de Leads...")
      }

      // INCOMING (Cliente enviou)
      if (message_type === 'incoming') {
        const { data: lead, error: leadError } = await supabase.from('leads').select('id, status').eq('phone', phone).maybeSingle()

        if (leadError) console.error("❌ Erro ao buscar lead:", leadError)

        if (lead) {
          console.log(`🔄 Lead existente encontrado (ID: ${lead.id}). Atualizando...`)
          
          const updates: any = {
            last_message_at: new Date().toISOString(),
            last_message_content: content,
            last_message_type: 'incoming',
            chatwoot_conversation_id: conversation.id
          }
          
          if (['stopped_responding', 'new', 'scheduled', 'no_show'].includes(lead.status)) {
             updates.status = 'in_conversation';
             console.log("♻️ Lead reativado para 'in_conversation'")
          }

          const { error: updateError } = await supabase.from('leads').update(updates).eq('id', lead.id);
          if (updateError) console.error("❌ Erro no UPDATE do Lead:", updateError)
          else console.log("✅ Lead atualizado com sucesso!")

          // Notificação Interna
          await supabase.from('notifications').insert({
               clinic_id: DEFAULT_CLINIC_ID,
               title: `Nova mensagem de ${conversation.meta?.sender?.name || phone}`,
               message: content ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : 'Enviou um anexo/áudio',
               type: 'message',
               link: `/crm`,
               related_entity_type: 'lead',
               related_entity_id: lead.id,
               is_read: false,
               created_at: new Date().toISOString()
          });

        } else {
          console.log(`✨ Novo Lead detectado! Criando registro...`)
          
          const newLead = {
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
            last_message_type: 'incoming',
            created_at: new Date().toISOString()
          };

          const { data: createdLead, error: insertError } = await supabase.from('leads').insert(newLead).select().single()
          
          if (insertError) {
             console.error("❌ Erro CRÍTICO ao INSERIR Lead:", insertError)
             console.log("Payload tentado:", newLead)
          } else {
             console.log(`🎉 Lead criado com sucesso! ID: ${createdLead.id}`)
          }
        }
      }
      
      // OUTGOING (Nós enviamos)
      else if (message_type === 'outgoing') {
        const { data: lead } = await supabase.from('leads').select('*').eq('phone', phone).maybeSingle()
        if (lead) {
          console.log(`📤 Atualizando Lead (ID: ${lead.id}) com mensagem enviada.`)
          const now = new Date()
          const updates: any = { 
              last_message_content: `Você: ${content}`,
              last_message_at: now.toISOString(),
              last_message_type: 'outgoing'
          }

          if (lead.status === 'new') {
            updates.status = 'in_conversation'
            updates.first_response_at = now.toISOString()
            if (lead.last_message_at) {
              const diff = Math.floor((now.getTime() - new Date(lead.last_message_at).getTime()) / 1000)
              updates.response_time_seconds = diff
            }
          }
          await supabase.from('leads').update(updates).eq('id', lead.id)
          console.log("✅ Lead outgoing atualizado.")
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('🚨 EXCEÇÃO NÃO TRATADA:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})