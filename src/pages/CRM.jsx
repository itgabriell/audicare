import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Search, Filter, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import KanbanBoard from '@/components/crm/KanbanBoard';
import LeadDialog from '@/components/crm/LeadDialog';
import { getLeads, addLead, updateLead, deleteLead } from '@/database'; // Importando funções do banco
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CRM = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Estados para Modais
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);

  const { toast } = useToast();
  const { user } = useAuth();

  // Carregar Leads
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await getLeads(); // Busca do Supabase via database.js
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

  // --- AÇÕES DO KANBAN ---

  // 1. Salvar Novo Lead ou Edição
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
      fetchLeads(); // Recarrega a lista
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      toast({ title: "Erro", description: "Falha ao salvar lead.", variant: "destructive" });
    }
  };

  // 2. Mover Card (Arrastar e Soltar)
  const handleUpdateStatus = async (leadId, newStatus) => {
    // Atualização Otimista (Visual muda na hora)
    const originalLeads = [...leads];
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

    try {
      await updateLead(leadId, { status: newStatus });
      // Sucesso silencioso, não precisa de toast pra cada movimento
    } catch (error) {
      console.error('Erro ao mover card:', error);
      toast({ title: "Erro ao mover", description: "O status não foi salvo.", variant: "destructive" });
      setLeads(originalLeads); // Reverte se der erro
    }
  };

  // 3. Deletar Lead
  const handleDeleteLead = async (id) => {
      if(confirm("Tem certeza que deseja excluir este lead?")) {
          try {
              // Se tiver função deleteLead no database.js, usamos. Se não, update para status 'deleted' ou similar.
              // Assumindo que existe deleteLead ou você implementará. 
              // Se não existir, vamos improvisar com updateLead para um status 'archived'
              // await deleteLead(id); <--- Ideal
              await updateLead(id, { status: 'archived' }); // <--- Seguro por enquanto
              
              toast({ title: "Lead arquivado/excluído" });
              fetchLeads();
              setIsLeadDialogOpen(false);
          } catch (error) {
              toast({ title: "Erro", description: "Falha ao excluir.", variant: "destructive" });
          }
      }
  };

  // 4. Abrir Modal de Edição (Clique no Card)
  const handleEditLead = (lead) => {
    setCurrentLead(lead);
    setIsLeadDialogOpen(true);
  };

  // 5. Novo Lead (Botão)
  const handleNewLead = () => {
    setCurrentLead(null);
    setIsLeadDialogOpen(true);
  };

  // Filtragem local
  const filteredLeads = leads.filter(lead => {
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

      <div className="flex flex-col h-[calc(100vh-6rem)] space-y-4">
        
        {/* TOPO: Título e Ações */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-8 w-8 text-primary" />
                CRM de Vendas
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Gerencie seus leads e acompanhe as negociações
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="icon" onClick={fetchLeads} title="Atualizar">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={handleNewLead} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-lg border shadow-sm">
            <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por nome ou telefone..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                />
            </div>
            <div className="w-full sm:w-[200px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <SelectValue placeholder="Filtrar Status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="new">Novos</SelectItem>
                        <SelectItem value="in_conversation">Em Conversa</SelectItem>
                        <SelectItem value="scheduled">Agendados</SelectItem>
                        <SelectItem value="sales">Vendas</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* ÁREA DO KANBAN (Scrollável) */}
        <div className="flex-1 overflow-hidden bg-muted/20 rounded-xl border p-4">
            {loading ? (
                <div className="flex justify-center items-center h-full text-muted-foreground">
                    Carregando leads...
                </div>
            ) : (
                <KanbanBoard 
                    leads={filteredLeads} 
                    onUpdateLead={handleUpdateStatus} // Conecta o Drag&Drop ao Banco
                    onEditLead={handleEditLead}       // Conecta o Clique ao Modal
                />
            )}
        </div>

        {/* MODAL DE LEAD (Criação/Edição) */}
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