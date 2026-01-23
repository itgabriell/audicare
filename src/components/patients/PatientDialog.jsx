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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto md:max-w-2xl md:max-h-[90vh] w-full h-full md:h-auto md:w-auto p-0 md:p-6">
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-10">
          <DialogTitle className="text-lg font-semibold">{patient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="hidden md:block">
          <DialogHeader>
            <DialogTitle>{patient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
            <DialogDescription>
              {patient ? 'Atualize as informações do paciente conforme necessário.' : 'Preencha os dados para cadastrar um novo paciente.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit}>
          <TooltipProvider>
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
                <TabsTrigger value="fiscal">Dados Fiscais/Endereço</TabsTrigger>
                <TabsTrigger value="medical">Dados Médicos</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Ex: João da Silva"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => {
                          const newCpf = e.target.value;
                          setFormData(prev => {
                              // Se doc fiscal vazio ou igual ao antigo, atualiza junto
                              const shouldUpdateDocument = !prev.document || prev.document === prev.cpf;
                              return { 
                                  ...prev, 
                                  cpf: newCpf,
                                  document: shouldUpdateDocument ? newCpf : prev.document 
                              };
                          });
                      }}
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail Pessoal</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                          const newEmail = e.target.value;
                          setFormData(prev => {
                              // Se email fiscal vazio ou igual ao antigo, atualiza junto
                              const shouldUpdateFiscal = !prev.fiscal_email || prev.fiscal_email === prev.email;
                              return {
                                  ...prev,
                                  email: newEmail,
                                  fiscal_email: shouldUpdateFiscal ? newEmail : prev.fiscal_email
                              };
                          });
                      }}
                      placeholder="joao@exemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthdate">Data de Nascimento</Label>
                    <Input
                      id="birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gênero</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger>
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

                {/* Gerenciador de Telefones */}
                <PatientPhonesManager
                  phones={phones}
                  onChange={setPhones}
                />

                {/* Gerenciador de Tags */}
                <PatientTagsManager
                  patientId={patient?.id}
                  patientTags={[]} 
                  onTagsChange={() => {}}
                />
              </TabsContent>

              <TabsContent value="fiscal" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="document">CPF/CNPJ (Nota Fiscal)</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Usado para emissão de Nota Fiscal.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="document"
                      value={formData.document}
                      onChange={(e) => handleDocumentChange(e.target.value)}
                      placeholder="000.000.000-00 ou CNPJ"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="email_fiscal">E-mail para Nota Fiscal</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>E-mail onde a nota será enviada.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="email_fiscal"
                      type="email"
                      value={formData.fiscal_email} 
                      onChange={(e) => setFormData({ ...formData, fiscal_email: e.target.value })}
                      placeholder="email@empresa.com"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Endereço Completo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="zip_code">CEP</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Digite o CEP para buscar o endereço automaticamente</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="relative">
                        <Input
                          id="zip_code"
                          value={formData.zip_code}
                          onChange={(e) => handleZipCodeChange(e.target.value)}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                        {loadingZipCode && (
                          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="street">Rua</Label>
                      <Input
                        id="street"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        placeholder="Nome da rua"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        placeholder="123"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={formData.complement}
                        onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                        placeholder="Apto, bloco, etc."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        placeholder="Nome do bairro"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Nome da cidade"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => setFormData({ ...formData, state: value })}
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
                </div>
              </TabsContent>

              <TabsContent value="medical" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="allergies">Alergias</Label>
                      <Textarea
                      id="allergies"
                      value={formData.allergies}
                      onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                      className="min-h-[80px]"
                      placeholder="Liste alergias conhecidas..."
                      />
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="medications">Medicamentos em Uso</Label>
                      <Textarea
                      id="medications"
                      value={formData.medications}
                      onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                      className="min-h-[80px]"
                      placeholder="Medicamentos contínuos..."
                      />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medical_history">Histórico Médico</Label>
                  <Textarea
                    id="medical_history"
                    value={formData.medical_history}
                    onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                    className="min-h-[80px]"
                    placeholder="Descreva o histórico médico relevante..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações Gerais</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="min-h-[80px]"
                    placeholder="Outras informações..."
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {patient ? 'Salvar Alterações' : 'Cadastrar Paciente'}
              </Button>
            </DialogFooter>
          </TooltipProvider>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PatientDialog;