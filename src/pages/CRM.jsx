import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Search, Filter, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import KanbanBoard from '@/components/crm/KanbanBoard';
import LeadDialog from '@/components/crm/LeadDialog';
import ChatwootImporter from '@/components/crm/ChatwootImporter'; // Mantendo o Resgatador
import { getLeads, addLead, updateLead } from '@/database'; // Não precisa importar deleteLead
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CRM = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
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

  // --- VOLTAMOS PARA ARQUIVAR (SAFE) ---
  const handleDeleteLead = async (id) => {
      if(confirm("Tem certeza que deseja arquivar este lead? Ele sumirá desta tela.")) {
          try {
              // Apenas muda o status para 'archived', mantendo o histórico no banco
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
    // Esconde os arquivados da visualização principal
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

      <div className="flex flex-col h-[calc(100vh-6rem)] space-y-4">
        
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

        {/* --- ÁREA DE RESGATE DO FIM DE SEMANA --- */}
        {/* Clique no botão, espere importar, e depois delete essa linha do código */}
        <ChatwootImporter onImportComplete={fetchLeads} />
        {/* ---------------------------------------- */}

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
                        <SelectItem value="likely_purchase">Provável Compra</SelectItem>
                        <SelectItem value="purchased">Venda Realizada</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

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