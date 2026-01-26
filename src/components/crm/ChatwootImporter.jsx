import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { chatwootService } from '@/services/chatwootService'; // Importando seu serviço
import { supabase } from '@/lib/customSupabaseClient'; // Importando Supabase direto

const ChatwootImporter = ({ onImportComplete }) => {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!confirm('Isso vai buscar conversas recentes do Chatwoot e criar Leads. Continuar?')) return;
    
    setLoading(true);
    setLog(['Iniciando importação...']);

    try {
      // 1. Buscar contatos do Chatwoot (Gambiarra inteligente: buscamos conversas recentes)
      // Como a API de lista de contatos do Chatwoot pode ser paginada, vamos usar a API da sua instância axios
      // que já está autenticada no chatwootService.
      
      const accountId = chatwootService.accountId; // Pega do serviço configurado
      
      // Busca conversas recentes (últimas 100 deve cobrir o fds)
      const response = await chatwootService.api.get(`/api/v1/accounts/${accountId}/conversations?status=all&sort_by=last_activity_at`);
      const conversations = response.data.data.payload; // Chatwoot retorna assim

      setLog(prev => [...prev, `Encontradas ${conversations.length} conversas recentes.`]);

      let importedCount = 0;

      for (const conv of conversations) {
        const contact = conv.meta.sender;
        const phone = contact.phone_number?.replace('+', '');
        
        // Filtra só de sexta pra cá (23/01)
        const lastActivity = new Date(conv.last_activity_at * 1000); // Chatwoot usa timestamp unix
        const cutoffDate = new Date('2026-01-23T00:00:00');

        if (lastActivity < cutoffDate) continue; // Pula antigos
        if (!phone) continue; // Pula sem telefone

        // Verifica se já existe no Leads
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();

        // Verifica se já é Paciente (opcional, mas bom pra não duplicar)
        const { data: existingPatient } = await supabase
          .from('patients')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();

        if (!existingLead && !existingPatient) {
          // É NOVO! Vamos criar.
          const { error } = await supabase.from('leads').insert({
            name: contact.name || `Lead ${phone}`,
            phone: phone,
            status: 'new', // Entra como novo
            source: 'whatsapp',
            channel: 'chatwoot_import',
            created_at: new Date(conv.created_at * 1000).toISOString(),
            last_message_at: new Date(conv.last_activity_at * 1000).toISOString(),
            // Importante: Pegar o ID da clínica do seu .env ou hardcoded se precisar
            clinic_id: 'b82d5019-c04c-47f6-b9f9-673ca736815b' // SEU ID DA CLÍNICA (que pegamos no erro anterior)
          });

          if (!error) {
            importedCount++;
            setLog(prev => [...prev, `✅ Importado: ${contact.name}`]);
          } else {
            console.error('Erro ao salvar lead', error);
          }
        } else {
           // setLog(prev => [...prev, `⏩ Pulo: ${contact.name} (Já existe)`]);
        }
      }

      toast({ title: 'Importação Concluída', description: `${importedCount} leads importados.` });
      onImportComplete(); // Atualiza a tela do pai

    } catch (error) {
      console.error(error);
      setLog(prev => [...prev, `❌ Erro fatal: ${error.message}`]);
      toast({ title: 'Erro', description: 'Falha na importação', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded bg-gray-50 mb-4">
      <h4 className="font-bold mb-2">Ferramenta de Resgate ⛑️</h4>
      <Button onClick={handleImport} disabled={loading}>
        {loading ? 'Importando...' : 'Buscar Leads Perdidos do Chatwoot'}
      </Button>
      <div className="mt-2 max-h-40 overflow-y-auto text-xs font-mono bg-white p-2 border">
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
};

export default ChatwootImporter;