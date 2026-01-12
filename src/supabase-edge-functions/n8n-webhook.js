import { corsHeaders } from './cors.ts';
import { supabase } from './_lib/supabaseClient.ts';

const log = (message, data) => console.log(`[n8n-webhook] ${message}`, data ? JSON.stringify(data, null, 2) : '');

async function findOrCreateContact(clinicId, contactData) {
  log('Finding or creating contact', { clinicId, phone: contactData.phone });

  const upsertData = {
    clinic_id: clinicId,
    phone: contactData.phone,
    name: contactData.name || 'Nome Desconhecido',
    avatar_url: contactData.avatar_url,
    channel_type: contactData.channel_type || 'whatsapp',
    status: 'active'
  };

  log('Attempting to upsert contact with data:', upsertData);

  const { data: contact, error } = await supabase
    .from('contacts')
    .upsert(upsertData, {
      onConflict: 'clinic_id,phone',
      ignoreDuplicates: false // We want the data back
    })
    .select()
    .single();

  if (error) {
    console.error('[n8n-webhook] Error upserting contact:', error);
    throw new Error(`Failed to find or create contact: ${error.message}`);
  }

  log('Contact upserted successfully', contact);
  return contact;
}


async function findOrCreateConversation(clinicId, contactId, channelType) {
    log('Finding or creating conversation', { clinicId, contactId });
    
    // Primeiro, tentar buscar conversa existente
    const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('contact_id', contactId)
        .maybeSingle();
    
    if (findError && findError.code !== 'PGRST116') {
        throw new Error(`Failed to find conversation: ${findError.message}`);
    }
    
    if (existing) {
        log('Conversation found', existing);
        return existing;
    }
    
    // Se não existe, criar nova
    const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
            clinic_id: clinicId,
            contact_id: contactId,
            status: 'open',
            channel_type: channelType
        })
        .select()
        .single();
    
    if (createError) {
        // Se der erro de constraint única, tentar buscar novamente (pode ter sido criado por outro processo)
        if (createError.code === '23505') {
            const { data: retry, error: retryError } = await supabase
                .from('conversations')
                .select('*')
                .eq('clinic_id', clinicId)
                .eq('contact_id', contactId)
                .maybeSingle();
            
            if (retryError) throw new Error(`Failed to find or create conversation: ${retryError.message}`);
            if (retry) {
                log('Conversation found after retry (race condition)', retry);
                return retry;
            }
        }
        throw new Error(`Failed to create conversation: ${createError.message}`);
    }
    
    log('Conversation created', newConv);
    return newConv;
}

async function insertMessage(clinicId, contactId, conversationId, messageData) {
    log('Inserting message', { conversationId, sender: messageData.sender_type });
    const messagePayload = {
        clinic_id: clinicId,
        contact_id: contactId,
        conversation_id: conversationId,
        sender_type: 'contact',
        content: messageData.content,
        media_url: messageData.media_url,
        message_type: messageData.message_type,
        status: 'delivered',
        raw_event: messageData.raw_event
    };
    
    const { data, error } = await supabase.from('messages').insert(messagePayload).select().single();
    if (error) throw new Error(`Failed to insert message: ${error.message}`);
    log('Message inserted successfully', data);
    return data;
}

// eslint-disable-next-line no-undef
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        log('Received payload', body);

        const { clinic_id, contact, message, channel } = body;
        if (!clinic_id || !contact || !message) {
            return new Response(JSON.stringify({ error: 'Missing required fields: clinic_id, contact, message' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        
        contact.channel_type = channel;

        const contactRecord = await findOrCreateContact(clinic_id, contact);
        const conversationRecord = await findOrCreateConversation(clinic_id, contactRecord.id, channel);
        const messageRecord = await insertMessage(clinic_id, contactRecord.id, conversationRecord.id, message);

        return new Response(JSON.stringify({ success: true, messageId: messageRecord.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('[n8n-webhook] Unhandled error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});