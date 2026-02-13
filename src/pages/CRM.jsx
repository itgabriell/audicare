import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Search, Filter, RefreshCw, MessageSquare, Brain, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import KanbanBoard from '@/components/crm/KanbanBoard';
import ChatwootImporter from '@/components/crm/ChatwootImporter';
import LeadDialog from '@/components/crm/LeadDialog';
import AITrainer from '@/components/crm/AITrainer';
import { getLeads, addLead, updateLead } from '@/database';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { differenceInHours } from 'date-fns';
import BulkRecoveryDialog from '@/components/crm/BulkRecoveryDialog';
import { AutomationService } from '@/services/automationService';

const CRM = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estado para mostrar/esconder o Treinador
  const [showAITrainer, setShowAITrainer] = useState(false);
  const [showImporter, setShowImporter] = useState(false);

  // Bulk Action State
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkActionLeads, setBulkActionLeads] = useState([]);

  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);

  const { toast } = useToast();
  const { user } = useAuth();

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await getLeads();
      setLeads(data || []);
      // Run recovery check after fetching
      runRecoveryAnalysis(data || []);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os leads.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    // Automatic trigger check for CRM automations (Client-side trigger)
    const runAutomations = async () => {
      console.log('[CRM] Checking automations...');
      // 1. Existing Time-based checks (20h/24h)
      const results = await AutomationService.checkTimeBasedTriggers();

      // 2. Intelligent Follow-up (Barrier, Scarcity, Closing)
      const followUpResults = await AutomationService.checkIntelligentFollowUp();

      if (results.movedToRecovery > 0 || results.movedToLost > 0 || followUpResults.stage1 > 0 || followUpResults.stage2 > 0 || followUpResults.stage3 > 0) {
        toast({
          title: "Automações Executadas",
          description: `Recuperação: ${results.movedToRecovery} | Perdidos: ${results.movedToLost} | Follow-ups: ${followUpResults.stage1 + followUpResults.stage2 + followUpResults.stage3}`,
        });
        fetchLeads(); // Refresh logic
      }
    };

    runAutomations();
    // Optional: Interval check every 5 minutes
    const interval = setInterval(runAutomations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // --- RECOVERY LOGIC ---
  const runRecoveryAnalysis = async (currentLeads) => {
    const recoveryScriptSnippet = "Audiometria atualizada?"; // Trecho chave do script final
    const leadsToRecover = currentLeads.filter(lead => {
      // 1. Deve estar em 'in_conversation'
      if (lead.status !== 'in_conversation') return false;

      // 2. Última mensagem deve conter o script (ou parte dele)
      const lastMsg = lead.last_message_content || '';
      if (!lastMsg.includes(recoveryScriptSnippet)) return false;

      // 3. Deve ter passado 24h desde a última mensagem
      if (!lead.last_message_at) return false;
      const hoursSinceLastMsg = differenceInHours(new Date(), new Date(lead.last_message_at));

      return hoursSinceLastMsg >= 24;
    });

    if (leadsToRecover.length > 0) {
      console.log(`[Recovery Analysis] Found ${leadsToRecover.length} leads to recover.`);

      // Auto-move/Suggest logic (Here we auto-move for simplicity as requested, but typically we might ask confirmation)
      // For now, let's just toast about it or auto-update if approved. 
      // The user asked to "encaminhe para uma etapa chamada Recuperar".

      let updatedCount = 0;
      for (const lead of leadsToRecover) {
        try {
          await updateLead(lead.id, { status: 'recovery' });
          updatedCount++;
        } catch (e) {
          console.error(`Failed to move lead ${lead.id} to recovery`, e);
        }
      }

      if (updatedCount > 0) {
        toast({
          title: "Análise de Recuperação",
          description: `${updatedCount} leads foram movidos para 'Recuperar' por falta de resposta.`,
          variant: "default",
          className: "bg-orange-50 border-orange-200 text-orange-800"
        });
        // Refresh local state without refetching all if possible, but fetchLeads is safer
        const updatedLeads = currentLeads.map(l =>
          leadsToRecover.find(r => r.id === l.id) ? { ...l, status: 'recovery' } : l
        );
        setLeads(updatedLeads);
      }
    }
  };

  const handleSaveLead = async (data) => {
    try {
      if (data.id) {
        await updateLead(data.id, data);
        toast({ title: "Lead atualizado!" });
      } else {
        await addLead(data);
        toast({ title: "Lead criado com sucesso!" });
      }
      setIsLeadDialogOpen(false);
      setCurrentLead(null);
      fetchLeads();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      toast({ title: "Erro", description: "Falha ao salvar lead.", variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (leadId, newStatus) => {
    const originalLeads = [...leads];
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

    try {
      await updateLead(leadId, { status: newStatus });
    } catch (error) {
      console.error('Erro ao mover card:', error);
      toast({ title: "Erro ao mover", description: "O status não foi salvo.", variant: "destructive" });
      setLeads(originalLeads);
    }
  };

  const handleDeleteLead = async (id) => {
    if (confirm("Tem certeza que deseja arquivar este lead? Ele sumirá desta tela.")) {
      try {
        // Soft Delete (Arquivar)
        await updateLead(id, { status: 'archived' });

        toast({ title: "Lead arquivado" });
        setIsLeadDialogOpen(false);
        fetchLeads();
      } catch (error) {
        console.error(error);
        toast({ title: "Erro", description: "Falha ao arquivar.", variant: "destructive" });
      }
    }
  };

  const handleEditLead = (lead) => {
    setCurrentLead(lead);
    setIsLeadDialogOpen(true);
  };

  const handleNewLead = () => {
    setCurrentLead(null);
    setIsLeadDialogOpen(true);
  };

  // --- BULK OPERATIONS ---
  const handleBulkUpdate = async (leadIds, newStatus) => {
    try {
      // Optimistic Update
      const originalLeads = [...leads];
      setLeads(prev => prev.map(l => leadIds.includes(l.id) ? { ...l, status: newStatus } : l));

      await Promise.all(leadIds.map(id => updateLead(id, { status: newStatus })));

      toast({ title: "Atualização em massa", description: `${leadIds.length} leads movidos para ${newStatus}.` });
    } catch (error) {
      console.error("Bulk Update Error:", error);
      toast({ title: "Erro", description: "Falha na atualização em massa.", variant: "destructive" });
      fetchLeads(); // Revert/Refresh
    }
  };

  const handleBulkDelete = async (leadIds) => {
    try {
      // Optimistic
      const originalLeads = [...leads];
      setLeads(prev => prev.map(l => leadIds.includes(l.id) ? { ...l, status: 'archived' } : l));

      await Promise.all(leadIds.map(id => updateLead(id, { status: 'archived' })));

      toast({ title: "Exclusão em massa", description: `${leadIds.length} leads arquivados.` });
    } catch (error) {
      console.error("Bulk Delete Error:", error);
      toast({ title: "Erro", description: "Falha na exclusão.", variant: "destructive" });
      fetchLeads();
    }
  };

  const handleBulkAction = (columnLeads) => {
    // Filter out invalid leads if necessary (e.g. no phone)
    const validLeads = columnLeads.filter(l => l.phone);
    if (validLeads.length === 0) {
      toast({ title: "Nenhum lead com telefone válido para envio.", variant: "warning" });
      return;
    }
    setBulkActionLeads(validLeads);
    setIsBulkDialogOpen(true);
  };

  const handleBulkComplete = async (successCount, failCount, successIds) => {
    if (successCount > 0 && successIds?.length > 0) {
      // Move successful leads to 'follow_up_sent'
      try {
        await Promise.all(successIds.map(id => updateLead(id, { status: 'follow_up_sent' })));
        toast({ title: "Ciclo Atualizado", description: "Leads movidos para 'Receberam Follow Up'." });
      } catch (error) {
        console.error("Error moving leads after bulk send:", error);
      }
    }
    fetchLeads();
  };

  const filteredLeads = leads.filter(lead => {
    if (lead.status === 'archived') return false;

    const matchesSearch = lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Header Metrics
  const metrics = {
    total: leads.length,
    sales: leads.filter(l => l.status === 'purchased').length,
    negotiation: leads.filter(l => ['in_conversation', 'likely_purchase', 'scheduled'].includes(l.status)).length,
    new: leads.filter(l => l.status === 'new').length,
    recovery: leads.filter(l => l.status === 'recovery').length, // New Metric
  };

  return (
    <>
      <Helmet>
        <title>CRM - Audicare</title>
      </Helmet>

      <div className="flex flex-col h-[calc(100vh-1rem)] space-y-2 pr-1 pb-1">

        {/* COMPACT Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-2 px-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm shrink-0">

          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              CRM
            </h1>

            {/* Compact Metrics Bar */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                Total: <b>{metrics.total}</b>
              </span>
              <span className="px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-100 dark:border-emerald-800">
                Vendas: <b>{metrics.sales}</b>
              </span>
              <span className="px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-medium border border-orange-100 dark:border-orange-800 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Recuperar: <b>{metrics.recovery}</b>
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Search Compact */}
            <div className="relative w-48 lg:w-64 h-9">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar lead..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1"
              />
            </div>

            <Button
              variant={showImporter ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowImporter(!showImporter)}
              className="hidden sm:flex h-9 w-9 p-0 rounded-lg"
              title="Importar WhatsApp"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              variant={showAITrainer ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowAITrainer(!showAITrainer)}
              className="hidden sm:flex h-9 w-9 p-0 rounded-lg"
              title="Treinar IA"
            >
              <Brain className="h-4 w-4" />
            </Button>

            <Button onClick={handleNewLead} size="sm" className="h-9 rounded-lg shadow-sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo
            </Button>
          </div>
        </div>

        {/* ÁREA DE IMPORTAÇÃO (Condicional) */}
        {showImporter && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300 shrink-0">
            <ChatwootImporter onImportComplete={() => { fetchLeads(); setShowImporter(false); }} />
          </div>
        )}

        {/* ÁREA DO TREINADOR (Condicional) */}
        {showAITrainer && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300 shrink-0">
            <AITrainer />
          </div>
        )}

        {/* Kanban Board - FULL HEIGHT */}
        <div className="flex-1 overflow-hidden bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-slate-200 dark:border-slate-800 p-0 relative">
          {loading ? (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              Carregando leads...
            </div>
          ) : (
            <div className="absolute inset-0 p-4 overflow-x-auto overflow-y-hidden">
              <KanbanBoard
                leads={filteredLeads}
                onUpdateLead={handleUpdateStatus}
                onEditLead={handleEditLead}
                onBulkAction={handleBulkAction}
                onDeleteLead={handleDeleteLead}
                onBulkUpdate={handleBulkUpdate}
                onBulkDelete={handleBulkDelete}
              />
            </div>
          )}
        </div>

        <LeadDialog
          open={isLeadDialogOpen}
          onOpenChange={setIsLeadDialogOpen}
          lead={currentLead}
          onSave={handleSaveLead}
          onDelete={handleDeleteLead}
        />

        <BulkRecoveryDialog
          open={isBulkDialogOpen}
          onOpenChange={setIsBulkDialogOpen}
          leads={bulkActionLeads}
          onComplete={handleBulkComplete}
        />

      </div>
    </>
  );
};

export default CRM;