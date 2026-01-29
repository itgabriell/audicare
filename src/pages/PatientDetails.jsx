import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Edit, Trash2, User, MessageCircle, Stethoscope } from 'lucide-react';
import { getPatientById, deletePatient, updatePatient, getContactByPatientId, getPatientTags } from '@/database';

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
  const [patientTags, setPatientTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchPatient = async () => {
    try {
      const data = await getPatientById(id);
      if (data) {
        setPatient(data);

        // Tenta buscar contato associado (CRM)
        try {
          const associatedContact = await getContactByPatientId(data.id);
          setContact(associatedContact);
        } catch (e) {
          console.log("Sem contato CRM vinculado");
        }

        // Buscar tags do paciente (Separado para não quebrar a query principal)
        try {
          const tags = await getPatientTags(data.id);
          // Ajuste para suportar diferentes formatos de retorno de tags
          const formattedTags = tags.map(item => item.tags || item).filter(Boolean);
          setPatientTags(formattedTags);
        } catch (tagError) {
          console.warn('Não foi possível carregar tags do paciente:', tagError);
          setPatientTags([]);
        }
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
    if (contact && contact.phone) {
      navigate(`/inbox?phone=${contact.phone.replace(/\D/g, '')}`);
    } else {
      // Lógica simplificada: No seu banco atual, 'phone' é uma coluna direta, não uma lista.
      // Removemos a busca por 'phones.find' pois a tabela patient_phones não existe no seu schema.
      const phoneToUse = patient.phone;

      if (phoneToUse) {
        navigate(`/inbox?phone=${phoneToUse.replace(/\D/g, '')}`);
      } else {
        toast({ variant: "destructive", title: "Indisponível", description: "Paciente sem telefone cadastrado." });
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/patients')} className="h-11 w-11">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl md:text-2xl font-bold">Detalhes do Paciente</h1>
        </div>

        <div className="flex gap-2 flex-wrap w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none text-green-600 border-green-200 hover:bg-green-50 h-11" onClick={handleMessage}>
            <MessageCircle className="mr-2 h-4 w-4" /> Mensagem
          </Button>
          <Button className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 h-11" onClick={() => navigate(`/patients/${id}/care`)}>
            <Stethoscope className="mr-2 h-4 w-4" /> Atendimento
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none h-11" onClick={() => setIsDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </Button>
          <Button variant="destructive" size="icon" className="h-11 w-11" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl md:rounded-xl border p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-start text-center md:text-left">
        <Avatar className="h-20 w-20 md:h-24 md:w-24 text-2xl shadow-sm border-2 border-white dark:border-slate-800">
          <AvatarImage src={patient.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">{patient.name ? patient.name[0] : 'P'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{patient.name}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            <Badge variant="secondary" className="text-sm"><User className="mr-1 h-3 w-3" /> Paciente</Badge>
            {patient.birthdate && (
              <Badge variant="outline" className="text-sm">
                {new Date().getFullYear() - new Date(patient.birthdate).getFullYear()} anos
              </Badge>
            )}
            {contact && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">WhatsApp Vinculado</Badge>}

            {/* Tags do Paciente */}
            {patientTags.length > 0 && patientTags.map((tag, idx) => (
              <Badge
                key={tag.id || idx}
                variant="outline"
                className="text-xs"
                style={{
                  backgroundColor: tag.color ? `${tag.color}20` : '#e2e8f0',
                  borderColor: tag.color || '#cbd5e1',
                  color: tag.color || '#475569'
                }}
              >
                {tag.color && (
                  <div
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: tag.color }}
                  />
                )}
                {tag.name}
              </Badge>
            ))}
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