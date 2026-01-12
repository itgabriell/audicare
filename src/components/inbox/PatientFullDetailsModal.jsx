import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { User, Phone, Mail, MapPin, Stethoscope, StickyNote, Calendar, FileText, Cake, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 text-sm py-2">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
    <div className="flex-1">
      <p className="font-medium text-muted-foreground text-xs uppercase mb-0.5">{label}</p>
      <p className="text-foreground">{value || 'Não informado'}</p>
    </div>
  </div>
);

const PatientFullDetailsModal = ({ open, onOpenChange, patientId }) => {
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open && patientId) {
      loadPatientData();
    }
  }, [open, patientId]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      
      // Buscar paciente
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Buscar agendamentos
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false })
        .limit(10);

      setAppointments(appointmentsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados do paciente:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar dados do paciente.' });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <User className="h-5 w-5" />
            Cadastro Completo do Paciente
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : patient ? (
          <ScrollArea className="h-[calc(90vh-120px)]">
            <div className="p-6">
              {/* Header com Avatar */}
              <div className="flex items-center gap-4 pb-6 border-b mb-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={patient.avatar_url} />
                  <AvatarFallback className="text-2xl">{patient.name?.[0] || 'P'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground">{patient.name || 'Sem nome'}</h2>
                  <div className="flex gap-2 mt-2">
                    {patient.cpf && <Badge variant="outline">CPF: {patient.cpf}</Badge>}
                    {patient.phone && <Badge variant="secondary">WhatsApp</Badge>}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
                  <TabsTrigger value="notes">Observações</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                      <InfoItem icon={User} label="Nome Completo" value={patient.name} />
                      <InfoItem icon={CreditCard} label="CPF" value={patient.cpf} />
                      <InfoItem icon={Cake} label="Data de Nascimento" value={patient.birthdate ? format(new Date(patient.birthdate), 'dd/MM/yyyy', { locale: ptBR }) : null} />
                    </div>
                    <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                      <InfoItem icon={Phone} label="Telefone" value={patient.phone} />
                      <InfoItem icon={Mail} label="E-mail" value={patient.email} />
                      <InfoItem icon={MapPin} label="Endereço" value={patient.address} />
                    </div>
                  </div>
                  {patient.notes && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <StickyNote className="h-4 w-4 text-yellow-600" />
                        <p className="font-semibold text-sm text-yellow-900 dark:text-yellow-200">Observações Gerais</p>
                      </div>
                      <p className="text-sm text-yellow-900/80 dark:text-yellow-200/80">{patient.notes}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="appointments" className="mt-6">
                  {appointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum agendamento encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appointments.map((apt) => (
                        <div key={apt.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={apt.status === 'completed' ? 'default' : apt.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                  {apt.status}
                                </Badge>
                                <span className="text-sm font-medium">{apt.appointment_type}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(apt.appointment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                              {apt.professional_name && (
                                <p className="text-xs text-muted-foreground mt-1">Profissional: {apt.professional_name}</p>
                              )}
                              {apt.notes && (
                                <p className="text-sm mt-2 text-foreground">{apt.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="mt-6">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Observações gerais sobre o paciente</p>
                    <p className="text-foreground whitespace-pre-wrap">{patient.notes || 'Nenhuma observação registrada.'}</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            <p>Paciente não encontrado</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PatientFullDetailsModal;

