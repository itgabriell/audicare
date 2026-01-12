import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getPatients } from '@/database';
import { useToast } from '@/components/ui/use-toast';
import { Search, UserPlus } from 'lucide-react';
import PatientDialog from '@/components/patients/PatientDialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AssociatePatientDialog = ({ open, onOpenChange, onAssociate, initialData }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
    } catch (error) {
      toast({
        title: "Erro ao carregar pacientes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      loadPatients();
    }
  }, [open, loadPatients]);

  const filteredPatients = patients.filter(patient =>
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.cpf?.includes(searchTerm)
  );

  const handleConfirm = () => {
    if (!selectedPatientId) {
      toast({
        title: "Nenhum paciente selecionado",
        description: "Por favor, selecione um paciente da lista.",
        variant: "destructive",
      });
      return;
    }
    onAssociate(selectedPatientId);
  };

  const handleSaveNewPatient = async (patientData) => {
    if (!user?.profile?.clinic_id) {
        toast({
            variant: "destructive",
            title: "Erro",
            description: "ID da clínica não encontrado.",
        });
        return;
    }

    try {
        // 1. Insert patient
        const { data: newPatient, error: patientError } = await supabase
            .from('patients')
            .insert({
                name: patientData.name,
                cpf: patientData.cpf,
                phone: patientData.phone, 
                email: patientData.email,
                birthdate: patientData.birthdate || null,
                gender: patientData.gender || null,
                address: patientData.address || null,
                medical_history: patientData.medical_history || null,
                allergies: patientData.allergies || null,
                medications: patientData.medications || null,
                notes: patientData.notes || null,
                clinic_id: user.profile.clinic_id
            })
            .select()
            .single();

        if (patientError) throw patientError;

        // 2. Insert phones
        if (patientData.phones && patientData.phones.length > 0) {
            const phonesToInsert = patientData.phones.map(p => ({
                patient_id: newPatient.id,
                phone: p.phone,
                phone_type: p.phone_type || 'mobile',
                is_primary: p.is_primary || false,
                is_whatsapp: p.is_whatsapp || false
            }));

            // Handle primary logic if needed, but array insert is simpler
            const { error: phonesError } = await supabase
                .from('patient_phones')
                .insert(phonesToInsert);

            if (phonesError) {
                console.error("Error saving phones:", phonesError);
                toast({
                    variant: "warning",
                    title: "Aviso",
                    description: "Paciente criado, mas houve erro ao salvar telefones.",
                });
            }
        }

        toast({
            title: "Sucesso",
            description: "Paciente cadastrado! Associando...",
        });

        // 3. Associate and Close
        setShowNewPatientDialog(false);
        onAssociate(newPatient.id);

    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Erro ao cadastrar",
            description: error.message,
        });
        throw error; // Let PatientDialog keep loading/open state
    }
  };

  return (
    <>
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>Associar Contato a Paciente</DialogTitle>
            <DialogDescription>
                Busque um paciente existente ou cadastre um novo.
            </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                    placeholder="Buscar por nome ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    />
                </div>
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setShowNewPatientDialog(true)}
                    title="Cadastrar Novo Paciente"
                >
                    <UserPlus className="h-4 w-4" />
                </Button>
            </div>
            
            <ScrollArea className="h-72 w-full rounded-md border">
                <div className="p-4">
                {loading ? (
                    <p>Carregando pacientes...</p>
                ) : filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => (
                    <div
                        key={patient.id}
                        className={`p-2 rounded-md cursor-pointer hover:bg-secondary ${selectedPatientId === patient.id ? 'bg-secondary font-semibold' : ''}`}
                        onClick={() => setSelectedPatientId(patient.id)}
                    >
                        <p>{patient.name}</p>
                        <p className="text-sm text-muted-foreground">{patient.cpf}</p>
                    </div>
                    ))
                ) : (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground mb-2">Nenhum paciente encontrado.</p>
                        <Button variant="link" onClick={() => setShowNewPatientDialog(true)}>
                            Cadastrar Novo Paciente
                        </Button>
                    </div>
                )}
                </div>
            </ScrollArea>
            </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={!selectedPatientId}>Confirmar Associação</Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>

        <PatientDialog 
            open={showNewPatientDialog}
            onOpenChange={setShowNewPatientDialog}
            patient={null}
            onSave={handleSaveNewPatient}
            initialData={initialData}
        />
    </>
  );
};

export default AssociatePatientDialog;
