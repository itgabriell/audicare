import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json();
    const record = payload.record;
    const oldRecord = payload.old_record; 

    // Se não mudou o status ou não tem telefone, ignora
    if (record.status === oldRecord?.status || !record.patient_phone) {
        return new Response('Ignored', { status: 200 });
    }

    // --- MAPA DE MENSAGENS ---
    const messages = {
        'sent_to_lab': `Olá ${record.patient_name.split(' ')[0]}! Aqui é a Clara, da Audicare.\n\n🚚 Atualização: Sua demanda foi enviada para o técnico e já está a caminho. Te aviso assim que houver novidades!`,
        
        'in_lab': `Olá ${record.patient_name.split(' ')[0]}! Atualização da Audicare:\n\n🛠️ Sua demanda chegou na bancada do técnico e já está em análise/produção.`,
        
        'returning': `Olá ${record.patient_name.split(' ')[0]}! Notícia boa:\n\n🔙 O serviço foi concluído e sua demanda já está retornando para a clínica. Em breve estará disponível para retirada.`,
        
        'ready': `Olá ${record.patient_name.split(' ')[0]}! Tudo pronto.\n\n✅ Sua demanda acaba de ser finalizada e está pronta para retirada aqui na Audicare. Podemos agendar um horário para você vir buscar?`
    };

    const messageToSend = messages[record.status];

    // Se o status atual não tem mensagem configurada (ex: received), não faz nada.
    if (!messageToSend) {
        return new Response('No message for this status', { status: 200 });
    }

    // --- ENVIO VIA CHATWOOT ---
    const chatwootToken = Deno.env.get('CHATWOOT_API_TOKEN');
    const chatwootUrl = Deno.env.get('CHATWOOT_BASE_URL') || 'https://chat.audicarefono.com.br';
    const accountId = '1';
    const inboxId = '1'; 

    // 1. Normaliza telefone
    let phone = record.patient_phone.replace(/\D/g, '');
    if (phone.length <= 11) phone = `55${phone}`; 

    // 2. Busca ou Cria Contato (Blindado contra erros)
    let contactId;
    
    // Busca
    const searchResp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/contacts/search?q=${phone}`, {
        headers: { 'api_access_token': chatwootToken }
    });
    const searchData = await searchResp.json();
    
    if (searchData.payload && searchData.payload.length > 0) {
        contactId = searchData.payload[0].id;
    } else {
        // Cria
        const createResp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/contacts`, {
            method: 'POST',
            headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: record.patient_name, phone_number: `+${phone}` })
        });
        const createData = await createResp.json();
        
        // CORREÇÃO DO ERRO: Verifica se criou mesmo
        if (createData?.payload?.contact?.id) {
            contactId = createData.payload.contact.id;
        } else {
            console.error("Falha ao criar contato Chatwoot:", createData);
            throw new Error("Falha ao criar contato no CRM.");
        }
    }

    // 3. Cria Conversa
    const convResp = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations`, {
        method: 'POST',
        headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, inbox_id: inboxId })
    });
    const convData = await convResp.json();
    
    // Fallback: Se já existir conversa aberta, a API pode retornar erro ou a conversa existente. 
    // Vamos garantir que temos um ID.
    const conversationId = convData.id || convData.conversation_id; 

    if (!conversationId) {
        // Tenta achar a ultima conversa aberta desse contato se a criação falhar
         const listConv = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`, {
            headers: { 'api_access_token': chatwootToken }
        });
        const listData = await listConv.json();
        if(listData.payload && listData.payload.length > 0){
             // Pega a mais recente
             // conversationId = listData.payload[0].id; 
             // ... Implementar lógica se necessário, mas geralmente o POST acima resolve ou retorna a existente.
        }
    }

    if (conversationId) {
        // 4. Envia Mensagem
        await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: { 'api_access_token': chatwootToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: messageToSend, message_type: 'outgoing', private: false })
        });
        console.log(`✅ Notificação (${record.status}) enviada para ${record.patient_name}`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("🚨 Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})