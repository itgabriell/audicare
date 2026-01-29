import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Search, Filter, RefreshCw, MessageSquare, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import KanbanBoard from '@/components/crm/KanbanBoard';
import LeadDialog from '@/components/crm/LeadDialog';
import AITrainer from '@/components/crm/AITrainer'; // <--- O COMPONENTE DE TREINAMENTO
import { getLeads, addLead, updateLead } from '@/database';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CRM = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estado para mostrar/esconder o Treinador
  const [showAITrainer, setShowAITrainer] = useState(false);

  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);

  const { toast } = useToast();
  const { user } = useAuth();

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await getLeads();
      setLeads(data || []);
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
  }, []);

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

  const filteredLeads = leads.filter(lead => {
    if (lead.status === 'archived') return false;

    const matchesSearch = lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <Helmet>
        <title>CRM - Audicare</title>
      </Helmet>

      <div className="flex flex-col h-[calc(100vh-6rem)] space-y-4 pr-1">

        {/* Header Floating */}
        <div className="flex flex-col gap-2 md:gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-3 md:p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm z-10 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                CRM de Vendas
              </h1>
              <p className="text-muted-foreground text-sm">
                Pipeline de negociações e leads
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">

              <Button
                variant={showAITrainer ? "secondary" : "outline"}
                onClick={() => setShowAITrainer(!showAITrainer)}
                className="hidden sm:flex rounded-xl h-11"
              >
                <Brain className="h-4 w-4 mr-2" />
                {showAITrainer ? 'Fechar Treinador' : 'Treinar IA'}
              </Button>

              <Button variant="outline" size="icon" onClick={fetchLeads} title="Atualizar" className="rounded-xl h-11 w-11 mt-auto">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={handleNewLead} className="w-full sm:w-auto rounded-xl h-11 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4 mr-2" />
                Novo Lead
              </Button>
            </div>
          </div>

          {/* Stats Row within Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Leads</span>
              <div className="text-2xl font-black text-slate-700 dark:text-slate-200 mt-1">{leads.length}</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/30">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Vendas</span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {leads.filter(l => l.status === 'purchased').length}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-3 border border-blue-100 dark:border-blue-900/30">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Em Negociação</span>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
                {leads.filter(l => ['in_conversation', 'likely_purchase', 'scheduled'].includes(l.status)).length}
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-3 border border-amber-100 dark:border-amber-900/30">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Novos</span>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                {leads.filter(l => l.status === 'new').length}
              </div>
            </div>
          </div>
        </div>

        {/* ÁREA DO TREINADOR (Condicional) */}
        {showAITrainer && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <AITrainer />
          </div>
        )}

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-primary/20"
            />
          </div>
          <div className="w-full sm:w-[240px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <SelectValue placeholder="Filtrar Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="new">Novos</SelectItem>
                <SelectItem value="in_conversation">Em Conversa</SelectItem>
                <SelectItem value="stopped_responding">Parou de Responder</SelectItem>
                <SelectItem value="scheduled">Agendados</SelectItem>
                <SelectItem value="likely_purchase">Provável Compra</SelectItem>
                <SelectItem value="purchased">Venda Realizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-hidden bg-muted/20 rounded-xl border p-4">
          {loading ? (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              Carregando leads...
            </div>
          ) : (
            <KanbanBoard
              leads={filteredLeads}
              onUpdateLead={handleUpdateStatus}
              onEditLead={handleEditLead}
            />
          )}
        </div>

        <LeadDialog
          open={isLeadDialogOpen}
          onOpenChange={setIsLeadDialogOpen}
          lead={currentLead}
          onSave={handleSaveLead}
          onDelete={handleDeleteLead}
        />

      </div>
    </>
  );
};

export default CRM;