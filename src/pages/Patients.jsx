import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { 
    Plus, Search, RefreshCcw, Download, Upload, 
    ChevronLeft, ChevronRight, ArrowUpDown, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import PatientCard from '@/components/patients/PatientCard';
import PatientDialog from '@/components/patients/PatientDialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import {
  getPatients,
  addPatient,
  updatePatient,
  deletePatient,
  checkDuplicatePatient
} from '@/database';

const Patients = () => {
  const { profile, loading: authLoading } = useAuth(); // Importamos authLoading para saber se o login acabou
  const { toast } = useToast();
  
  // Data State
  const [patients, setPatients] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filter & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // UI State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // --- Load Data ---
  const loadPatients = useCallback(async () => {
    // SE o auth ainda estiver carregando OU não tivermos clinic_id, não faz nada (espera)
    if (authLoading || !profile?.profile?.clinic_id) return;

    try {
      setLoading(true);
      const { data, count } = await getPatients(page, pageSize, searchTerm, sortBy, sortOrder);
      setPatients(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('[Patients] Load Error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar a lista de pacientes.'
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, sortBy, sortOrder, toast, authLoading, profile?.profile?.clinic_id]); // Dependências Atualizadas

  // --- Effects ---
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Real-time subscription
  useEffect(() => {
    if (!profile?.profile?.clinic_id) return;

    const channel = supabase
      .channel('public:patients')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'patients', filter: `clinic_id=eq.${profile.profile.clinic_id}` },
        (payload) => {
            console.log('[Realtime] Change received:', payload);
            loadPatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.profile?.clinic_id, loadPatients]);


  // --- Actions ---
  const handleSavePatient = async (patientData) => {
    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, patientData);
        toast({ title: 'Paciente atualizado', description: 'Os dados foram salvos com sucesso.' });
      } else {
        // Check Duplicate
        const isDuplicate = await checkDuplicatePatient(patientData.name, patientData.cpf);
        if (isDuplicate) {
             toast({
                variant: 'destructive',
                title: 'Possível Duplicidade',
                description: 'Já existe um paciente com este Nome ou CPF.'
             });
             return; 
        }

        await addPatient(patientData);
        toast({ title: 'Paciente criado', description: 'Novo cadastro realizado com sucesso.' });
      }
      setDialogOpen(false);
      setEditingPatient(null);
      loadPatients(); 
    } catch (error) {
      console.error('[Patients] Save Error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro inesperado.'
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.")) return;

    try {
      await deletePatient(id);
      loadPatients(); // Força recarregamento após deletar
      toast({ title: 'Paciente removido', description: 'O registro foi excluído.' });
    } catch (error) {
      console.error('[Patients] Delete Error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: 'Não foi possível excluir o paciente.'
      });
    }
  };

  const handleExportCSV = async () => {
    try {
        setIsExporting(true);
        // Fetch ALL patients for export (ignoring pagination)
        const { data } = await getPatients(1, 10000, searchTerm, sortBy, sortOrder);
        
        if (!data || data.length === 0) {
            toast({ title: "Nada para exportar", description: "A lista está vazia." });
            return;
        }

        const headers = ["Nome", "CPF", "Email", "Telefone", "Nascimento", "Gênero", "Criado em"];
        const csvRows = [headers.join(",")];
        
        data.forEach(p => {
            const row = [
                `"${p.name || ''}"`,
                `"${p.cpf || ''}"`,
                `"${p.email || ''}"`,
                `"${p.phone || ''}"`,
                `"${p.birthdate || ''}"`,
                `"${p.gender || ''}"`,
                `"${p.created_at || ''}"`
            ];
            csvRows.push(row.join(","));
        });

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `pacientes_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "Exportação concluída", description: `${data.length} registros exportados.` });

    } catch (error) {
        console.error("Export error:", error);
        toast({ variant: "destructive", title: "Erro na exportação", description: "Tente novamente mais tarde." });
    } finally {
        setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    document.getElementById('file-upload').click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const text = e.target.result;
            const rows = text.split('\n').slice(1); // Skip header
            let successCount = 0;
            
            for (const row of rows) {
                const cols = row.split(','); // Simple split
                if (cols.length < 2) continue;
                
                // Remove quotes
                const name = cols[0]?.replace(/"/g, '').trim();
                const phone = cols[3]?.replace(/"/g, '').trim();
                
                if (name) {
                    await addPatient({ name, phone });
                    successCount++;
                }
            }
            
            toast({ title: "Importação Finalizada", description: `${successCount} pacientes importados.` });
            loadPatients();
        } catch (err) {
             console.error(err);
             toast({ variant: 'destructive', title: "Erro ao importar", description: "Verifique o formato do arquivo." });
        } finally {
            setIsImporting(false);
            event.target.value = null; // Reset file input
        }
    };
    
    reader.readAsText(file);
  };

  // --- Handlers for Pagination ---
  const totalPages = Math.ceil(totalCount / pageSize);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <>
      <Helmet>
        <title>Pacientes - AudiCare</title>
      </Helmet>

      <div className="space-y-6 p-2 pb-20">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
            <p className="text-muted-foreground">
              {authLoading ? 'Carregando perfil...' : `Gerencie sua base de ${totalCount} pacientes cadastrados.`}
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
             <input 
                type="file" 
                id="file-upload" 
                accept=".csv" 
                className="hidden" 
                onChange={handleFileChange} 
             />
             <Button variant="outline" onClick={handleImportClick} disabled={isImporting || loading}>
                {isImporting ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Importar
             </Button>
             
             <Button variant="outline" onClick={handleExportCSV} disabled={isExporting || loading}>
                {isExporting ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Exportar
             </Button>
             
             <Button onClick={() => { setEditingPatient(null); setDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Paciente
             </Button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                {/* LUPA CORRIGIDA: pl-10 */}
                <Input 
                    placeholder="Buscar nome, CPF, telefone..." 
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} 
                    className="pl-10"
                />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto ml-auto">
                 <Button variant="ghost" size="icon" onClick={loadPatients} title="Recarregar lista">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                 </Button>
                 
                 <Select value={sortBy} onValueChange={(val) => { setSortBy(val); setPage(1); }}>
                    <SelectTrigger className="w-[140px]">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at">Data Criação</SelectItem>
                        <SelectItem value="name">Nome</SelectItem>
                        <SelectItem value="updated_at">Última Edição</SelectItem>
                    </SelectContent>
                 </Select>
                 
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSortOrder(prev => {
                        setPage(1);
                        return prev === 'asc' ? 'desc' : 'asc';
                    })}
                    title={sortOrder === 'asc' ? "Crescente" : "Decrescente"}
                 >
                    {sortOrder === 'asc' ? <ChevronLeft className="h-4 w-4 rotate-90" /> : <ChevronRight className="h-4 w-4 rotate-90" />}
                 </Button>
            </div>
        </div>

        {/* Content Area */}
        {loading || authLoading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => (
                 <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-xl border" />
              ))}
           </div>
        ) : patients.length > 0 ? (
           <>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patients.map((patient) => (
                <PatientCard
                    key={patient.id}
                    patient={patient}
                    onEdit={(p) => { setEditingPatient(p); setDialogOpen(true); }}
                    onDelete={handleDelete}
                />
                ))}
             </div>
             
             {/* Pagination Footer */}
             <div className="flex items-center justify-between py-4 border-t mt-4">
                <div className="text-sm text-muted-foreground">
                    Página {page} de {totalPages || 1}
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={!canPrev}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={!canNext}
                    >
                        Próximo <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
             </div>
           </>
        ) : (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl"
            >
                <div className="bg-muted p-4 rounded-full mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Nenhum paciente encontrado</h3>
                <p className="text-muted-foreground max-w-sm mt-1 mb-4">
                    {!profile?.profile?.clinic_id
                        ? "Não foi possível identificar a clínica. Tente recarregar a página."
                        : "Não encontramos registros com os filtros atuais."}
                </p>
                <Button onClick={() => { setSearchTerm(''); setPage(1); }}>Limpar Filtros</Button>
            </motion.div>
        )}

        {/* Create/Edit Dialog */}
        <PatientDialog
          open={dialogOpen}
          onOpenChange={(val) => {
            setDialogOpen(val);
            if (!val) setEditingPatient(null);
          }}
          patient={editingPatient}
          onSave={handleSavePatient}
        />
      </div>
    </>
  );
};

export default Patients;
