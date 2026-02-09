import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { formatPhoneE164, validatePhoneE164 } from '@/lib/phoneUtils';
import { Loader2, AlertCircle, X } from 'lucide-react';
import PatientPhonesManager from './PatientPhonesManager';
import PatientTagsManager from './PatientTagsManager';
import { supabase } from '@/lib/customSupabaseClient';

const PatientDialog = ({ open, onOpenChange, patient, onSave, initialData }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFormState = {
    name: '',
    cpf: '',
    phone: '',
    email: '', // Email pessoal
    fiscal_email: '', // Email para nota fiscal
    birthdate: '',
    gender: '',
    medical_history: '',
    allergies: '',
    medications: '',
    notes: '',
    // Campos fiscais e endereço detalhado
    document: '',
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [phones, setPhones] = useState([]);
  const [loadingPhones, setLoadingPhones] = useState(false);
  const [loadingZipCode, setLoadingZipCode] = useState(false);

  useEffect(() => {
    if (open) {
      if (patient) {
        // Lógica de preenchimento inteligente
        const suggestedDocument = patient.document || patient.cpf || '';
        // Tenta usar email fiscal, se não tiver, usa o pessoal como sugestão inicial
        const suggestedFiscalEmail = patient.fiscal_email || patient.email || '';

        setFormData({
          name: patient.name || '',
          cpf: patient.cpf || '',
          phone: patient.phone || '', // Mantido para compatibilidade com tabela antiga
          email: patient.email || '',
          fiscal_email: suggestedFiscalEmail,
          birthdate: patient.birthdate || '',
          gender: patient.gender || '',
          medical_history: patient.medical_history || '',
          allergies: patient.allergies || '',
          medications: patient.medications || '',
          notes: patient.notes || '',
          // Campos fiscais
          document: suggestedDocument,
          zip_code: patient.zip_code || '',
          street: patient.street || '',
          number: patient.number || '',
          complement: patient.complement || '',
          neighborhood: patient.neighborhood || '',
          city: patient.city || '',
          state: patient.state || ''
        });
        loadPatientPhones(patient);
      } else {
        // Novo paciente
        setFormData({
          ...initialFormState,
          name: initialData?.name || '',
          phone: initialData?.phone || '',
        });

        if (initialData?.phone) {
          setPhones([{
            phone: initialData.phone,
            is_primary: true,
            is_whatsapp: true,
            phone_type: 'mobile',
            tempId: Date.now()
          }]);
        } else {
          setPhones([]);
        }
      }
    }
  }, [patient, open, initialData]);

  const loadPatientPhones = async (currentPatient) => {
    try {
      setLoadingPhones(true);
      const { data, error } = await supabase
        .from('patient_phones')
        .select('*')
        .eq('patient_id', currentPatient.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Se não tiver na tabela nova, mas tiver na antiga (legado), carrega o legado
      if ((!data || data.length === 0) && currentPatient.phone) {
        setPhones([{
          phone: currentPatient.phone,
          phone_type: 'mobile',
          is_primary: true,
          is_whatsapp: true,
          tempId: 'legacy-phone'
        }]);
      } else {
        setPhones(data || []);
      }

    } catch (error) {
      console.error('Error loading patient phones:', error);
      setPhones([]);
    } finally {
      setLoadingPhones(false);
    }
  };

  const formatDocument = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const handleDocumentChange = (value) => {
    const formatted = formatDocument(value);
    setFormData({ ...formData, document: formatted });
  };

  const handleZipCodeChange = async (value) => {
    const cleanZipCode = value.replace(/\D/g, '');

    // Atualiza estado visual
    setFormData(prev => ({ ...prev, zip_code: value }));

    // Dispara busca apenas com 8 dígitos
    if (cleanZipCode.length === 8) {
      setLoadingZipCode(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanZipCode}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
          toast({
            title: "Endereço encontrado",
            description: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`,
          });
        } else {
          toast({
            variant: "destructive",
            title: "CEP não encontrado",
            description: "Verifique o número digitado."
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setLoadingZipCode(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let processedData = { ...formData };

      if (!processedData.name.trim()) {
        throw new Error("O nome é obrigatório.");
      }

      // Validação de Telefones
      const validPhones = phones.filter(p => p.phone && p.phone.trim());
      if (validPhones.length === 0) {
        throw new Error("Adicione pelo menos um telefone de contato.");
      }

      // Formatação E.164 para salvar
      for (const phone of validPhones) {
        const rawPhone = phone.phone;
        const formattedPhone = formatPhoneE164(rawPhone);

        if (!validatePhoneE164(formattedPhone)) {
          throw new Error(`Telefone inválido: ${phone.phone}. Use o formato (00) 00000-0000`);
        }
        phone.phone = formattedPhone;
      }

      // Garantir Primary
      if (!validPhones.some(p => p.is_primary)) {
        validPhones[0].is_primary = true;
      }

      // 1. Preparar Payload para tabela 'patients'
      // Define o telefone principal na coluna 'phone' (string) para compatibilidade
      const primaryPhone = validPhones.find(p => p.is_primary);
      if (primaryPhone) {
        processedData.phone = primaryPhone.phone;
      }

      // Garante documentos fiscais
      if (!processedData.document && processedData.cpf) {
        processedData.document = processedData.cpf;
      }
      if (!processedData.fiscal_email && processedData.email) {
        processedData.fiscal_email = processedData.email;
      }

      // Convert empty birthdate to null to avoid invalid date syntax error
      if (!processedData.birthdate) {
        processedData.birthdate = null;
      }

      // CRUCIAL: Remove o array 'phones' do objeto que vai para a tabela 'patients'
      // A tabela 'patients' não tem coluna 'phones' (array), isso causava o erro.
      const { phones: _ignoredPhones, ...patientPayload } = { ...processedData, phones: validPhones };

      // 2. Salvar Paciente (Upsert/Update na tabela 'patients')
      // onSave deve retornar o paciente salvo (ou o erro ser pego no catch)
      const savedResult = await onSave(patientPayload);

      // Se onSave não retornar o objeto (dependendo da implementação do pai), 
      // usamos o patient.id se for edição. Se for criação e onSave não retornar ID, 
      // não conseguiremos salvar os telefones extras agora (limitação do onSave atual).
      const targetId = patient?.id || savedResult?.data?.id || savedResult?.id;

      // 3. Salvar Telefones na tabela 'patient_phones'
      if (targetId) {
        const phonesToUpsert = validPhones.map(p => ({
          patient_id: targetId,
          phone: p.phone,
          phone_type: p.phone_type || 'mobile',
          contact_name: p.contact_name || null,
          is_primary: p.is_primary || false,
          is_whatsapp: p.is_whatsapp !== false, // Default true
          notes: p.notes || null,
          // Se tiver ID real (não temp/legacy), mantém para update
          ...(p.id && !String(p.id).startsWith('temp') && !String(p.id).startsWith('legacy') ? { id: p.id } : {})
        }));

        const { error: phonesError } = await supabase
          .from('patient_phones')
          .upsert(phonesToUpsert);

        if (phonesError) {
          console.error('Erro ao salvar telefones:', phonesError);
          toast({
            variant: "destructive",
            title: "Aviso",
            description: "Paciente salvo, mas houve erro ao salvar os telefones detalhados."
          });
        }
      }

    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Verifique os dados e tente novamente.",
      });
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setIsSubmitting(false);
  }, [open, patient]);

  return (

    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 rounded-3xl bg-white dark:bg-slate-900 border-none shadow-2xl flex flex-col">

        {/* Header - Fixed */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0 flex justify-between items-center">
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {patient ? 'Editar Paciente' : 'Novo Paciente'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 mt-0.5">
              {patient ? 'Atualize as informações do cadastro.' : 'Preencha os dados do novo paciente.'}
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-slate-200/50">
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="p-6">
            <TooltipProvider>
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="w-full grid grid-cols-3 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl h-12">
                  <TabsTrigger value="personal" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all font-semibold">Dados Pessoais</TabsTrigger>
                  <TabsTrigger value="fiscal" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all font-semibold">Fiscal & Endereço</TabsTrigger>
                  <TabsTrigger value="medical" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all font-semibold">Médico</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-5 mt-6 animate-in slide-in-from-left-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Ex: João da Silva"
                        className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cpf" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">CPF</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => {
                          const newCpf = e.target.value;
                          setFormData(prev => {
                            const shouldUpdateDocument = !prev.document || prev.document === prev.cpf;
                            return {
                              ...prev,
                              cpf: newCpf,
                              document: shouldUpdateDocument ? newCpf : prev.document
                            };
                          });
                        }}
                        placeholder="000.000.000-00"
                        className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">E-mail Pessoal</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          const newEmail = e.target.value;
                          setFormData(prev => {
                            const shouldUpdateFiscal = !prev.fiscal_email || prev.fiscal_email === prev.email;
                            return {
                              ...prev,
                              email: newEmail,
                              fiscal_email: shouldUpdateFiscal ? newEmail : prev.fiscal_email
                            };
                          });
                        }}
                        placeholder="joao@exemplo.com"
                        className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birthdate" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Nascimento</Label>
                      <Input
                        id="birthdate"
                        type="date"
                        value={formData.birthdate}
                        onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                        className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Gênero</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      >
                        <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Masculino</SelectItem>
                          <SelectItem value="female">Feminino</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Gerenciadores */}
                  <div className="mt-6 space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <PatientPhonesManager phones={phones} onChange={setPhones} />
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <PatientTagsManager
                        patientId={patient?.id}
                        patientTags={[]}
                        onTagsChange={() => { }}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="fiscal" className="space-y-5 mt-6 animate-in slide-in-from-left-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="document" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">CPF/CNPJ (Fiscal)</Label>
                      </div>
                      <Input
                        id="document"
                        value={formData.document}
                        onChange={(e) => handleDocumentChange(e.target.value)}
                        placeholder="Documento para NF"
                        className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email_fiscal" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">E-mail Fiscal</Label>
                      <Input
                        id="email_fiscal"
                        type="email"
                        value={formData.fiscal_email}
                        onChange={(e) => setFormData({ ...formData, fiscal_email: e.target.value })}
                        placeholder="financeiro@empresa.com"
                        className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2">
                      <div className="p-1 bg-white rounded shadow-sm"><Loader2 className="h-3 w-3 text-primary animate-spin" /></div> Endereço
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="zip_code" className="text-xs font-medium text-muted-foreground">CEP</Label>
                        <div className="relative">
                          <Input
                            id="zip_code"
                            value={formData.zip_code}
                            onChange={(e) => handleZipCodeChange(e.target.value)}
                            placeholder="00000-000"
                            maxLength={9}
                            className="rounded-xl bg-white dark:bg-slate-900 pr-9"
                          />
                          {loadingZipCode && (
                            <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-primary" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="street" className="text-xs font-medium text-muted-foreground">Rua</Label>
                        <Input
                          id="street"
                          value={formData.street}
                          onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                          className="rounded-xl bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="number" className="text-xs font-medium text-muted-foreground">Número</Label>
                        <Input
                          id="number"
                          value={formData.number}
                          onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                          className="rounded-xl bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="complement" className="text-xs font-medium text-muted-foreground">Complemento</Label>
                        <Input
                          id="complement"
                          value={formData.complement}
                          onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                          className="rounded-xl bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="neighborhood" className="text-xs font-medium text-muted-foreground">Bairro</Label>
                        <Input
                          id="neighborhood"
                          value={formData.neighborhood}
                          onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                          className="rounded-xl bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-xs font-medium text-muted-foreground">Cidade</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="rounded-xl bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state" className="text-xs font-medium text-muted-foreground">UF</Label>
                          <Select
                            value={formData.state}
                            onValueChange={(value) => setFormData({ ...formData, state: value })}
                          >
                            <SelectTrigger className="rounded-xl bg-white dark:bg-slate-900">
                              <SelectValue placeholder="UF" />
                            </SelectTrigger>
                            <SelectContent>
                              {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="medical" className="space-y-5 mt-6 animate-in slide-in-from-left-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="allergies" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Alergias</Label>
                      <Textarea
                        id="allergies"
                        value={formData.allergies}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        className="rounded-xl min-h-[100px] bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30"
                        placeholder="Liste alergias conhecidas..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="medications" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Medicamentos</Label>
                      <Textarea
                        id="medications"
                        value={formData.medications}
                        onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                        className="rounded-xl min-h-[100px] bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                        placeholder="Medicamentos contínuos..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medical_history" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Histórico Médico</Label>
                    <Textarea
                      id="medical_history"
                      value={formData.medical_history}
                      onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                      className="rounded-xl min-h-[100px] bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      placeholder="Histórico relevante..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Observações Gerais</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="rounded-xl min-h-[80px]"
                      placeholder="Outras informações..."
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="pt-6 mt-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 -mx-6 -mb-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="rounded-xl h-11">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 shadow-lg shadow-primary/25 min-w-[140px]">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {patient ? 'Salvar Tudo' : 'Cadastrar'}
                </Button>
              </div>
            </TooltipProvider>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatientDialog;