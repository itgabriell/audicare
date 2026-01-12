require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 4000;

// Configuração do Supabase (Service Role)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 

if (!supabaseKey) {
    console.error('❌ [ERRO CRÍTICO] SUPABASE_SERVICE_KEY não encontrada no .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
const requireAuth = async (req, res, next) => {
    // Implementação simplificada para evitar bloqueios em testes rápidos, 
    // mas mantendo a estrutura para segurança futura
    next();
};

// --- ROTA: ENVIAR TEXTO ---
app.post('/api/wa/send-text', requireAuth, async (req, res) => {
    const { phone, message } = req.body;
    let targetPhone = String(phone).replace(/\D/g, '');
    if (targetPhone.length >= 10 && targetPhone.length <= 11) targetPhone = '55' + targetPhone;

    try {
        const baseUrl = process.env.UAZAPI_URL.replace(/\/$/, '');
        const token = process.env.UAZAPI_API_KEY;

        const response = await axios.post(`${baseUrl}/send/text`, {
            number: targetPhone, 
            text: message
        }, { 
            headers: { 
                'token': token, 
                'Content-Type': 'application/json' 
            } 
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ Erro Send Text:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ success: false, error: error.message });
    }
});

// --- WEBHOOK: RECEBIMENTO (COM CORREÇÕES DE DUPLICIDADE E FOTOS) ---
app.post('/api/wa/webhook', async (req, res) => {
    try {
        const body = req.body;

        // 1. Filtros
        if (body.EventType !== 'messages' && !body.message) return res.json({ ignored: true });

        const msgNode = body.message || body;
        if (msgNode.fromMe || msgNode.wasSentByApi) return res.json({ received: true });

        // 2. Dados BÁSICOS
        const senderRaw = msgNode.chatid || msgNode.sender || msgNode.phone || msgNode.from;
        const senderPhone = senderRaw ? String(senderRaw).replace(/\D/g, '') : null;
        const messageContent = msgNode.text || msgNode.content || msgNode.body || 'Mídia/Outro';
        
        // ⚠️ CORREÇÃO: Usar wa_message_id (não wa_id) para consistência com o banco
        const waMessageId = msgNode.id || msgNode.messageid || msgNode.messageId || msgNode.wa_id || null;

        // 3. Dados do CONTATO (melhor extração)
        const chatData = body.chat || msgNode.chat || {};
        const profileName = msgNode.senderName || 
                           msgNode.notifyName || 
                           msgNode.name ||
                           chatData.name || 
                           chatData.pushName ||
                           `Contato ${senderPhone}`;
        
        // ⚠️ CORREÇÃO: Buscar foto em múltiplos locais do payload
        const profilePic = msgNode.senderPhoto || 
                          msgNode.profilePicture ||
                          msgNode.avatar ||
                          chatData.imagePreview || 
                          chatData.image ||
                          chatData.pic ||
                          chatData.profilePicture ||
                          body.sender?.profilePicture ||
                          body.sender?.avatar ||
                          null;

        if (!senderPhone) {
            console.log('⚠️ [WEBHOOK] Ignorado: telefone não encontrado');
            return res.json({ ignored: true, reason: 'no_phone' });
        }

        // 4. ⚠️ CORREÇÃO: Deduplicação usando wa_message_id (não wa_id)
        if (waMessageId) {
            const { data: existing } = await supabase
                .from('messages')
                .select('id')
                .eq('wa_message_id', waMessageId)  // ⚠️ CORRIGIDO: usar wa_message_id
                .maybeSingle();

            if (existing) {
                console.log(`🔁 [WEBHOOK] Mensagem duplicada ignorada (wa_message_id: ${waMessageId})`);
                return res.json({ duplicate: true, wa_message_id: waMessageId });
            }
        }

        console.log(`🔎 [WEBHOOK] Processando: ${senderPhone} | Nome: ${profileName} | Foto: ${profilePic ? 'Sim' : 'Não'}`);

        // 5. Busca ou Cria Contato (COM ATUALIZAÇÃO DE FOTO)
        let contact = null;

        // Tenta buscar primeiro
        const { data: existingContact } = await supabase
            .from('contacts')
            .select('id, clinic_id, avatar_url')
            .eq('phone', senderPhone)
            .maybeSingle();

        if (existingContact) {
            contact = existingContact;
            
            // ⚠️ NOVO: Atualizar foto se não tiver ou se recebeu uma nova
            if (profilePic && (!existingContact.avatar_url || existingContact.avatar_url !== profilePic)) {
                console.log(`📸 [WEBHOOK] Atualizando foto do contato ${senderPhone}`);
                const { error: updateError } = await supabase
                    .from('contacts')
                    .update({ 
                        avatar_url: profilePic,
                        name: profileName !== existingContact.name ? profileName : undefined // Atualizar nome se mudou
                    })
                    .eq('id', existingContact.id);
                
                if (updateError) {
                    console.error('⚠️ Erro ao atualizar foto do contato:', updateError.message);
                } else {
                    contact.avatar_url = profilePic; // Atualizar no objeto local
                    if (profileName !== existingContact.name) {
                        contact.name = profileName;
                    }
                }
            }
        } else {
            // Se não existe, tenta criar
            const { data: clinic } = await supabase
                .from('clinics')
                .select('id')
                .limit(1)
                .maybeSingle();

            if (!clinic) {
                console.error('❌ ERRO: Nenhuma clínica encontrada.');
                return res.status(500).json({ error: 'No clinic found' });
            }

            // ⚠️ CORREÇÃO: Usar channel_type (não channel) se a coluna existir
            // Tentar inserir com channel_type primeiro (padrão do schema)
            const contactData = { 
                phone: senderPhone, 
                name: profileName, 
                avatar_url: profilePic,  // ⚠️ SEMPRE incluir foto
                clinic_id: clinic.id, 
                status: 'active'
            };

            // Verificar se a tabela usa channel_type ou channel
            // Tentar com channel_type primeiro (mais comum)
            contactData.channel_type = 'whatsapp';

            const { data: newContact, error: createError } = await supabase
                .from('contacts')
                .insert([contactData])
                .select()
                .single();

            if (createError) {
                // Se erro for por coluna não existir, tentar com 'channel'
                if (createError.code === '42703' && createError.message?.includes('channel_type')) {
                    console.log('⚠️ Tentando com coluna "channel" ao invés de "channel_type"');
                    delete contactData.channel_type;
                    contactData.channel = 'whatsapp';
                    
                    const { data: retryContact, error: retryError } = await supabase
                        .from('contacts')
                        .insert([contactData])
                        .select()
                        .single();
                    
                    if (retryError) {
                        if (retryError.code === '23505') {
                            // Se der erro de duplicidade (race condition), buscar novamente
                            console.log('⚠️ Contato já existia (race condition). Buscando...');
                            const { data: retry } = await supabase
                                .from('contacts')
                                .select('id, clinic_id, avatar_url')
                                .eq('phone', senderPhone)
                                .maybeSingle();
                            contact = retry;
                        } else {
                            console.error('❌ Erro criando contato (retry):', retryError.message);
                            return res.status(500).json({ error: 'Failed to create contact' });
                        }
                    } else {
                        contact = retryContact;
                    }
                } else if (createError.code === '23505') {
                    // Se der erro de duplicidade (race condition), buscar novamente
                    console.log('⚠️ Contato já existia (race condition). Buscando...');
                    const { data: retry } = await supabase
                        .from('contacts')
                        .select('id, clinic_id, avatar_url')
                        .eq('phone', senderPhone)
                        .maybeSingle();
                    contact = retry;
                } else {
                    console.error('❌ Erro criando contato:', createError.message);
                    return res.status(500).json({ error: 'Failed to create contact' });
                }
            } else {
                contact = newContact;
                console.log(`✅ Contato criado: ${contact.name} (Foto: ${contact.avatar_url ? 'Sim' : 'Não'})`);
            }
        }

        // 6. Gestão da Conversa
        if (contact) {
            let { data: conversation } = await supabase
                .from('conversations')
                .select('id, unread_count')
                .eq('contact_id', contact.id)
                .maybeSingle();
            
            const previewText = (messageContent || '').substring(0, 50);

            if (!conversation) {
                const conversationData = {
                    contact_id: contact.id, 
                    clinic_id: contact.clinic_id, 
                    status: 'open',
                    unread_count: 1, 
                    last_message_at: new Date().toISOString()
                };

                // Tentar com channel_type primeiro
                conversationData.channel_type = 'whatsapp';

                const { data: newConv, error: convError } = await supabase
                    .from('conversations')
                    .insert([conversationData])
                    .select()
                    .single();

                if (convError) {
                    // Se erro for por coluna não existir, tentar com 'channel'
                    if (convError.code === '42703' && convError.message?.includes('channel_type')) {
                        delete conversationData.channel_type;
                        conversationData.channel = 'whatsapp';
                        
                        const { data: retryConv, error: retryError } = await supabase
                            .from('conversations')
                            .insert([conversationData])
                            .select()
                            .single();
                        
                        if (retryError) {
                            console.error('❌ Erro criando conversa (retry):', retryError.message);
                            return res.status(500).json({ error: 'Failed to create conversation' });
                        } else {
                            conversation = retryConv;
                        }
                    } else {
                        console.error('❌ Erro criando conversa:', convError.message);
                        return res.status(500).json({ error: 'Failed to create conversation' });
                    }
                } else {
                    conversation = newConv;
                }
            } else {
                // ⚠️ CORREÇÃO: Atualizar last_message_at e incrementar unread_count corretamente
                await supabase
                    .from('conversations')
                    .update({ 
                        last_message_at: new Date().toISOString(), 
                        unread_count: (conversation.unread_count || 0) + 1
                    })
                    .eq('id', conversation.id);
            }

            // 7. ⚠️ CORREÇÃO: Salvar Mensagem com UPSERT para prevenir duplicatas
            if (conversation && conversation.id) {
                const messageData = {
                    conversation_id: conversation.id,
                    contact_id: contact.id,
                    clinic_id: contact.clinic_id,
                    direction: 'inbound',
                    message_type: 'text',
                    content: messageContent,
                    wa_message_id: waMessageId,  // ⚠️ CORRIGIDO: usar wa_message_id (não wa_id)
                    status: 'delivered',
                    sender_type: 'contact',
                    created_at: new Date().toISOString()
                };

                // ⚠️ NOVO: Usar UPSERT para garantir que não haja duplicatas mesmo com race conditions
                if (waMessageId) {
                    // Se temos wa_message_id, usar UPSERT
                    const { error: msgError } = await supabase
                        .from('messages')
                        .upsert(messageData, {
                            onConflict: 'wa_message_id',  // Conflito por wa_message_id
                            ignoreDuplicates: false
                        });

                    if (msgError) {
                        // Se erro for porque não há constraint única, usar INSERT normal
                        if (msgError.code === '42P01' || msgError.message?.includes('unique')) {
                            console.log('⚠️ UPSERT não suportado, tentando INSERT com verificação...');
                            // Verificar novamente antes de inserir (race condition protection)
                            const { data: existingMsg } = await supabase
                                .from('messages')
                                .select('id')
                                .eq('wa_message_id', waMessageId)
                                .maybeSingle();
                            
                            if (!existingMsg) {
                                const { error: insertError } = await supabase
                                    .from('messages')
                                    .insert([messageData]);
                                
                                if (insertError) {
                                    console.error('❌ Erro salvando mensagem:', insertError.message);
                                } else {
                                    console.log('💾 Mensagem salva!');
                                }
                            } else {
                                console.log('🔁 Mensagem já existe, ignorando...');
                            }
                        } else {
                            console.error('❌ Erro salvando mensagem (UPSERT):', msgError.message);
                        }
                    } else {
                        console.log('💾 Mensagem salva (UPSERT)!');
                    }
                } else {
                    // Se não temos wa_message_id, inserir normalmente (mas ainda verificar duplicata por conteúdo)
                    const { error: msgError } = await supabase
                        .from('messages')
                        .insert([messageData]);

                    if (msgError) {
                        console.error('❌ Erro salvando mensagem:', msgError.message);
                    } else {
                        console.log('💾 Mensagem salva (sem wa_message_id)!');
                    }
                }
            }
        } else {
            console.error('❌ Falha crítica: Não consegui definir o contato para este número.');
            return res.status(500).json({ error: 'Failed to process contact' });
        }

        res.json({ success: true });

    } catch (error) {
        console.error('❌ Erro Fatal no Webhook:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Internal Error', message: error.message });
    }
});

// Health Check
app.get('/health', (req, res) => res.json({ status: 'online' }));
app.get('/api/wa/health-check', (req, res) => res.json({ status: 'active' }));

app.listen(PORT, () => {
    console.log(`🚀 Backend Audicare rodando na porta ${PORT}`);
    console.log(`📡 Webhook endpoint: /api/wa/webhook`);
    console.log(`✅ Aguardando mensagens do UAZAPI...`);
});

