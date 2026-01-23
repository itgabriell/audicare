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
    email: '',
    birthdate: '',
    gender: '',
    address: '',
    medical_history: '',
    allergies: '',
    medications: '',
    notes: '',
    // Novos campos para nota fiscal
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
        setFormData({
          name: patient.name || '',
          cpf: patient.cpf || '',
          phone: patient.phone || '', // Mantido para compatibilidade
          email: patient.email || '',
          birthdate: patient.birthdate || '',
          gender: patient.gender || '',
          address: patient.address || '',
          medical_history: patient.medical_history || '',
          allergies: patient.allergies || '',
          medications: patient.medications || '',
          notes: patient.notes || '',
          // Novos campos fiscais
          document: patient.document || '',
          zip_code: patient.zip_code || '',
          street: patient.street || '',
          number: patient.number || '',
          complement: patient.complement || '',
          neighborhood: patient.neighborhood || '',
          city: patient.city || '',
          state: patient.state || ''
        });
        // Passamos o patient completo para poder ler o campo 'phone' antigo se necessário
        loadPatientPhones(patient);
      } else {
        // Pre-fill with initialData if provided (for new patients)
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
                tempId: Date.now() // Importante: tempId para o Manager funcionar
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

      // LÓGICA DE FALLBACK: Se não tiver telefones na tabela nova, mas tiver no cadastro antigo
      if ((!data || data.length === 0) && currentPatient.phone) {
          console.log("Usando telefone legado para edição...");
          setPhones([{
              phone: currentPatient.phone,
              phone_type: 'mobile',
              is_primary: true,
              is_whatsapp: true,
              tempId: 'legacy-phone' // ID temporário para o React
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
      // CPF
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // CNPJ
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const handleDocumentChange = (value) => {
    const formatted = formatDocument(value);
    setFormData({ ...formData, document: formatted });
  };

  const handleZipCodeChange = async (value) => {
    const cleanZipCode = value.replace(/\D/g, '');
    setFormData({ ...formData, zip_code: value });

    // Buscar CEP quando tiver 8 dígitos
    if (cleanZipCode.length === 8) {
      setLoadingZipCode(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanZipCode}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            zip_code: value,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }));
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
        
        // Basic Validation
        if (!processedData.name.trim()) {
            throw new Error("O nome é obrigatório.");
        }

        // Validar telefones
        const validPhones = phones.filter(p => p.phone && p.phone.trim());
        if (validPhones.length === 0) {
            throw new Error("Adicione pelo menos um telefone de contato.");
        }

        // Validar cada telefone e formatar para salvar (E.164)
        for (const phone of validPhones) {
            // Remove máscara antes de validar/salvar
            const rawPhone = phone.phone; 
            const formattedPhone = formatPhoneE164(rawPhone);
            
            if (!validatePhoneE164(formattedPhone)) {
                throw new Error(`Telefone inválido: ${phone.phone}. Use o formato (00) 00000-0000`);
            }
            phone.phone = formattedPhone;
        }

        // Garantir que há um telefone principal
        if (!validPhones.some(p => p.is_primary)) {
            validPhones[0].is_primary = true;
        }
        
        // Adicionar telefones ao processedData
        processedData.phones = validPhones;
        
        // Manter phone principal para compatibilidade (se houver)
        const primaryPhone = validPhones.find(p => p.is_primary);
        if (primaryPhone) {
            processedData.phone = primaryPhone.phone;
        }
        
        // Let parent handle the async save
        await onSave(processedData);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Erro na validação",
            description: error.message,
        });
        // Stop loading state on error, keep dialog open
        setIsSubmitting(false); 
    }
    // Note: Success handling (closing dialog) is done by parent to ensure data is saved first
  };

  // Reset submitting state when dialog closes or patient changes
  useEffect(() => {
    setIsSubmitting(false);
  }, [open, patient]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto md:max-w-2xl md:max-h-[90vh] w-full h-full md:h-auto md:w-auto p-0 md:p-6">
        {/* Mobile Header with Close Button */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-10">
          <DialogTitle className="text-lg font-semibold">{patient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block">
          <DialogHeader>
            <DialogTitle>{patient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
            <DialogDescription>
              {patient ? 'Atualize as informações do paciente conforme necessário.' : 'Preencha os dados para cadastrar um novo paciente.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Hidden title for screen readers when mobile header is shown */}
        <div className="sr-only md:not-sr-only">
          <DialogTitle>{patient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
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
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

                {/* Gerenciador de Telefones - Agora com foco corrigido */}
                <PatientPhonesManager
                  phones={phones}
                  onChange={setPhones}
                />

                {/* Gerenciador de Tags */}
                <PatientTagsManager
                  patientId={patient?.id}
                  patientTags={[]} // Será carregado internamente pelo componente
                  onTagsChange={() => {}}
                />

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Rua, Número, Bairro, Cidade"
                  />
                </div>
              </TabsContent>

              <TabsContent value="fiscal" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="document">CPF/CNPJ</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Obrigatório para emissão de Nota Fiscal</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="document"
                      value={formData.document}
                      onChange={(e) => handleDocumentChange(e.target.value)}
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
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
                          <p>Obrigatório para emissão de Nota Fiscal</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="email_fiscal"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="nota@empresa.com"
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
                            <p>Obrigatório para emissão de Nota Fiscal</p>
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
                          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="street">Rua</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Obrigatório para emissão de Nota Fiscal</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="street"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        placeholder="Nome da rua"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="number">Número</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Obrigatório para emissão de Nota Fiscal</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
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
                      <div className="flex items-center gap-2">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Obrigatório para emissão de Nota Fiscal</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="neighborhood"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        placeholder="Nome do bairro"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Obrigatório para emissão de Nota Fiscal</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Nome da cidade"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="state">Estado</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Obrigatório para emissão de Nota Fiscal</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
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