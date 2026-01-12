import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Cake, Phone, Mail, MapPin, Stethoscope, StickyNote, Link as LinkIcon } from 'lucide-react';
import PatientPhonesDisplay from './PatientPhonesDisplay';

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 text-sm">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
    <div>
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">{value || 'Não informado'}</p>
    </div>
  </div>
);

const PatientInfo = ({ patient, contact }) => {
  const birthdate = patient.birthdate ? new Date(patient.birthdate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Paciente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoItem icon={User} label="Nome" value={patient.name} />
        <InfoItem icon={Cake} label="Data de Nascimento" value={birthdate} />
        
        <div className="flex items-start gap-3 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-foreground mb-2">Telefones de Contato</p>
            <PatientPhonesDisplay phones={patient.phones || []} patientId={patient.id} />
          </div>
        </div>

        <InfoItem icon={Mail} label="E-mail" value={patient.email} />
        <InfoItem icon={MapPin} label="Endereço" value={patient.address} />
        <InfoItem icon={Stethoscope} label="Histórico Médico" value={patient.medical_history} />
        <InfoItem icon={StickyNote} label="Observações" value={patient.notes} />
         {contact && (
          <InfoItem icon={LinkIcon} label="Contato Associado" value={`Sim, ID: ${contact.id.substring(0, 8)}...`} />
        )}
      </CardContent>
    </Card>
  );
};

export default PatientInfo;