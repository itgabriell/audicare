import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { formatPhoneE164, validatePhoneE164 } from '@/lib/phoneUtils';
import { Loader2 } from 'lucide-react';
import PatientPhonesManager from './PatientPhonesManager';
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
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [phones, setPhones] = useState([]);
  const [loadingPhones, setLoadingPhones] = useState(false);

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
          notes: patient.notes || ''
        });
        loadPatientPhones(patient.id);
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
                phone_type: 'mobile'
            }]);
        } else {
            setPhones([]);
        }
      }
    }
  }, [patient, open, initialData]);

  const loadPatientPhones = async (patientId) => {
    try {
      setLoadingPhones(true);
      const { data, error } = await supabase
        .from('patient_phones')
        .select('*')
        .eq('patient_id', patientId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPhones(data || []);
    } catch (error) {
      console.error('Error loading patient phones:', error);
      setPhones([]);
    } finally {
      setLoadingPhones(false);
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

        // Validar cada telefone
        for (const phone of validPhones) {
            const formattedPhone = formatPhoneE164(phone.phone);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{patient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Gerenciador de Telefones */}
          <PatientPhonesManager
            phones={phones}
            onChange={setPhones}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {patient ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PatientDialog;
