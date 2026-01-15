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
          contacts!fk_invoices_patient (
            id,
            name,
            phone,
            document
          )
        `)
        .order('issue_date', { ascending: false });

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
        invoice.contacts?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.contacts?.document?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.contacts?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          new Date(invoice.issue_date) >= filterDate
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary" />
            Notas Fiscais
          </h1>
          <p className="text-muted-foreground">
            Gerencie todas as notas fiscais emitidas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1">
            {filteredInvoices.length} nota{filteredInvoices.length !== 1 ? 's' : ''}
          </Badge>
          {selectedInvoices.length > 0 && (
            <Button onClick={handleBulkDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Baixar Selecionadas ({selectedInvoices.length})
            </Button>
          )}
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
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm || Object.values(filters).some(f => f !== 'all')
                        ? 'Nenhuma nota fiscal encontrada com os filtros aplicados.'
                        : 'Nenhuma nota fiscal emitida ainda.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => handleSelectInvoice(invoice.id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.numero || `NF-${invoice.id}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(invoice.issue_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{invoice.contacts?.name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.contacts?.document || invoice.contacts?.phone || ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getInvoiceTypeLabel(invoice.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-600">
                          {formatCurrency(invoice.amount)}
                        </span>
                        {invoice.installments > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            {invoice.installments}x
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodLabel(invoice.payment_method)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoice)}
                        disabled={!invoice.link}
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

      {/* Estatísticas */}
      {filteredInvoices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Notas</p>
                  <p className="text-2xl font-bold">{filteredInvoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Receipt className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Autorizadas</p>
                  <p className="text-2xl font-bold">
                    {filteredInvoices.filter(inv => inv.status === 'authorized').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Este Mês</p>
                  <p className="text-2xl font-bold">
                    {filteredInvoices.filter(inv => {
                      const invoiceDate = new Date(inv.issue_date);
                      const now = new Date();
                      return invoiceDate.getMonth() === now.getMonth() &&
                             invoiceDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Invoices;
