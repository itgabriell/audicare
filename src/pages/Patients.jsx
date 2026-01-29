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
      link.setAttribute("download", `pacientes_export_${new Date().toISOString().slice(0, 10)}.csv`);
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

      <div className="h-full flex flex-col space-y-4 overflow-hidden pr-1 relative">

        {/* Modern Floating Header & Controls */}
        <div className="flex flex-col gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm z-10 shrink-0">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                Pacientes
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {authLoading ? 'Sincronizando...' : `${totalCount} registros ativos`}
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              {/* Actions Group - Unified */}
              <div className="flex items-center gap-2 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                <input
                  type="file"
                  id="file-upload"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button variant="ghost" size="icon" onClick={handleImportClick} disabled={isImporting || loading} className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-700 shadow-none hover:shadow-sm transition-all" title="Importar CSV">
                  {isImporting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleExportCSV} disabled={isExporting || loading} className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-700 shadow-none hover:shadow-sm transition-all" title="Exportar CSV">
                  {isExporting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
                </Button>
              </div>

              <Button onClick={() => { setEditingPatient(null); setDialogOpen(true); }} className="rounded-2xl h-11 px-5 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-95">
                <Plus className="mr-2 h-4 w-4" />
                Novo Paciente
              </Button>
            </div>
          </div>

          {/* Search & Filters Row */}
          <div className="flex flex-col md:flex-row gap-3 items-center w-full">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Buscar por nome, CPF ou telefone..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-11 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 rounded-2xl transition-all shadow-sm"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto items-center shrink-0">
              <Select value={sortBy} onValueChange={(val) => { setSortBy(val); setPage(1); }}>
                <SelectTrigger className="w-[160px] h-11 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Ordenar</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 dark:border-slate-800 shadow-xl">
                  <SelectItem value="created_at">Data Cadastro</SelectItem>
                  <SelectItem value="name">Nome (A-Z)</SelectItem>
                  <SelectItem value="updated_at">Recentes</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm"
                onClick={() => setSortOrder(prev => {
                  setPage(1);
                  return prev === 'asc' ? 'desc' : 'asc';
                })}
                title={sortOrder === 'asc' ? "Crescente" : "Decrescente"}
              >
                {sortOrder === 'asc' ? <ChevronLeft className="h-4 w-4 rotate-90" /> : <ChevronRight className="h-4 w-4 rotate-90" />}
              </Button>

              <Button variant="ghost" size="icon" onClick={loadPatients} title="Atualizar" className="h-11 w-11 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
          {loading || authLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-48 bg-muted/10 animate-pulse rounded-2xl border border-slate-100 dark:border-slate-800" />
              ))}
            </div>
          ) : patients.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {patients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onEdit={(p) => { setEditingPatient(p); setDialogOpen(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>

              {/* Pagination - Integrated at bottom of list */}
              <div className="flex items-center justify-center py-6 mt-2">
                <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-1 rounded-2xl shadow-sm border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-xl disabled:opacity-30"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={!canPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium px-4 text-muted-foreground w-28 text-center">
                    {page} / {totalPages || 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-xl disabled:opacity-30"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={!canNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-[400px] text-center"
            >
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-full mb-4">
                <Search className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nenhum paciente encontrado</h3>
              <p className="text-muted-foreground max-w-sm mt-1 mb-6 text-sm">
                {!profile?.profile?.clinic_id
                  ? "Não foi possível identificar a clínica. Tente recarregar a página."
                  : "Não encontramos registros com os filtros atuais."}
              </p>
              <Button variant="outline" onClick={() => { setSearchTerm(''); setPage(1); }} className="rounded-xl">
                Limpar Filtros
              </Button>
            </motion.div>
          )}
        </div>

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
