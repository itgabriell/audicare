import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
    Plus, Search, RefreshCcw, Download, Upload,
    ChevronLeft, ChevronRight, ArrowUpDown, RefreshCw, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import PatientDialog from '@/components/patients/PatientDialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { getPatients, addPatient, updatePatient, deletePatient, checkDuplicatePatient } from '@/database';
import { useDevice } from '@/hooks/useDevice';
import { DataTableMobile } from '@/components/ui/data-table-mobile';

const Patients = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isMobile } = useDevice();

  // Table columns configuration
  const tableColumns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Nome',
      render: (value) => <span className="font-medium">{value || '-'}</span>
    },
    {
      accessorKey: 'cpf',
      header: 'CPF',
      hideOnMobile: true,
    },
    {
      accessorKey: 'phone',
      header: 'Celular',
      render: (value) => formatPhone(value)
    },
    {
      accessorKey: 'address',
      header: 'Cidade/Estado',
      hideOnMobile: true,
      render: (value) => value ? value.split(',')[2] || value : '-'
    }
  ], []);

  // Actions for mobile table (defined after handleEdit)

  // Data State
  const [patients, setPatients] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // UI State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // --- Load Data ---
  const loadPatients = useCallback(async () => {
    if (!profile?.clinic_id) {
      setPatients([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let query = supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .eq('clinic_id', profile.clinic_id)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply search filter
      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('[Patients] Load Error:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar',
          description: 'Não foi possível buscar a lista de pacientes.'
        });
        return;
      }

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
  }, [page, pageSize, searchTerm, sortBy, sortOrder, profile?.clinic_id, toast]);

  // --- Effects ---
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Real-time subscription
  useEffect(() => {
    if (!profile?.clinic_id) return;

    const channel = supabase
      .channel('public:patients')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'patients', filter: `clinic_id=eq.${profile.clinic_id}` },
        (payload) => {
            console.log('[Realtime] Change received:', payload);
            loadPatients(); // Reload to respect sort/filter/page
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.clinic_id, loadPatients]);


  // --- Actions ---
  const handleViewDetails = useCallback((patient) => {
    navigate(`/patients/${patient.id}`);
  }, [navigate]);

  const handleEdit = useCallback((patient) => {
    setEditingPatient(patient);
    setDialogOpen(true);
  }, []);

  // Actions for mobile table (defined after handleEdit)
  const tableActions = useMemo(() => [
    {
      label: 'Editar',
      onClick: handleEdit
    }
  ], [handleEdit]);

  const handleSavePatient = useCallback(async (patientData) => {
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
             return; // Stop here, keep dialog open
        }

        await addPatient(patientData);
        toast({ title: 'Paciente criado', description: 'Novo cadastro realizado com sucesso.' });
      }
      setDialogOpen(false);
      setEditingPatient(null);
      // Realtime deve atualizar automaticamente, mas recarregamos para garantir feedback imediato
      loadPatients();
    } catch (error) {
      console.error('[Patients] Save Error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro inesperado.'
      });
    }
  }, [editingPatient, toast, loadPatients]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.")) return;

    try {
      await deletePatient(id);
      toast({ title: 'Paciente removido', description: 'O registro foi excluído.' });
      // Realtime deve atualizar automaticamente, mas recarregamos para garantir
      loadPatients();
    } catch (error) {
      console.error('[Patients] Delete Error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: 'Não foi possível excluir o paciente.'
      });
    }
  }, [toast, loadPatients]);

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
                const cols = row.split(','); // Simple split, naive CSV parsing
                if (cols.length < 2) continue;
                
                // Remove quotes
                const name = cols[0]?.replace(/"/g, '').trim();
                const phone = cols[3]?.replace(/"/g, '').trim();
                
                if (name) {
                    // Preparar telefones para múltiplos números
                    const phones = phone ? [{
                      phone: phone,
                      phone_type: 'mobile',
                      is_primary: true,
                      is_whatsapp: true,
                      contact_name: null,
                      notes: null,
                    }] : [];
                    
                    await addPatient({ name, phones, phone }); // Minimal import com suporte a múltiplos telefones
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
  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize), [totalCount, pageSize]);
  const canPrev = useMemo(() => page > 1, [page]);
  const canNext = useMemo(() => page < totalPages, [page, totalPages]);

  // --- Format Phone ---
  const formatPhone = (phone) => {
    if (!phone) return '';
    // Formatação simples para BR: (11) 99999-8888
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <>
      <Helmet>
        <title>Pacientes - Audicare</title>
      </Helmet>

      <div className="space-y-6 p-2 pb-20">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
            <p className="text-muted-foreground">
              Gerencie sua base de {totalCount} pacientes cadastrados.
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar nome, CPF, telefone..." 
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} // Reset page on search
                    className="pl-9"
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
        {loading ? (
           <div className="grid grid-cols-1 gap-4">
              {Array(6).fill(0).map((_, i) => (
                 <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-xl border" />
              ))}
           </div>
        ) : patients.length > 0 ? (
           <>
             {/* Desktop Table / Mobile Cards */}
             {isMobile ? (
               <DataTableMobile
                 data={patients}
                 columns={tableColumns}
                 onRowClick={handleViewDetails}
                 actions={tableActions}
               />
             ) : (
               <div className="border rounded-lg overflow-hidden">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Nome</TableHead>
                       <TableHead>CPF</TableHead>
                       <TableHead>Celular</TableHead>
                       <TableHead>Cidade/Estado</TableHead>
                       <TableHead className="text-right">Ações</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {patients.map((patient) => (
                       <TableRow
                         key={patient.id}
                         className="cursor-pointer hover:bg-muted/50 transition-colors"
                         onClick={() => handleViewDetails(patient)}
                       >
                         <TableCell className="font-medium">{patient.name || '-'}</TableCell>
                         <TableCell>{patient.cpf || '-'}</TableCell>
                         <TableCell>{formatPhone(patient.phone)}</TableCell>
                         <TableCell>{patient.address ? patient.address.split(',')[2] || patient.address : '-'}</TableCell>
                         <TableCell className="text-right">
                           <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                             <Button
                               variant="ghost"
                               size="sm"
                             >
                               <Eye className="h-4 w-4 mr-1" />
                               Ver Detalhes
                             </Button>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleEdit(patient);
                               }}
                             >
                               Editar
                             </Button>
                           </div>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
             )}

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
                    Não encontramos registros com os filtros atuais. Tente limpar a busca ou adicione um novo paciente.
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
