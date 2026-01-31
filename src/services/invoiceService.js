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
    static async emitInvoice({ patient, serviceItem, amount, type }) {
        try {
            // Validar parâmetros obrigatórios
            if (!patient || !serviceItem || !amount) {
                throw new Error('Parâmetros obrigatórios não fornecidos: patient, serviceItem, amount');
            }

            // Montar payload conforme esperado pela Edge Function
            const payload = {
                type,
                paciente: {
                    patient_id: patient.id,
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
                    service_description: serviceItem.description || serviceItem.name,
                    amount: parseFloat(amount)
                }
            };



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
    static async saveInvoiceRecord(emissionResult, params) {
        const { patient, amount, type, description, paymentMethod, installments, model, quantity } = params;
        const { invoice } = emissionResult;

        // 1. Salvar na tabela invoices
        const invoiceRecord = {
            patient_id: patient.id,
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

        // 2. Salvar em documentos
        const documentRecord = {
            patient_id: patient.id,
            title: `Nota Fiscal ${invoice.numero}`,
            type: 'invoice',
            content: {
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

        // 3. Aplicar tag "comprou" se for venda
        if (type === 'sale') {
            await supabase.from('patient_tags').upsert({
                patient_id: patient.id,
                tag: 'comprou',
                created_at: new Date().toISOString()
            }, { onConflict: 'patient_id,tag' });
        }
    }
}
