import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Edit, Trash2, User, MessageCircle, Stethoscope } from 'lucide-react';
import { getPatientById, deletePatient, updatePatient, getContactByPatientId } from '@/database';

import PatientInfo from '@/components/patients/PatientInfo';
import PatientHistory from '@/components/patients/PatientHistory';
import PatientDocuments from '@/components/patients/PatientDocuments';
import PatientAppointments from '@/components/patients/PatientAppointments';
import PatientDialog from '@/components/patients/PatientDialog';
import InvoiceList from '@/components/patients/InvoiceList';
import Breadcrumbs from '@/components/ui/breadcrumbs';

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [patient, setPatient] = useState(null);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchPatient = async () => {
    try {
      const data = await getPatientById(id);
      if (data) {
        setPatient(data);
        const associatedContact = await getContactByPatientId(data.id);
        setContact(associatedContact);
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Paciente não encontrado.' });
        navigate('/patients');
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar paciente.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatient(); }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir este paciente?')) {
      try {
        await deletePatient(id);
        toast({ title: 'Sucesso', description: 'Paciente excluído com sucesso.' });
        navigate('/patients');
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
      }
    }
  };

  const handleUpdate = async (updatedData) => {
    try {
      await updatePatient(id, updatedData);
      toast({ title: 'Sucesso', description: 'Dados atualizados com sucesso.' });
      setIsDialogOpen(false);
      fetchPatient();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
  };
  
  const handleMessage = () => {
      if (contact) {
          navigate(`/inbox?phone=${contact.phone}`);
      } else {
          // Usar telefone principal ou primeiro disponível com WhatsApp
          const primaryPhone = patient.phones?.find(p => p.is_primary && p.is_whatsapp) 
            || patient.phones?.find(p => p.is_whatsapp)
            || patient.phones?.find(p => p.is_primary)
            || patient.phones?.[0];
          
          const phoneToUse = primaryPhone?.phone || patient.phone;
          
          if (phoneToUse) {
              navigate(`/inbox?phone=${phoneToUse.replace(/\D/g, '')}`);
      } else {
          toast({ variant: "destructive", title: "Indisponível", description: "Paciente sem telefone ou contato vinculado." });
          }
      }
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;
  if (!patient) return null;

  return (
    <div className="space-y-6 pb-10">
      <Helmet>
        <title>{patient.name} - Detalhes</title>
      </Helmet>

      <Breadcrumbs items={[
          { label: 'Pacientes', href: '/patients' },
          { label: patient.name }
      ]} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/patients')}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold hidden md:block">Detalhes do Paciente</h1>
        </div>
        
        <div className="flex gap-2 flex-wrap">
           <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={handleMessage}>
             <MessageCircle className="mr-2 h-4 w-4" /> Mensagem
           </Button>
           <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate(`/patients/${id}/care`)}>
            <Stethoscope className="mr-2 h-4 w-4" /> Atendimento
          </Button>
          <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
        <Avatar className="h-24 w-24 text-2xl">
          <AvatarImage src={patient.avatar_url} />
          <AvatarFallback>{patient.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{patient.name}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            <Badge variant="secondary" className="text-sm"><User className="mr-1 h-3 w-3" /> Paciente</Badge>
            {patient.birthdate && (
               <Badge variant="outline" className="text-sm">
                {new Date().getFullYear() - new Date(patient.birthdate).getFullYear()} anos
               </Badge>
            )}
            {contact && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">WhatsApp Vinculado</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">{patient.notes || 'Sem observações adicionais.'}</p>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full justify-start h-12 bg-transparent border-b rounded-none p-0 space-x-6 overflow-x-auto">
          <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Informações</TabsTrigger>
          <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Histórico Médico</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Documentos</TabsTrigger>
           <TabsTrigger value="appointments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Agendamentos</TabsTrigger>
           <TabsTrigger value="invoices" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">Notas Fiscais</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="info"><PatientInfo patient={patient} contact={contact} /></TabsContent>
          <TabsContent value="history"><PatientHistory patient={patient} /></TabsContent>
          <TabsContent value="documents"><PatientDocuments patientId={id} /></TabsContent>
          <TabsContent value="appointments"><PatientAppointments patientId={id} /></TabsContent>
          <TabsContent value="invoices"><InvoiceList patientId={id} /></TabsContent>
        </div>
      </Tabs>

      <PatientDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} patient={patient} onSave={handleUpdate} />
    </div>
  );
};

export default PatientDetails;
