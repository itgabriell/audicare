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
import { getRepairs, addRepair, updateRepair, deleteRepair, migrateRepairsToClinic } from '@/database';
import RepairDialog from '@/components/repairs/RepairDialog';
import { supabase } from '@/lib/customSupabaseClient';

const Repairs = () => {
  const [repairs, setRepairs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const { toast } = useToast();

  const fetchPassengers = async () => {
    // Reusing logic from RepairKanban - fetching top 100 for combobox
    // Fetching more patients to ensure search works (since Combobox is client-side filter)
    const { data } = await supabase.from('patients').select('id, name, phone').order('name').limit(1000);
    setPatients(data || []);
  };

  const fetchRepairs = useCallback(async () => {
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

  const handleMigration = async () => {
    try {
      setLoading(true);
      const result = await migrateRepairsToClinic();
      if (result.success) {
        toast({
          title: "Migração Concluída",
          description: result.message,
          variant: "default",
          className: "bg-green-500 text-white"
        });
        // Reload list
        loadRepairs();
      } else {
        toast({
          title: "Resultado da Migração",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro na Migração",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

      <div className="h-full flex flex-col space-y-4 overflow-hidden pr-1 relative">
        {/* Floating Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm z-10 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
              Reparos
            </h1>
            <p className="text-muted-foreground text-sm">
              Acompanhe os reparos de aparelhos auditivos
            </p>
          </div>
          <div className="flex flex-row gap-2">
            <Button onClick={() => { setEditingRepair(null); setDialogOpen(true); }} className="rounded-xl h-10 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" />
              Novo Reparo
            </Button>
            <Button variant="outline" onClick={handleMigration} className="rounded-xl h-10 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Migrar Dados
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse border-slate-100 dark:border-slate-800 rounded-3xl">
                <CardHeader>
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4"></div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto scrollbar-hide pb-20 p-1">
            {repairs.map(repair => (
              <Card key={repair.id} className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{repair.patient_name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => handleEditRepair(repair)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteRepair(repair.id)} className="text-destructive">Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{repair.device_model}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${repair.status === 'Concluído' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' :
                      repair.status === 'Em andamento' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30' :
                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'
                      }`}>
                      {repair.status}
                    </span>
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
        repair={selectedRepair}
        patients={patients}
      />
    </>
  );
};

export default Repairs;