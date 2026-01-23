import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Cake, Phone, Mail, MapPin, Stethoscope, StickyNote, Link as LinkIcon, FileText } from 'lucide-react';
import PatientPhonesDisplay from './PatientPhonesDisplay';

const InfoItem = ({ icon: Icon, label, value, className }) => (
  <div className={`flex items-start gap-3 text-sm ${className}`}>
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
    <div className="flex-1">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground whitespace-pre-line">{value || 'Não informado'}</p>
    </div>
  </div>
);

const PatientInfo = ({ patient, contact }) => {
  // Formata data de nascimento com segurança
  const birthdate = patient.birthdate 
    ? new Date(patient.birthdate + 'T00:00:00').toLocaleDateString('pt-BR') 
    : 'Não informada';

  // Lógica inteligente para montar o endereço
  const getFormattedAddress = () => {
    // 1. Tenta montar com os campos estruturados (Novos)
    const parts = [];
    if (patient.street) parts.push(`${patient.street}, ${patient.number || 'S/N'}`);
    if (patient.complement) parts.push(patient.complement);
    if (patient.neighborhood) parts.push(patient.neighborhood);
    
    const cityState = [];
    if (patient.city) cityState.push(patient.city);
    if (patient.state) cityState.push(patient.state);
    if (cityState.length > 0) parts.push(cityState.join('/'));

    if (patient.zip_code) parts.push(`CEP: ${patient.zip_code}`);

    if (parts.length > 0) {
      return parts.join(' - ');
    }

    // 2. Se não tiver campos novos, usa o campo antigo (Legado)
    if (patient.address) return patient.address;

    return 'Não informado';
  };

  // Garante que a lista de telefones tenha dados (mesmo se vier do campo antigo)
  const getPhoneList = () => {
    if (patient.phones && patient.phones.length > 0) {
      return patient.phones;
    }
    // Fallback para legado se a tabela nova estiver vazia
    if (patient.phone) {
      return [{
        phone: patient.phone,
        is_primary: true,
        phone_type: 'mobile' // Assumindo celular por padrão no legado
      }];
    }
    return [];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Paciente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoItem icon={User} label="Nome" value={patient.name} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem icon={FileText} label="CPF" value={patient.cpf || patient.document} />
            <InfoItem icon={Cake} label="Data de Nascimento" value={birthdate} />
        </div>
        
        <div className="flex items-start gap-3 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-foreground mb-2">Telefones de Contato</p>
            <PatientPhonesDisplay phones={getPhoneList()} patientId={patient.id} />
          </div>
        </div>

        <InfoItem icon={Mail} label="E-mail" value={patient.email} />
        
        {/* Mostra email fiscal se for diferente do pessoal */}
        {patient.fiscal_email && patient.fiscal_email !== patient.email && (
            <InfoItem icon={Mail} label="E-mail para Nota Fiscal" value={patient.fiscal_email} />
        )}

        <InfoItem icon={MapPin} label="Endereço" value={getFormattedAddress()} />
        
        <div className="pt-4 border-t space-y-4">
            <InfoItem icon={Stethoscope} label="Histórico Médico" value={patient.medical_history} />
            <InfoItem icon={StickyNote} label="Alergias" value={patient.allergies} />
            <InfoItem icon={StickyNote} label="Medicamentos" value={patient.medications} />
            <InfoItem icon={StickyNote} label="Observações Gerais" value={patient.notes} />
        </div>

        {contact && (
          <div className="pt-4 border-t">
             <InfoItem icon={LinkIcon} label="Contato Associado (Chatwoot)" value={`Vinculado ID: ${contact.id}`} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientInfo;