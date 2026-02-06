import { supabase } from '@/database.js';

export class InvoiceService {
    /**
     * Emite nota fiscal através da Edge Function do Supabase
     * @param {Object} params - Parâmetros da emissão
     * @param {Object} params.patient - Dados do paciente
     * @param {Object} params.serviceItem - Dados do serviço/produto
     * @param {number} params.amount - Valor da nota
     * @param {string} params.type - Tipo da nota: 'fono', 'maintenance', 'sale'
     * @returns {Promise<Object>} Resultado da emissão
     */
    static async emitInvoice({ patient, serviceItem, amount, type, model, quantity, paymentMethod, installments }) {
        try {
            // Validar parâmetros obrigatórios
            if (!patient || !serviceItem || !amount) {
                throw new Error('Parâmetros obrigatórios não fornecidos: patient, serviceItem, amount');
            }

            // Validar/Sanitizar Quantidade
            let safeQuantity = parseInt(quantity);
            if (isNaN(safeQuantity) || safeQuantity <= 0) safeQuantity = 1;

            console.log("💰 Dados de Pagamento:", { paymentMethod, installments, amount });

            // Montar payload conforme esperado pela Edge Function
            const payload = {
                type,
                paciente: {
                    patient_name: patient.name || patient.full_name,
                    patient_document: patient.document || patient.cpf,
                    patient_email: patient.email,
                    address: {
                        zip_code: patient.zip_code || patient.cep,
                        street: patient.street || patient.rua,
                        number: patient.number || patient.numero,
                        neighborhood: patient.neighborhood || patient.bairro,
                        city: patient.city || patient.cidade,
                        state: patient.state || patient.estado
                    }
                },
                servico: {
                    service_description: serviceItem.description || serviceItem.name, // Fallback visual
                    amount: parseFloat(amount),
                    quantity: safeQuantity,
                    model: model || serviceItem.description || "Serviço Fonoaudiologia" // Garante que model nunca vá vazio
                },
                payment: { // Enviando dados de pagamento para completar o registro
                    method: paymentMethod,
                    installments: installments
                }
            };

            console.log("📤 Payload Enviado para Edge Function:", JSON.stringify(payload, null, 2));

            // Chamar Edge Function
            const { data, error } = await supabase.functions.invoke('emit-invoice', {
                body: payload
            });

            if (error) {
                console.error('Erro na Edge Function:', error);
                throw new Error(error.message || 'Erro na emissão da nota fiscal');
            }

            if (!data || !data.success) {
                console.error('Resposta inválida da Edge Function:', data);
                throw new Error(data?.error || 'Falha na emissão da nota fiscal');
            }



            return {
                success: true,
                invoice: data.invoice,
                message: 'Nota fiscal emitida com sucesso'
            };

        } catch (error) {
            console.error('Erro ao emitir nota fiscal:', error);
            return {
                success: false,
                error: error.message,
                message: 'Erro ao emitir nota fiscal'
            };
        }
    }

    /**
     * Salva o registro da nota fiscal no banco de dados local (Supabase)
     * e cria os registros relacionados (Documentos, Tags)
     * @param {Object} emissionResult - Resultado da emissão (da Edge Function)
     * @param {Object} params - Dados originais do formulário
     * @returns {Promise<void>}
     */
    async saveInvoiceRecord(emissionResult, params) {
        const { patient, amount, type, description, paymentMethod, installments, model, quantity } = params;
        const { invoice } = emissionResult;

        const CLINIC_ID = 'b82d5019-c04c-47f6-b9f9-673ca736815b'; // ID fixo da Audicare

        // 1. Salvar na tabela invoices
        const invoiceRecord = {
            patient_id: patient.id,
            clinic_id: CLINIC_ID,
            type,
            amount: parseFloat(amount),
            description,
            payment_method: paymentMethod,
            installments: parseInt(installments || 1),
            model,
            quantity: parseInt(quantity || 1),
            status: 'authorized',
            issued_at: new Date().toISOString(),
            numero: invoice.numero,
            link: invoice.link,
            created_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase.from('invoices').insert(invoiceRecord);
        if (insertError) {
            console.error('Erro ao salvar invoice:', insertError);
            throw new Error('Nota emitida, mas erro ao salvar registro local.');
        }

        // 2. Salvar em documentos (Removido campo 'type' que não existe no schema)
        const documentRecord = {
            patient_id: patient.id,
            title: `Nota Fiscal ${invoice.numero}`,
            // type: 'invoice', // REMOVIDO: Coluna não existe
            content: {
                document_type: 'invoice', // Movido para JSONB
                invoice_number: invoice.numero,
                type,
                amount: parseFloat(amount),
                description,
                payment_method: paymentMethod,
                installments: parseInt(installments || 1),
                model,
                quantity: parseInt(quantity || 1),
                patient_name: patient.name,
                patient_document: patient.document || patient.cpf,
                issue_date: new Date().toISOString()
            },
            file_url: invoice.link,
            created_at: new Date().toISOString()
        };

        await supabase.from('documents').insert(documentRecord);

        // 3. Aplicar tag "comprou" (Check manual em vez de upsert para evitar erro de constraint)
        if (type === 'sale') {
            try {
                const { data: existingTag } = await supabase
                    .from('patient_tags')
                    .select('id')
                    .eq('patient_id', patient.id)
                    .eq('tag', 'comprou')
                    .maybeSingle();

                if (!existingTag) {
                    await supabase.from('patient_tags').insert({
                        patient_id: patient.id,
                        tag: 'comprou',
                        created_at: new Date().toISOString()
                    });
                }
            } catch (tagErr) {
                console.warn("Erro ao aplicar tag (não crítico):", tagErr);
            }
        }
    }
}
