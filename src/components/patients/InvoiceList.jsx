import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Plus, FileText, Receipt, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { InvoiceService } from '@/services/invoiceService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const InvoiceList = ({ patientId }) => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isEmittingInvoice, setIsEmittingInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    type: '',
    amount: '',
    description: '',
    paymentMethod: 'cash', // cash, installment, card, pix
    installments: '1',
    model: '', // para vendas
    quantity: '1', // para vendas
    emitForThirdParty: false, // emitir em nome de terceiros
    thirdPartyName: '',
    thirdPartyDocument: '',
    thirdPartyEmail: '',
    thirdPartyAddress: null
  });

  const [patientData, setPatientData] = useState(null);
  const [showDataValidation, setShowDataValidation] = useState(false);
  const [editingPatientData, setEditingPatientData] = useState(false);

  // Dados fictícios para demonstração
  const mockInvoices = [
    {
      id: '1',
      issued_at: '2024-01-15',
      amount: 150.00,
      status: 'authorized',
      link: 'https://example.com/invoice1.pdf'
    },
    {
      id: '2',
      issued_at: '2024-01-10',
      amount: 250.00,
      status: 'processing',
      link: null
    },
    {
      id: '3',
      issued_at: '2024-01-05',
      amount: 89.90,
      status: 'error',
      link: null
    }
  ];

  useEffect(() => {
    fetchInvoices();
  }, [patientId]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      // Tentar buscar do Supabase
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('patient_id', patientId)
        .order('issued_at', { ascending: false });

      if (error) {
        console.warn('Erro ao buscar invoices do Supabase:', error);
        // Usar dados fictícios se não conseguir buscar
        setInvoices(mockInvoices);
      } else {
        // Se não houver dados, usar mock
        setInvoices(data && data.length > 0 ? data : mockInvoices);
      }
    } catch (error) {
      console.error('Erro ao buscar invoices:', error);
      setInvoices(mockInvoices);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      authorized: { label: 'Autorizada', variant: 'default', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      processing: { label: 'Processando', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      error: { label: 'Erro', variant: 'destructive', className: 'bg-red-100 text-red-800 hover:bg-red-100' }
    };

    const config = statusMap[status] || { label: status, variant: 'outline' };

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleDownload = (pdfUrl) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      toast({
        variant: 'destructive',
        title: 'PDF não disponível',
        description: 'O PDF desta nota ainda não foi gerado.'
      });
    }
  };

  const validatePatientFiscalData = (patient) => {
    const requiredFields = [];
    const warnings = [];

    // CPF/CNPJ
    if (!patient.cpf && !patient.document) {
      requiredFields.push('CPF/CNPJ');
    }

    // Nome
    if (!patient.name && !patient.full_name) {
      requiredFields.push('Nome completo');
    }

    // Email
    if (!patient.email) {
      warnings.push('E-mail não informado');
    }

    // Endereço
    const address = patient.address || {};
    if (!address.zip_code && !patient.zip_code) {
      requiredFields.push('CEP');
    }
    if (!address.street && !patient.street && !patient.rua) {
      requiredFields.push('Rua/Logradouro');
    }
    if (!address.number && !patient.number && !patient.numero) {
      requiredFields.push('Número');
    }
    if (!address.neighborhood && !patient.neighborhood && !patient.bairro) {
      requiredFields.push('Bairro');
    }
    if (!address.city && !patient.city && !patient.cidade) {
      requiredFields.push('Cidade');
    }
    if (!address.state && !patient.state && !patient.estado) {
      requiredFields.push('Estado');
    }

    return { requiredFields, warnings, isValid: requiredFields.length === 0 };
  };

  const handleNewInvoice = async () => {
    try {
      // Buscar dados completos do paciente
      const { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error || !patient) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível carregar os dados do paciente.'
        });
        return;
      }

      setPatientData(patient);

      // Validar dados fiscais
      const validation = validatePatientFiscalData(patient);

      if (!validation.isValid) {
        setShowDataValidation(true);
      }

      setIsInvoiceModalOpen(true);
    } catch (error) {
      console.error('Erro ao carregar dados do paciente:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar dados do paciente.'
      });
    }
  };

  const handleFormChange = (field, value) => {
    setInvoiceForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmitInvoice = async () => {
    // Validação
    if (!invoiceForm.type || !invoiceForm.amount || !invoiceForm.description) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos para emitir a nota fiscal.'
      });
      return;
    }

    // Validação específica para vendas
    if (invoiceForm.type === 'sale' && (!invoiceForm.model || !invoiceForm.quantity)) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Para vendas, informe o modelo e quantidade do aparelho.'
      });
      return;
    }

    const amount = parseFloat(invoiceForm.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'Digite um valor válido para a nota fiscal.'
      });
      return;
    }

    // ALERTA DE CONFIRMAÇÃO PARA PRODUÇÃO
    const confirmMessage = `⚠️ ATENÇÃO: Você está prestes a emitir uma NOTA FISCAL REAL com valor de R$ ${formatCurrency(amount)}.

Esta ação é irreversível e gerará uma obrigação fiscal.

Tem certeza que deseja continuar?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsEmittingInvoice(true);

    try {
      // Buscar dados do paciente
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError || !patient) {
        throw new Error('Paciente não encontrado');
      }

      // Preparar dados da nota - usar dados do terceiro se selecionado
      let invoicePatientData = patient;

      if (invoiceForm.emitForThirdParty) {
        // Validação dos dados do terceiro
        if (!invoiceForm.thirdPartyName || !invoiceForm.thirdPartyDocument) {
          toast({
            variant: 'destructive',
            title: 'Dados do terceiro obrigatórios',
            description: 'Nome e CPF/CNPJ do terceiro são obrigatórios.'
          });
          return;
        }

        // Usar dados do terceiro para emissão
        invoicePatientData = {
          ...patient, // manter dados originais para registro
          patient_name: invoiceForm.thirdPartyName,
          patient_document: invoiceForm.thirdPartyDocument.replace(/\D/g, ''),
          patient_email: invoiceForm.thirdPartyEmail || patient.email,
          address: patient.address // manter endereço do paciente para consistência
        };
      }

      // Preparar dados da nota
      const invoiceData = {
        patient: invoicePatientData,
        serviceItem: {
          description: invoiceForm.description,
          name: invoiceForm.description
        },
        amount: amount,
        type: invoiceForm.type,
        paymentMethod: invoiceForm.paymentMethod,
        installments: parseInt(invoiceForm.installments),
        model: invoiceForm.model,
        quantity: parseInt(invoiceForm.quantity)
      };

      // Emitir nota fiscal
      const result = await InvoiceService.emitInvoice(invoiceData);

      if (result.success) {
        // Salvar no banco de dados local (invoices table)
        const invoiceRecord = {
          patient_id: patientId,
          type: invoiceForm.type,
          amount: amount,
          description: invoiceForm.description,
          payment_method: invoiceForm.paymentMethod,
          installments: parseInt(invoiceForm.installments),
          model: invoiceForm.model,
          quantity: parseInt(invoiceForm.quantity),
          status: 'authorized',
          issued_at: new Date().toISOString(),
          numero: result.invoice.numero,
          link: result.invoice.link,
          created_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('invoices')
          .insert(invoiceRecord);

        if (insertError) {
          console.warn('Erro ao salvar nota no banco local:', insertError);
          // Não falha a operação, apenas loga o erro
        }

        // Salvar em documentos
        const documentRecord = {
          patient_id: patientId,
          title: `Nota Fiscal ${result.invoice.numero}`,
          type: 'invoice',
          content: {
            invoice_number: result.invoice.numero,
            type: invoiceForm.type,
            amount: amount,
            description: invoiceForm.description,
            payment_method: invoiceForm.paymentMethod,
            installments: parseInt(invoiceForm.installments),
            model: invoiceForm.model,
            quantity: parseInt(invoiceForm.quantity),
            patient_name: patient.name,
            patient_document: patient.document || patient.cpf,
            issue_date: new Date().toISOString()
          },
          file_url: result.invoice.link,
          created_at: new Date().toISOString()
        };

        const { error: docError } = await supabase
          .from('documents')
          .insert(documentRecord);

        if (docError) {
          console.warn('Erro ao salvar documento:', docError);
        }

        // Aplicar tag "comprou" ao paciente
        if (invoiceForm.type === 'sale') {
          const { error: tagError } = await supabase
            .from('patient_tags')
            .upsert({
              patient_id: patientId,
              tag: 'comprou',
              created_at: new Date().toISOString()
            }, {
              onConflict: 'patient_id,tag'
            });

          if (tagError) {
            console.warn('Erro ao aplicar tag:', tagError);
          }
        }

        toast({
          title: 'Nota fiscal emitida!',
          description: `Nota ${result.invoice.numero} emitida com sucesso.`,
        });

        // Limpar formulário e fechar modal
        setInvoiceForm({
          type: '',
          amount: '',
          description: '',
          paymentMethod: 'cash',
          installments: '1',
          model: '',
          quantity: '1'
        });
        setIsInvoiceModalOpen(false);

        // Atualizar lista de notas
        fetchInvoices();
      } else {
        throw new Error(result.error || 'Erro na emissão da nota fiscal');
      }
    } catch (error) {
      console.error('Erro ao emitir nota fiscal:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na emissão',
        description: error.message || 'Ocorreu um erro ao emitir a nota fiscal.'
      });
    } finally {
      setIsEmittingInvoice(false);
    }
  };

  const getInvoiceTypeLabel = (type) => {
    const types = {
      'fono': 'NFS-e Fonoaudiologia',
      'maintenance': 'NFS-e Manutenção',
      'sale': 'NF-e Venda de Aparelho'
    };
    return types[type] || type;
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando notas fiscais...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Notas Fiscais</h2>
          <p className="text-sm text-muted-foreground">
            Histórico de notas fiscais emitidas para este paciente
          </p>
        </div>
        <Dialog
          open={isInvoiceModalOpen}
          onOpenChange={(open) => {
            setIsInvoiceModalOpen(open);
            if (!open) {
              // Reset form when modal closes
              setInvoiceForm({
                type: '',
                amount: '',
                description: '',
                paymentMethod: 'cash',
                installments: '1',
                model: '',
                quantity: '1',
                emitForThirdParty: false,
                thirdPartyName: '',
                thirdPartyDocument: '',
                thirdPartyEmail: '',
                thirdPartyAddress: null
              });
              setShowDataValidation(false);
              setEditingPatientData(false);
              setPatientData(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={handleNewInvoice} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Emitir Nova Nota
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Emitir Nota Fiscal
              </DialogTitle>
            </DialogHeader>

            {/* Validação de Dados Fiscais */}
            {showDataValidation && patientData && (
              <div className="mb-6 p-4 border border-orange-200 bg-orange-50 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Validação de Dados Fiscais
                </h3>
                {(() => {
                  const validation = validatePatientFiscalData(patientData);
                  return (
                    <div className="space-y-3">
                      {validation.requiredFields.length > 0 && (
                        <div>
                          <p className="text-sm text-orange-700 font-medium">Campos obrigatórios faltando:</p>
                          <ul className="text-sm text-orange-600 ml-4 list-disc">
                            {validation.requiredFields.map(field => (
                              <li key={field}>{field}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {validation.warnings.length > 0 && (
                        <div>
                          <p className="text-sm text-orange-700 font-medium">Avisos (não bloqueiam emissão):</p>
                          <ul className="text-sm text-orange-600 ml-4 list-disc">
                            {validation.warnings.map(warning => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPatientData(true)}
                        className="border-orange-300 text-orange-700 hover:bg-orange-100"
                      >
                        Editar Dados do Paciente
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Edição de Dados do Paciente */}
            {editingPatientData && patientData && (
              <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-4">Editar Dados Fiscais do Paciente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo *</Label>
                    <Input
                      value={patientData.name || patientData.full_name || ''}
                      onChange={(e) => setPatientData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label>CPF/CNPJ *</Label>
                    <Input
                      value={patientData.cpf || patientData.document || ''}
                      onChange={(e) => setPatientData(prev => ({ ...prev, cpf: e.target.value }))}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      value={patientData.email || ''}
                      onChange={(e) => setPatientData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label>CEP *</Label>
                    <Input
                      value={patientData.zip_code || patientData.address?.zip_code || ''}
                      onChange={(e) => setPatientData(prev => ({
                        ...prev,
                        zip_code: e.target.value,
                        address: { ...prev.address, zip_code: e.target.value }
                      }))}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Rua/Logradouro *</Label>
                    <Input
                      value={patientData.street || patientData.rua || patientData.address?.street || ''}
                      onChange={(e) => setPatientData(prev => ({
                        ...prev,
                        street: e.target.value,
                        address: { ...prev.address, street: e.target.value }
                      }))}
                      placeholder="Nome da rua"
                    />
                  </div>
                  <div>
                    <Label>Número *</Label>
                    <Input
                      value={patientData.number || patientData.numero || patientData.address?.number || ''}
                      onChange={(e) => setPatientData(prev => ({
                        ...prev,
                        number: e.target.value,
                        address: { ...prev.address, number: e.target.value }
                      }))}
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <Label>Complemento</Label>
                    <Input
                      value={patientData.address?.complement || ''}
                      onChange={(e) => setPatientData(prev => ({
                        ...prev,
                        address: { ...prev.address, complement: e.target.value }
                      }))}
                      placeholder="Apto 123"
                    />
                  </div>
                  <div>
                    <Label>Bairro *</Label>
                    <Input
                      value={patientData.neighborhood || patientData.bairro || patientData.address?.neighborhood || ''}
                      onChange={(e) => setPatientData(prev => ({
                        ...prev,
                        neighborhood: e.target.value,
                        address: { ...prev.address, neighborhood: e.target.value }
                      }))}
                      placeholder="Nome do bairro"
                    />
                  </div>
                  <div>
                    <Label>Cidade *</Label>
                    <Input
                      value={patientData.city || patientData.cidade || patientData.address?.city || ''}
                      onChange={(e) => setPatientData(prev => ({
                        ...prev,
                        city: e.target.value,
                        address: { ...prev.address, city: e.target.value }
                      }))}
                      placeholder="Nome da cidade"
                    />
                  </div>
                  <div>
                    <Label>Estado *</Label>
                    <Select
                      value={patientData.state || patientData.estado || patientData.address?.state || ''}
                      onValueChange={(value) => setPatientData(prev => ({
                        ...prev,
                        state: value,
                        address: { ...prev.address, state: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AC">AC</SelectItem>
                        <SelectItem value="AL">AL</SelectItem>
                        <SelectItem value="AP">AP</SelectItem>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="BA">BA</SelectItem>
                        <SelectItem value="CE">CE</SelectItem>
                        <SelectItem value="DF">DF</SelectItem>
                        <SelectItem value="ES">ES</SelectItem>
                        <SelectItem value="GO">GO</SelectItem>
                        <SelectItem value="MA">MA</SelectItem>
                        <SelectItem value="MT">MT</SelectItem>
                        <SelectItem value="MS">MS</SelectItem>
                        <SelectItem value="MG">MG</SelectItem>
                        <SelectItem value="PA">PA</SelectItem>
                        <SelectItem value="PB">PB</SelectItem>
                        <SelectItem value="PR">PR</SelectItem>
                        <SelectItem value="PE">PE</SelectItem>
                        <SelectItem value="PI">PI</SelectItem>
                        <SelectItem value="RJ">RJ</SelectItem>
                        <SelectItem value="RN">RN</SelectItem>
                        <SelectItem value="RS">RS</SelectItem>
                        <SelectItem value="RO">RO</SelectItem>
                        <SelectItem value="RR">RR</SelectItem>
                        <SelectItem value="SC">SC</SelectItem>
                        <SelectItem value="SP">SP</SelectItem>
                        <SelectItem value="SE">SE</SelectItem>
                        <SelectItem value="TO">TO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setEditingPatientData(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from('patients')
                          .update({
                            name: patientData.name,
                            cpf: patientData.cpf,
                            email: patientData.email,
                            zip_code: patientData.zip_code,
                            street: patientData.street,
                            number: patientData.number,
                            neighborhood: patientData.neighborhood,
                            city: patientData.city,
                            state: patientData.state,
                            address: patientData.address,
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', patientId);

                        if (error) throw error;

                        toast({
                          title: 'Dados atualizados!',
                          description: 'Os dados fiscais do paciente foram atualizados com sucesso.'
                        });

                        setEditingPatientData(false);
                        setShowDataValidation(false);
                      } catch (error) {
                        console.error('Erro ao atualizar dados:', error);
                        toast({
                          variant: 'destructive',
                          title: 'Erro',
                          description: 'Erro ao atualizar dados do paciente.'
                        });
                      }
                    }}
                  >
                    Salvar Dados
                  </Button>
                </div>
              </div>
            )}

            {/* Opção de Emissão para Terceiros */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="third-party"
                  checked={invoiceForm.emitForThirdParty}
                  onChange={(e) => handleFormChange('emitForThirdParty', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="third-party" className="text-sm font-medium">
                  Emitir em nome de terceiros (pai, mãe, responsável, etc.)
                </Label>
              </div>

              {invoiceForm.emitForThirdParty && (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
                  <h4 className="font-medium text-gray-800">Dados do Terceiro</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome Completo *</Label>
                      <Input
                        value={invoiceForm.thirdPartyName}
                        onChange={(e) => handleFormChange('thirdPartyName', e.target.value)}
                        placeholder="Nome do responsável"
                      />
                    </div>
                    <div>
                      <Label>CPF/CNPJ *</Label>
                      <Input
                        value={invoiceForm.thirdPartyDocument}
                        onChange={(e) => handleFormChange('thirdPartyDocument', e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>E-mail</Label>
                      <Input
                        value={invoiceForm.thirdPartyEmail}
                        onChange={(e) => handleFormChange('thirdPartyEmail', e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    <strong>Importante:</strong> A nota será emitida em nome desta pessoa, mas o atendimento continuará registrado no perfil do paciente atual.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="invoice-type">Tipo de Nota Fiscal *</Label>
                <Select value={invoiceForm.type} onValueChange={(value) => handleFormChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de nota" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fono">NFS-e Fonoaudiologia</SelectItem>
                    <SelectItem value="maintenance">NFS-e Manutenção de Aparelho</SelectItem>
                    <SelectItem value="sale">NF-e Venda de Aparelho</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campos específicos para venda de aparelho */}
              {invoiceForm.type === 'sale' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="invoice-model">Modelo do Aparelho</Label>
                    <Input
                      id="invoice-model"
                      placeholder="Ex: Phonak Audeo P90"
                      value={invoiceForm.model}
                      onChange={(e) => handleFormChange('model', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-quantity">Quantidade</Label>
                    <Input
                      id="invoice-quantity"
                      type="number"
                      min="1"
                      value={invoiceForm.quantity}
                      onChange={(e) => handleFormChange('quantity', e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="invoice-amount">Valor Total (R$)</Label>
                <Input
                  id="invoice-amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={invoiceForm.amount}
                  onChange={(e) => handleFormChange('amount', e.target.value)}
                />
                {invoiceForm.type === 'sale' && invoiceForm.quantity > 1 && invoiceForm.amount && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Valor unitário: {formatCurrency(parseFloat(invoiceForm.amount) / parseInt(invoiceForm.quantity || 1))}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="invoice-description">
                  {invoiceForm.type === 'sale' ? 'Descrição da Venda' : 'Descrição do Serviço'}
                </Label>
                <Textarea
                  id="invoice-description"
                  placeholder={
                    invoiceForm.type === 'sale'
                      ? "Ex: Venda de aparelho auditivo modelo XYZ"
                      : "Descreva o serviço prestado..."
                  }
                  value={invoiceForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Forma de pagamento */}
              <div>
                <Label htmlFor="payment-method">Forma de Pagamento</Label>
                <Select value={invoiceForm.paymentMethod} onValueChange={(value) => handleFormChange('paymentMethod', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">À Vista</SelectItem>
                    <SelectItem value="installment">Parcelado</SelectItem>
                    <SelectItem value="card">Cartão de Crédito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Número de parcelas se parcelado */}
              {invoiceForm.paymentMethod === 'installment' && (
                <div>
                  <Label htmlFor="installments">Número de Parcelas</Label>
                  <Select value={invoiceForm.installments} onValueChange={(value) => handleFormChange('installments', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione as parcelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}x {invoiceForm.amount && formatCurrency(parseFloat(invoiceForm.amount) / num)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {invoiceForm.amount && invoiceForm.installments > 1 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Valor da parcela: {formatCurrency(parseFloat(invoiceForm.amount) / parseInt(invoiceForm.installments))}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleEmitInvoice}
                  disabled={isEmittingInvoice}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isEmittingInvoice ? 'Emitindo...' : 'Emitir Nota'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma nota fiscal encontrada</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Ainda não foram emitidas notas fiscais para este paciente.
            </p>
            <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewInvoice}>
                  <Plus className="mr-2 h-4 w-4" />
                  Emitir Primeira Nota
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Nota Fiscal #{invoice.id}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Emitida em {formatDate(invoice.issued_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(invoice.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(invoice.link)}
                      disabled={!invoice.link}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(invoice.amount)}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {invoice.status === 'authorized' && invoice.link && (
                      <p>PDF disponível para download</p>
                    )}
                    {invoice.status === 'processing' && (
                      <p>Processando emissão...</p>
                    )}
                    {invoice.status === 'error' && (
                      <p>Erro na emissão - verificar dados fiscais</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
