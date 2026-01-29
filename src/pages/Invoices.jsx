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

const Invoices = () => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
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
  }, []);

  useEffect(() => {
    applyFilters();
  }, [invoices, searchTerm, filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      // Buscar todas as notas fiscais
      const { data: invoicesData, error: invoicesError } = await supabase
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
        `)
        .order('issued_at', { ascending: false });

      if (invoicesError) {
        console.warn('Erro ao buscar invoices:', invoicesError);
        // Fallback para dados mock se não conseguir buscar
        setInvoices([]);
        setFilteredInvoices([]);
        return;
      }

      setInvoices(invoicesData || []);
    } catch (error) {
      console.error('Erro ao buscar invoices:', error);
      setInvoices([]);
      setFilteredInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    // Filtro de busca por texto
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.patients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.patients?.document?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.patients?.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.patients?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo
    if (filters.type !== 'all') {
      filtered = filtered.filter(invoice => invoice.type === filters.type);
    }

    // Filtro por status
    if (filters.status !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filters.status);
    }

    // Filtro por método de pagamento
    if (filters.paymentMethod !== 'all') {
      filtered = filtered.filter(invoice => invoice.payment_method === filters.paymentMethod);
    }

    // Filtro por período
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      if (filters.dateRange !== 'all') {
        filtered = filtered.filter(invoice =>
          new Date(invoice.issued_at) >= filterDate
        );
      }
    }

    setFilteredInvoices(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id));
    }
  };

  const handleDownloadInvoice = async (invoice) => {
    if (invoice.link) {
      window.open(invoice.link, '_blank');
    } else {
      toast({
        variant: 'destructive',
        title: 'PDF não disponível',
        description: 'O PDF desta nota ainda não foi gerado.'
      });
    }
  };

  const handleBulkDownload = async () => {
    if (selectedInvoices.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma nota selecionada',
        description: 'Selecione pelo menos uma nota fiscal para baixar.'
      });
      return;
    }

    const selectedData = filteredInvoices.filter(inv => selectedInvoices.includes(inv.id));

    // Para múltiplas notas, abrir cada uma em nova aba
    selectedData.forEach(invoice => {
      if (invoice.link) {
        setTimeout(() => window.open(invoice.link, '_blank'), 500);
      }
    });

    toast({
      title: 'Download iniciado',
      description: `Abrindo ${selectedInvoices.length} nota(s) fiscal(is) em novas abas.`
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      authorized: { label: 'Autorizada', variant: 'default', className: 'bg-green-100 text-green-800' },
      processing: { label: 'Processando', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800' },
      error: { label: 'Erro', variant: 'destructive', className: 'bg-red-100 text-red-800' }
    };

    const config = statusMap[status] || { label: status, variant: 'outline' };

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
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
      'fono': 'NFS-e Fonoaudiologia',
      'maintenance': 'NFS-e Manutenção',
      'sale': 'NF-e Venda'
    };
    return types[type] || type;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Floating */}
      <div className="flex flex-col gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm z-10 shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
              {filteredInvoices.length} nota{filteredInvoices.length !== 1 ? 's' : ''}
            </Badge>

            {selectedInvoices.length > 0 && (
              <Button onClick={handleBulkDownload} variant="outline" className="rounded-xl h-9">
                <Download className="h-3.5 w-3.5 mr-2" />
                Baixar Selecionadas ({selectedInvoices.length})
              </Button>
            )}
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1"><FileText className="w-3 h-3" /> Total</span>
            <div className="text-xl font-black text-slate-700 dark:text-slate-200 mt-1">{filteredInvoices.length}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl p-3 border border-green-100 dark:border-green-900/30">
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wider flex items-center gap-1"><DollarSign className="w-3 h-3" /> Receita</span>
            <div className="text-xl font-black text-green-700 dark:text-green-400 mt-1 truncate">
              {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0))}
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl p-3 border border-yellow-100 dark:border-yellow-900/30">
            <span className="text-xs font-semibold text-yellow-600 uppercase tracking-wider flex items-center gap-1"><Receipt className="w-3 h-3" /> Autorizadas</span>
            <div className="text-xl font-black text-yellow-700 dark:text-yellow-400 mt-1">
              {filteredInvoices.filter(inv => inv.status === 'authorized').length}
            </div>
          </div>
          <div className="bg-cyan-50/50 dark:bg-cyan-900/10 rounded-2xl p-3 border border-cyan-100 dark:border-cyan-900/30">
            <span className="text-xs font-semibold text-cyan-600 uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Este Mês</span>
            <div className="text-xl font-black text-cyan-700 dark:text-cyan-400 mt-1">
              {filteredInvoices.filter(inv => {
                const invoiceDate = new Date(inv.issued_at);
                const now = new Date();
                return invoiceDate.getMonth() === now.getMonth() &&
                  invoiceDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </div>
        </div>
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
                placeholder="Buscar por número, paciente..."
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
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 pl-4">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
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
              {filteredInvoices.length === 0 ? (
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
                filteredInvoices.map((invoice) => (
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
