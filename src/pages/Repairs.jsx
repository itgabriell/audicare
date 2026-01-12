import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { getRepairs, addRepair, updateRepair, deleteRepair } from '@/database';

// Dummy component, replace with actual implementation
const RepairDialog = ({ open, onOpenChange, onSave, repair }) => {
    const { toast } = useToast();
    const handleNotImplemented = () => {
        toast({
            title: "🚧 Não implementado",
            description: "A criação e edição de reparos ainda não foi implementada.",
        });
        onOpenChange(false);
    }
    useEffect(() => {
        if(open) handleNotImplemented();
    }, [open]);
    
    return null;
}

const Repairs = () => {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState(null);
  const { toast } = useToast();

  const loadRepairs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRepairs();
      setRepairs(data);
    } catch (error) {
      toast({
        title: "Erro ao carregar reparos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRepairs();
  }, [loadRepairs]);

  const handleSaveRepair = async (repairData) => {
    // This will be called from RepairDialog once implemented
    try {
      if (editingRepair) {
        const updated = await updateRepair(editingRepair.id, repairData);
        setRepairs(repairs.map(r => r.id === editingRepair.id ? updated : r));
        toast({ title: "Sucesso!", description: "Reparo atualizado." });
      } else {
        const added = await addRepair(repairData);
        setRepairs([added, ...repairs]);
        toast({ title: "Sucesso!", description: "Novo reparo adicionado." });
      }
      setDialogOpen(false);
      setEditingRepair(null);
    } catch (error) {
       toast({
        title: "Erro ao salvar reparo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRepair = async (repairId) => {
     const originalRepairs = [...repairs];
     setRepairs(prev => prev.filter(r => r.id !== repairId));
     try {
       await deleteRepair(repairId);
       toast({ title: "Sucesso!", description: "Reparo removido." });
     } catch (error) {
       setRepairs(originalRepairs);
       toast({
        title: "Erro ao remover reparo",
        description: error.message,
        variant: "destructive",
      });
     }
  };
  
  const handleEditRepair = (repair) => {
    setEditingRepair(repair);
    setDialogOpen(true);
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendente': return 'bg-yellow-500';
      case 'Em andamento': return 'bg-blue-500';
      case 'Concluído': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      <Helmet>
        <title>Reparos - Audicare</title>
        <meta name="description" content="Gerenciamento de reparos de aparelhos auditivos" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reparos</h1>
            <p className="text-muted-foreground mt-1">Acompanhe os reparos de aparelhos auditivos</p>
          </div>
          <Button onClick={() => { setEditingRepair(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Reparo
          </Button>
        </div>
        
        {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                     <Card key={i} className="animate-pulse">
                         <CardHeader>
                             <div className="h-6 bg-muted rounded w-3/4"></div>
                             <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                         </CardHeader>
                         <CardContent>
                            <div className="h-4 bg-muted rounded w-1/4"></div>
                         </CardContent>
                     </Card>
                ))}
             </div>
        ) : repairs.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Nenhum reparo encontrado.</p>
                <Button onClick={() => setDialogOpen(true)} className="mt-4">
                    Adicionar Primeiro Reparo
                </Button>
            </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {repairs.map(repair => (
              <Card key={repair.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{repair.patient_name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleEditRepair(repair)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteRepair(repair.id)} className="text-destructive">Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-muted-foreground">{repair.device_model}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${getStatusColor(repair.status)}`}></span>
                    <span className="text-sm">{repair.status}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <RepairDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveRepair}
        repair={editingRepair}
      />
    </>
  );
};

export default Repairs;