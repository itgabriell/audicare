import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Printer, ArrowLeft, FileText } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// Components
import PatientHeader from '@/components/PatientCare/PatientHeader';
import VitalSigns from '@/components/PatientCare/VitalSigns';
import ConsultationNotes from '@/components/PatientCare/ConsultationNotes';
import TreatmentPlan from '@/components/PatientCare/TreatmentPlan';
import PatientDocuments from '@/components/patients/PatientDocuments';
import EvolutionHistory from '@/components/PatientCare/EvolutionHistory';
import FollowUpScheduling from '@/components/PatientCare/FollowUpScheduling';
import DocumentGenerator from '@/components/documents/DocumentGenerator';
import DocumentList from '@/components/documents/DocumentList';

const PatientCare = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState(null);
  const [consultationId, setConsultationId] = useState(null);
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [patientStatus, setPatientStatus] = useState('active');
  const [documentGeneratorOpen, setDocumentGeneratorOpen] = useState(false);
  
  // Clinical Data State
  const [consultationData, setConsultationData] = useState({
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    temperature: '',
    weight: '',
    height: '',
    complaint: '',
    notes: '',
    diagnosis: '',
    treatment_plan: ''
  });

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        setPatient(data);
        // Assuming 'status' field exists in patients table based on checklist requests
        // If not, this is just for UI state management in this session
        if (data.status) setPatientStatus(data.status); 
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Paciente não encontrado.' });
        navigate('/patients');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPatient();
  }, [id, navigate, toast]);

  const handleSave = async (status = 'draft') => {
    if (!patient || !user) return;
    setSaving(true);
    
    try {
      // 1. Prepare Clinical Data
      const payload = {
        patient_id: patient.id,
        clinic_id: patient.clinic_id,
        professional_id: user.id,
        status: status,
        ...consultationData,
        blood_pressure_systolic: consultationData.blood_pressure_systolic || null,
        blood_pressure_diastolic: consultationData.blood_pressure_diastolic || null,
        heart_rate: consultationData.heart_rate || null,
        temperature: consultationData.temperature || null,
        weight: consultationData.weight || null,
        height: consultationData.height || null,
        finalized_at: status === 'finalized' ? new Date().toISOString() : null
      };

      // 2. Insert/Update Consultation
      if (consultationId) {
        const { error } = await supabase
          .from('clinical_consultations')
          .update(payload)
          .eq('id', consultationId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('clinical_consultations')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        setConsultationId(data.id);
      }

      // 3. Update Patient Status if changed
      if (patientStatus && patientStatus !== patient.status) {
        // Only update if patients table allows/has status column, otherwise safe to skip or add column later
        /* 
        await supabase.from('patients').update({ status: patientStatus }).eq('id', patient.id); 
        */
      }

      toast({
        title: status === 'finalized' ? "Atendimento Finalizado!" : "Rascunho Salvo",
        description: "Dados salvos com sucesso.",
        className: status === 'finalized' ? "bg-green-100 border-green-500 text-green-800" : ""
      });
      
      if (status === 'finalized') {
          setRefreshHistory(prev => prev + 1);
          // Reset form for new consultation or navigate away? 
          // Usually stays on page but clears form or shows "Finished" state. 
          // For now, we just refresh history and keep user here.
          setConsultationId(null);
          setConsultationData({
             blood_pressure_systolic: '', blood_pressure_diastolic: '', heart_rate: '', temperature: '', weight: '', height: '',
             complaint: '', notes: '', diagnosis: '', treatment_plan: ''
          });
      }

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erro ao salvar", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  return (
    <div id="patient-care-container" className="container mx-auto p-4 pb-20 max-w-6xl">
      <Helmet>
        <title>Atendimento - {patient?.name}</title>
      </Helmet>

      <div className="no-print">
        <PatientHeader patient={patient} />
      </div>

      {/* Printable Header (Only visible in print) */}
      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-2xl font-bold">{patient?.name}</h1>
        <p className="text-sm">Data: {new Date().toLocaleDateString('pt-BR')} | Prontuário: {patient?.id?.slice(0,8)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Main Clinical Data */}
        <div className="lg:col-span-2 space-y-6">
          <VitalSigns 
            data={consultationData} 
            onChange={setConsultationData} 
          />
          
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="w-full no-print">
              <TabsTrigger value="current" className="flex-1">Consulta Atual</TabsTrigger>
              <TabsTrigger value="history" className="flex-1">Histórico Clínico</TabsTrigger>
              <TabsTrigger value="documents" className="flex-1">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-6 mt-4">
              <ConsultationNotes 
                data={consultationData} 
                onChange={setConsultationData} 
              />
              <TreatmentPlan 
                data={consultationData} 
                onChange={setConsultationData} 
              />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <EvolutionHistory patientId={id} refreshTrigger={refreshHistory} />
            </TabsContent>

            <TabsContent value="documents" className="mt-4 space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setDocumentGeneratorOpen(true)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar Documento
                </Button>
              </div>
              <DocumentList patientId={id} patient={patient} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Actions & Sidebar */}
        <div className="space-y-6 no-print">
          
          {/* Actions Card */}
          <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4 sticky top-6">
             <h3 className="font-semibold border-b pb-2">Ações do Atendimento</h3>
             
             <div className="space-y-2">
               <label className="text-xs font-medium text-muted-foreground">Status do Paciente</label>
               <Select value={patientStatus} onValueChange={setPatientStatus}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="active">Em Tratamento</SelectItem>
                   <SelectItem value="observation">Em Observação</SelectItem>
                   <SelectItem value="discharged">Alta Clínica</SelectItem>
                   <SelectItem value="archived">Arquivado</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             <div className="pt-2 space-y-3">
                <Button 
                    variant="outline"
                    className="w-full" 
                    onClick={() => handleSave('draft')} 
                    disabled={saving}
                >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Rascunho
                </Button>
                
                <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    onClick={() => handleSave('finalized')}
                    disabled={saving}
                >
                    Finalizar Atendimento
                </Button>

                <Button variant="secondary" className="w-full" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir Relatório
                </Button>
             </div>
          </div>

          {/* Scheduling Widget */}
          <FollowUpScheduling patientId={id} clinicId={patient?.clinic_id} />

        </div>
      </div>

      {/* Document Generator Dialog */}
      <DocumentGenerator
        open={documentGeneratorOpen}
        onClose={() => setDocumentGeneratorOpen(false)}
        patient={patient}
        consultationId={consultationId}
        onDocumentGenerated={(document) => {
          setDocumentGeneratorOpen(false);
          // Recarregar documentos se necessário
        }}
      />
    </div>
  );
};

export default PatientCare;