import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Search, Filter, FileText, Receipt, Calendar, DollarSign, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import InvoiceTableSkeleton from '@/components/skeletons/InvoiceTableSkeleton';

const Invoices = () => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10;

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    dateRange: 'all',
    paymentMethod: 'all'
  });
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  useEffect(() => {
    fetchInvoices();
  }, [page, filters]); // Re-fetch when page or strict filters change

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset to page 1 on search
      fetchInvoices();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('invoices')
        .select(`
          *,
          patients (
            id,
            name,
            phone,
            document,
            cpf
          )
        `, { count: 'exact' });

      // Apply Filters
      if (filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.paymentMethod !== 'all') {
        query = query.eq('payment_method', filters.paymentMethod);
      }

      // Date Range Filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        let filterDate = new Date();
        switch (filters.dateRange) {
          case 'today': filterDate.setHours(0, 0, 0, 0); break;
          case 'week': filterDate.setDate(now.getDate() - 7); break;
          case 'month': filterDate.setMonth(now.getMonth() - 1); break;
          case 'quarter': filterDate.setMonth(now.getMonth() - 3); break;
          case 'year': filterDate.setFullYear(now.getFullYear() - 1); break;
        }
        query = query.gte('issued_at', filterDate.toISOString());
      }

      // Search (Client-side search limitation on Supabase relations requires careful handling)
      // Ideally Full Text Search, but for now filtering on Invoice Number or simplified
      if (searchTerm) {
        // Checking if searchable is numeric (invoice number) or text
        query = query.ilike('numero', `%${searchTerm}%`);
        // Note: Joining search on relation columns (patients.name) needs RPC or flattening. 
        // For simplicity/performance without RPC, we limit search to Invoice fields for now, 
        // OR we fetch matches. Complex filtering recommended moving to Edge Function if needed.
      }

      // Pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order('issued_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setInvoices(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));

    } catch (error) {
      console.error('Erro ao buscar invoices:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as notas fiscais.'
      });
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  // Removed applyFilters client-side logic as it is now server-side

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset page on filter change
  };

  // ... inside Invoices component ...

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedInvoices(invoices.map(i => i.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (id) => {
    setSelectedInvoices(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDownloadInvoice = (invoice) => {
    if (invoice.link) {
      window.open(invoice.link, '_blank');
    } else {
      toast({
        variant: 'destructive',
        title: 'PDF Indisponível',
        description: 'O link para o PDF desta nota não foi encontrado.'
      });
    }
  };

  const handleBulkDownload = () => {
    const selected = invoices.filter(i => selectedInvoices.includes(i.id));
    let downloadedCount = 0;

    selected.forEach(invoice => {
      if (invoice.link) {
        window.open(invoice.link, '_blank');
        downloadedCount++;
      }
    });

    if (downloadedCount === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum PDF disponível',
        description: 'Nenhuma das notas selecionadas possui PDF gerado.'
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      authorized: { label: 'Autorizada', variant: 'default', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      processing: { label: 'Processando', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      error: { label: 'Erro', variant: 'destructive', className: 'bg-red-100 text-red-800 hover:bg-red-100' }
    };
    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      cash: 'À Vista',
      installment: 'Parcelado',
      card: 'Cartão',
      pix: 'PIX'
    };
    return methods[method] || method;
  };

  const getInvoiceTypeLabel = (type) => {
    const types = {
      'fono': 'Fonoaudiologia',
      'maintenance': 'Manutenção',
      'sale': 'Venda'
    };
    return types[type] || type;
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      {/* Header Floating */}
      <div className="flex flex-col gap-2 md:gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-3 md:p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm z-10 shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              Notas Fiscais
            </h1>
            <p className="text-muted-foreground text-sm">
              Gerencie todas as notas fiscais emitidas
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Badge variant="secondary" className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {totalCount} registro(s)
            </Badge>

            {selectedInvoices.length > 0 && (
              <Button onClick={handleBulkDownload} variant="outline" className="rounded-xl h-11">
                <Download className="h-4 w-4 mr-2" />
                Baixar Selecionadas ({selectedInvoices.length})
              </Button>
            )}
          </div>
        </div>

        {/* Top Stats Row - Mocked for now (needs separate aggregate query for real data without loading all) */}
        {/* Skipping specific stat values for optimizing performance on large data */}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número da nota..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Tipo */}
            <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="fono">Fonoaudiologia</SelectItem>
                <SelectItem value="maintenance">Manutenção</SelectItem>
                <SelectItem value="sale">Venda</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="authorized">Autorizada</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>

            {/* Forma de Pagamento */}
            <Select value={filters.paymentMethod} onValueChange={(value) => handleFilterChange('paymentMethod', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as formas</SelectItem>
                <SelectItem value="cash">À Vista</SelectItem>
                <SelectItem value="installment">Parcelado</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
              </SelectContent>
            </Select>

            {/* Período */}
            <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="quarter">Último trimestre</SelectItem>
                <SelectItem value="year">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="rounded-3xl shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 pl-4">
                  <input
                    type="checkbox"
                    checked={invoices.length > 0 && selectedInvoices.length === invoices.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/20"
                  />
                </TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-200">Número</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-200">Data</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-200">Paciente</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-200">Tipo</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-200">Valor</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-200">Pagamento</TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-200">Status</TableHead>
                <TableHead className="text-right pr-4 font-semibold text-slate-700 dark:text-slate-200">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <InvoiceTableSkeleton />
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center opacity-60">
                      <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                      <p className="text-lg font-medium text-slate-900 dark:text-slate-100">Nenhum registro encontrado</p>
                      <p className="text-sm text-slate-500 max-w-xs mt-1">
                        {searchTerm || Object.values(filters).some(f => f !== 'all')
                          ? 'Tente ajustar os filtros ou a busca para encontrar o que procura.'
                          : 'Você ainda não emitiu nenhuma nota fiscal.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-slate-100 dark:border-slate-800">
                    <TableCell className="pl-4">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => handleSelectInvoice(invoice.id)}
                        className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/20"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                      {invoice.numero || `NF-${invoice.id}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        {formatDate(invoice.issued_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{invoice.patients?.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {invoice.patients?.document || invoice.patients?.cpf || invoice.patients?.phone || ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                        {getInvoiceTypeLabel(invoice.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(invoice.amount)}
                        </span>
                        {invoice.installments > 1 && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {invoice.installments}x
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                      {getPaymentMethodLabel(invoice.payment_method)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-slate-400 hover:text-primary hover:bg-primary/10"
                        onClick={() => handleDownloadInvoice(invoice)}
                        disabled={!invoice.link}
                        title="Baixar PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages} ({totalCount} itens)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
