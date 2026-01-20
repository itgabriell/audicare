require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Importar rotas de webhook
const webhookRoutes = require('./backend/routes/webhookRoutes.cjs');

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

// --- ROTAS DE WEBHOOK CHATWOOT ---
app.use('/webhooks', webhookRoutes);

// --- FUNÇÕES AUXILIARES PARA UPLOAD DE MÍDIAS ---

/**
 * Faz download de arquivo da Uazapi
 * @param {string} mediaUrl - URL da mídia
 * @param {string} token - Token da Uazapi
 * @returns {Promise<{buffer: Buffer, mimeType: string, fileName: string}>}
 */
async function downloadMediaFromUazapi(mediaUrl, token) {
    try {
        console.log('📥 Baixando mídia da Uazapi:', mediaUrl);

        const response = await axios.get(mediaUrl, {
            headers: {
                'token': token,
                'User-Agent': 'Audicare-Backend/1.0'
            },
            responseType: 'arraybuffer',
            timeout: 30000 // 30 segundos timeout
        });

        const buffer = Buffer.from(response.data);
        const mimeType = response.headers['content-type'] || 'application/octet-stream';
        const contentDisposition = response.headers['content-disposition'];

        // Extrair nome do arquivo do header, se disponível
        let fileName = `media_${Date.now()}`;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
                fileName = match[1].replace(/['"]/g, '');
            }
        }

        // Adicionar extensão baseada no mime type
        if (!fileName.includes('.')) {
            const extension = getExtensionFromMimeType(mimeType);
            fileName += extension;
        }

        console.log(`✅ Mídia baixada: ${fileName} (${mimeType}, ${buffer.length} bytes)`);
        return { buffer, mimeType, fileName };

    } catch (error) {
        console.error('❌ Erro ao baixar mídia da Uazapi:', error.message);
        throw error;
    }
}

/**
 * Faz upload de arquivo para Supabase Storage
 * @param {Buffer} buffer - Buffer do arquivo
 * @param {string} fileName - Nome do arquivo
 * @param {string} bucket - Bucket do Supabase Storage ('chat-media' ou 'avatars')
 * @returns {Promise<string>} - URL pública do arquivo
 */
async function uploadToSupabaseStorage(buffer, fileName, bucket) {
    try {
        console.log(`📤 Fazendo upload para ${bucket}: ${fileName}`);

        // Sanitizar nome do arquivo
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${Date.now()}_${sanitizedFileName}`;

        // Caminho completo no bucket
        const filePath = `uploads/${uniqueFileName}`;

        // Upload para Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, buffer, {
                contentType: getMimeTypeFromFileName(fileName),
                upsert: false
            });

        if (error) {
            console.error('❌ Erro no upload para Supabase:', error.message);
            throw error;
        }

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        console.log(`✅ Upload concluído: ${publicUrl}`);
        return publicUrl;

    } catch (error) {
        console.error('❌ Erro no upload para Supabase Storage:', error.message);
        throw error;
    }
}

/**
 * Processa mídia (download + upload) e retorna URL pública
 * @param {string} mediaUrl - URL da mídia da Uazapi
 * @param {string} token - Token da Uazapi
 * @param {string} bucket - Bucket do Supabase ('chat-media' ou 'avatars')
 * @returns {Promise<string|null>} - URL pública ou null se erro
 */
async function processMediaUrl(mediaUrl, token, bucket) {
    try {
        if (!mediaUrl || !mediaUrl.startsWith('http')) {
            console.log('⚠️ URL de mídia inválida ou ausente');
            return null;
        }

        const { buffer, mimeType, fileName } = await downloadMediaFromUazapi(mediaUrl, token);
        const publicUrl = await uploadToSupabaseStorage(buffer, fileName, bucket);

        return publicUrl;
    } catch (error) {
        console.error('❌ Erro ao processar mídia:', error.message);
        return null;
    }
}

/**
 * Obtém extensão de arquivo baseada no mime type
 * @param {string} mimeType - Tipo MIME
 * @returns {string} - Extensão do arquivo
 */
function getExtensionFromMimeType(mimeType) {
    const extensions = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'audio/mpeg': '.mp3',
        'audio/ogg': '.ogg',
        'audio/wav': '.wav',
        'video/mp4': '.mp4',
        'video/quicktime': '.mov',
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'text/plain': '.txt'
    };

    return extensions[mimeType] || '.bin';
}

/**
 * Obtém mime type baseada no nome do arquivo
 * @param {string} fileName - Nome do arquivo
 * @returns {string} - Tipo MIME
 */
function getMimeTypeFromFileName(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain'
    };

    return mimeTypes[ext] || 'application/octet-stream';
}

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

        // 2. Dados BÁSICOS - EXTRAÇÃO CORRETA DO NÚMERO
        // ⚠️ CORREÇÃO CRÍTICA: Priorizar campos que contenham o número real do telefone
        // Evitar chatid que pode ser um ID interno do WhatsApp
        let senderRaw = null;
        let senderPhone = null;

        // Ordem de prioridade para extrair o número correto:
        // 1. phone (campo mais confiável)
        // 2. from (pode conter o número)
        // 3. sender (última opção, pode ser ID)
        // 4. chatid (evitar, pode ser ID interno)

        if (msgNode.phone) {
            senderRaw = msgNode.phone;
            console.log('📱 [WEBHOOK] Usando campo phone:', senderRaw);
        } else if (msgNode.from) {
            senderRaw = msgNode.from;
            console.log('📱 [WEBHOOK] Usando campo from:', senderRaw);
        } else if (msgNode.sender) {
            senderRaw = msgNode.sender;
            console.log('📱 [WEBHOOK] Usando campo sender:', senderRaw);
        } else if (msgNode.chatid) {
            senderRaw = msgNode.chatid;
            console.log('⚠️ [WEBHOOK] Usando campo chatid (pode ser ID interno):', senderRaw);
        }

        if (senderRaw) {
            // Remove caracteres não numéricos
            senderPhone = String(senderRaw).replace(/\D/g, '');

            // ⚠️ DETECÇÃO DE IDs INTERNOS: Se o número tem mais de 15 dígitos, provavelmente é um ID
            if (senderPhone.length > 15) {
                console.log(`🚨 [WEBHOOK] Número suspeito detectado (${senderPhone.length} dígitos): ${senderPhone}`);
                console.log('🔍 [WEBHOOK] Verificando campos alternativos...');

                // Tentar extrair de outros campos
                const alternativeFields = ['remoteJid', 'jid', 'participant', 'author'];
                for (const field of alternativeFields) {
                    if (msgNode[field]) {
                        const altPhone = String(msgNode[field]).replace(/\D/g, '');
                        if (altPhone.length >= 10 && altPhone.length <= 15) {
                            console.log(`✅ [WEBHOOK] Número alternativo encontrado no campo ${field}: ${altPhone}`);
                            senderPhone = altPhone;
                            break;
                        }
                    }
                }

                // Se ainda for muito longo, pode ser um ID de grupo - ignorar
                if (senderPhone.length > 15) {
                    console.log('🚫 [WEBHOOK] Número ainda muito longo, pode ser ID de grupo. Ignorando mensagem.');
                    return res.json({ ignored: true, reason: 'group_or_invalid_id' });
                }
            }
        }

        // ⚠️ CORREÇÃO: Formatação adequada de números de WhatsApp
        if (senderPhone && senderPhone.length >= 10 && senderPhone.length <= 15) {
            // Remove qualquer prefixo internacional duplicado
            if (senderPhone.startsWith('55') && senderPhone.length > 11) {
                // Mantém apenas o número brasileiro: 5511999999999 -> 11999999999
                senderPhone = senderPhone.substring(2);
            }

            // Se o número tem 13 dígitos e começa com 55, remove o 55
            if (senderPhone.length === 13 && senderPhone.startsWith('55')) {
                senderPhone = senderPhone.substring(2);
            }

            // Se o número tem 12 dígitos e começa com 55, remove o 55
            if (senderPhone.length === 12 && senderPhone.startsWith('55')) {
                senderPhone = senderPhone.substring(2);
            }

            // Garante que números brasileiros tenham 11 dígitos (com DDD)
            if (senderPhone.length === 10) {
                // Adiciona 9 na frente se for celular (assume que é)
                senderPhone = senderPhone.substring(0, 2) + '9' + senderPhone.substring(2);
            }

            console.log(`📱 [WEBHOOK] Número final processado: ${senderPhone} (original: ${senderRaw})`);
        } else {
            console.log(`⚠️ [WEBHOOK] Número inválido ou não encontrado: ${senderPhone} (comprimento: ${senderPhone?.length || 0})`);
        }
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

        // --- DETECÇÃO E PROCESSAMENTO DE MÍDIA ---
        let messageType = 'text';
        let mediaUrl = null;
        let processedMediaUrl = null;

        // Verificar se é mensagem de mídia
        const mediaTypes = ['image', 'audio', 'video', 'document', 'sticker'];

        for (const type of mediaTypes) {
            if (msgNode[type] || msgNode[`${type}Message`] || msgNode.type === type) {
                messageType = type;

                // Extrair URL da mídia de vários campos possíveis
                mediaUrl = msgNode[type]?.url ||
                          msgNode[`${type}Message`]?.url ||
                          msgNode.mediaUrl ||
                          msgNode.fileUrl ||
                          msgNode.downloadUrl ||
                          null;

                console.log(`📎 [WEBHOOK] Mídia detectada: ${type} | URL: ${mediaUrl ? 'Encontrada' : 'Não encontrada'}`);
                break;
            }
        }

        // Processar mídia se encontrada
        if (mediaUrl && mediaTypes.includes(messageType)) {
            console.log(`🔄 [WEBHOOK] Processando mídia ${messageType}...`);
            const token = process.env.UAZAPI_API_KEY;
            processedMediaUrl = await processMediaUrl(mediaUrl, token, 'chat-media');

            if (processedMediaUrl) {
                console.log(`✅ [WEBHOOK] Mídia processada com sucesso: ${processedMediaUrl}`);
            } else {
                console.log(`⚠️ [WEBHOOK] Falha ao processar mídia, mantendo URL original`);
            }
        }

        console.log(`🔎 [WEBHOOK] Processando: ${senderPhone} | Tipo: ${messageType} | Nome: ${profileName} | Foto: ${profilePic ? 'Sim' : 'Não'}`);

        // 5. VERIFICAÇÃO DE PACIENTE EXISTENTE E ASSOCIAÇÃO AUTOMÁTICA
        let associatedPatientId = null;

        // ⚠️ NOVO: Verificar se já existe um paciente com este número
        console.log('🔍 [WEBHOOK] Verificando se número já existe como paciente...');

        // Primeiro, verificar na tabela patient_phones (mais específica)
        const { data: existingPatientPhone } = await supabase
            .from('patient_phones')
            .select('patient_id, patients:id,name')
            .eq('phone', senderPhone)
            .eq('is_whatsapp', true)
            .maybeSingle();

        if (existingPatientPhone) {
            associatedPatientId = existingPatientPhone.patient_id;
            console.log(`✅ [WEBHOOK] Paciente encontrado via patient_phones: ${existingPatientPhone.patients?.name} (ID: ${associatedPatientId})`);
        } else {
            // Se não encontrou em patient_phones, verificar na tabela patients usando RPC flexível
            const { data: existingPatient } = await supabase
                .rpc('find_patient_by_phone', {
                    phone_number: senderPhone
                })
                .maybeSingle();

            if (existingPatient) {
                associatedPatientId = existingPatient.id;
                console.log(`✅ [WEBHOOK] Paciente encontrado via RPC find_patient_by_phone: ${existingPatient.name} (ID: ${associatedPatientId})`);

                // ⚠️ BONUS: Adicionar automaticamente aos patient_phones se não existir
                const { error: phoneInsertError } = await supabase
                    .from('patient_phones')
                    .insert({
                        patient_id: existingPatient.id,
                        phone: senderPhone,
                        is_whatsapp: true,
                        phone_type: 'mobile'
                    });

                if (phoneInsertError && phoneInsertError.code !== '23505') { // Ignorar duplicata
                    console.warn('⚠️ Não foi possível adicionar aos patient_phones:', phoneInsertError.message);
                }
            }
        }

        // 6. Busca ou Cria Contato (COM ATUALIZAÇÃO DE FOTO E ASSOCIAÇÃO)
        let contact = null;

        // Tenta buscar primeiro
        const { data: existingContact } = await supabase
            .from('contacts')
            .select('id, clinic_id, avatar_url, patient_id')
            .eq('phone', senderPhone)
            .maybeSingle();

        if (existingContact) {
            contact = existingContact;
            
            // ⚠️ NOVO: Atualizar foto se não tiver ou se recebeu uma nova
            if (profilePic && (!existingContact.avatar_url || existingContact.avatar_url !== profilePic)) {
                console.log(`📸 [WEBHOOK] Processando foto de perfil do contato ${senderPhone}`);

                // Processar foto: download da Uazapi + upload para Supabase
                const token = process.env.UAZAPI_API_KEY;
                const processedAvatarUrl = await processMediaUrl(profilePic, token, 'avatars');

                const finalAvatarUrl = processedAvatarUrl || profilePic; // Usar Supabase se conseguiu processar, senão usar original

                const { error: updateError } = await supabase
                    .from('contacts')
                    .update({
                        avatar_url: finalAvatarUrl,
                        name: profileName !== existingContact.name ? profileName : undefined // Atualizar nome se mudou
                    })
                    .eq('id', existingContact.id);

                if (updateError) {
                    console.error('⚠️ Erro ao atualizar foto do contato:', updateError.message);
                } else {
                    contact.avatar_url = finalAvatarUrl; // Atualizar no objeto local
                    if (profileName !== existingContact.name) {
                        contact.name = profileName;
                    }
                    console.log(`✅ [WEBHOOK] Foto de perfil atualizada: ${finalAvatarUrl}`);
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

            // Processar foto de perfil se existir
            let finalAvatarUrl = profilePic;
            if (profilePic) {
                console.log(`📸 [WEBHOOK] Processando foto de perfil para novo contato ${senderPhone}`);
                const token = process.env.UAZAPI_API_KEY;
                const processedAvatarUrl = await processMediaUrl(profilePic, token, 'avatars');
                finalAvatarUrl = processedAvatarUrl || profilePic; // Usar Supabase se conseguiu processar, senão usar original
                console.log(`✅ [WEBHOOK] Foto de perfil processada: ${finalAvatarUrl}`);
            }

            // ⚠️ CORREÇÃO: Usar channel_type (não channel) se a coluna existir
            // Tentar inserir com channel_type primeiro (padrão do schema)
            const contactData = {
                phone: senderPhone,
                name: profileName,
                avatar_url: finalAvatarUrl,  // ✅ FOTO PROCESSADA
                clinic_id: clinic.id,
                status: 'active',
                patient_id: associatedPatientId  // ⚠️ NOVO: Associar automaticamente ao paciente se encontrado
            };

            if (associatedPatientId) {
                console.log(`🔗 [WEBHOOK] Associando novo contato ao paciente existente (ID: ${associatedPatientId})`);
            }

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
                    message_type: messageType,  // ✅ TIPO CORRETO (text, image, audio, video, document, sticker)
                    content: messageContent,
                    media_url: processedMediaUrl || mediaUrl,  // ✅ URL PÚBLICA DO SUPABASE ou URL original se falhou
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
