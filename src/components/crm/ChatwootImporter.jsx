import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient'; 

const ChatwootImporter = ({ onImportComplete }) => {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!confirm('Isso vai buscar conversas recentes do Chatwoot e criar Leads. Continuar?')) return;
    
    setLoading(true);
    setLog(['Iniciando importação via Proxy...']);

    try {
      // --- MUDANÇA AQUI: Chamamos a Edge Function em vez do Chatwoot direto ---
      const { data: responseData, error: fnError } = await supabase.functions.invoke('chatwoot-import');

      if (fnError) throw new Error(`Erro na função: ${fnError.message}`);
      
      const conversations = responseData.data.payload; 
      
      if (!conversations || !Array.isArray(conversations)) {
          throw new Error("Formato de resposta inválido do Chatwoot");
      }

      setLog(prev => [...prev, `Encontradas ${conversations.length} conversas recentes.`]);

      let importedCount = 0;

      for (const conv of conversations) {
        const contact = conv.meta.sender;
        // Tenta pegar o telefone, removendo formatação
        const phone = contact.phone_number?.replace(/\D/g, '');
        
        // --- FILTRO DE DATA (SEXTA 23/01 PRA CÁ) ---
        const lastActivity = new Date(conv.last_activity_at * 1000); 
        const cutoffDate = new Date('2026-01-23T00:00:00');

        if (lastActivity < cutoffDate) {
            // setLog(prev => [...prev, `⏩ Ignorado (Antigo): ${contact.name}`]);
            continue; 
        }
        
        if (!phone) {
            setLog(prev => [...prev, `⏩ Ignorado (Sem telefone): ${contact.name}`]);
            continue;
        }

        // Verifica se já existe no Leads
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();

        // Verifica se já é Paciente 
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
            status: 'new',
            source: 'whatsapp',
            channel: 'chatwoot_import',
            created_at: new Date(conv.created_at * 1000).toISOString(),
            last_message_at: new Date(conv.last_activity_at * 1000).toISOString(),
            last_message_content: conv.messages?.[0]?.content || "Importado do histórico",
            // ID DA CLÍNICA (O mesmo que você usou no SQL)
            clinic_id: 'b82d5019-c04c-47f6-b9f9-673ca736815b',
            chatwoot_conversation_id: conv.id,
            chatwoot_contact_id: contact.id
          });

          if (!error) {
            importedCount++;
            setLog(prev => [...prev, `✅ Importado: ${contact.name}`]);
          } else {
            console.error('Erro DB', error);
            setLog(prev => [...prev, `❌ Erro ao salvar: ${contact.name}`]);
          }
        } else {
           // setLog(prev => [...prev, `⏩ Já existe: ${contact.name}`]);
        }
      }

      toast({ title: 'Importação Concluída', description: `${importedCount} leads recuperados.` });
      onImportComplete(); 

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
      <h4 className="font-bold mb-2">Ferramenta de Resgate (Proxy) ⛑️</h4>
      <Button onClick={handleImport} disabled={loading}>
        {loading ? 'Buscando...' : 'Buscar Leads Perdidos'}
      </Button>
      <div className="mt-2 max-h-40 overflow-y-auto text-xs font-mono bg-white p-2 border">
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
};

export default ChatwootImporter;