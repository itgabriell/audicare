import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useContactDetails } from '@/hooks/useContactDetails';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Mail, CalendarDays, User2, Copy, AlertCircle, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import AppointmentModal from './AppointmentModal';
import LeadStatusSection from './LeadStatusSection';
import AssociatePatientDialog from './AssociatePatientDialog';
import { linkContactToPatient } from '@/lib/messaging';

const ContactPanel = ({ contactId }) => {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssociateDialogOpen, setIsAssociateDialogOpen] = useState(false);
  const [leadStatus, setLeadStatus] = useState('Em atendimento'); // Mock status

  const {
    contact,
    loading,
    error,
    refetch,
  } = useContactDetails(contactId);

  const safeContact = contact || {};

  const handleAssociatePatient = async (patientId) => {
    try {
        await linkContactToPatient(contactId, patientId);
        toast({
            title: 'Sucesso',
            description: 'Contato associado ao paciente com sucesso!',
        });
        setIsAssociateDialogOpen(false);
        refetch(); // Refresh contact details to update UI
    } catch (error) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: 'Erro ao associar',
            description: error.message || 'Erro ao associar contato.',
        });
    }
  };

  if (!contactId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-background/50">
        <User2 className="h-12 w-12 text-muted-foreground/50 mb-4" strokeWidth={1.5} />
        <h3 className="font-semibold text-base text-foreground">Nenhum contato selecionado</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Escolha uma conversa para ver os detalhes do contato.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-6 p-4 bg-background/50">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-background/50">
        <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" strokeWidth={1.5} />
        <h3 className="font-semibold text-base text-foreground">Erro ao carregar</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Não foi possível carregar os dados do contato.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={refetch}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const handleCopy = (value, label) => {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => {
        toast({
          title: 'Copiado!',
          description: `${label} copiado para a área de transferência.`,
        });
      })
      .catch(() => {
        toast({
          variant: 'destructive',
          title: 'Erro ao copiar',
          description: 'Não foi possível copiar o valor.',
        });
      });
  };

  const handleChangeStage = (newStatus) => {
    setLeadStatus(newStatus);
    toast({
      title: 'Status do Lead Atualizado (UI)',
      description: `Status alterado para ${newStatus}. A integração com o banco de dados será implementada.`,
    });
  };
  
  // Consistent contact name and avatar URL from contact object
  const displayName = safeContact.name || 'Contato sem nome';
  const avatarUrl = safeContact.avatar_url;

  return (
    <>
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patientName={safeContact.patient_name || displayName}
        contactId={contactId}
        patientId={safeContact.patient_id}
      />
      <AssociatePatientDialog
        open={isAssociateDialogOpen}
        onOpenChange={setIsAssociateDialogOpen}
        onAssociate={handleAssociatePatient}
        initialData={{
            name: safeContact.name,
            phone: safeContact.phone
        }}
      />
      <div className="h-full flex flex-col bg-background/50">
        <div className="p-4 border-b flex flex-col items-center text-center gap-3 flex-shrink-0">
          {/* Avatar component for consistent display */}
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="text-xl">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {displayName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {safeContact.phone || 'Telefone não informado'}
            </p>
            {safeContact.patient_id && (
                <p className="text-xs text-green-600 font-medium mt-1">
                    Paciente Associado
                </p>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            <LeadStatusSection
              currentStatus={leadStatus}
              onChangeStage={handleChangeStage}
            />

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contato
              </p>

              <div className="flex items-center justify-between gap-2 group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">
                    {safeContact.phone || 'Não informado'}
                  </span>
                </div>
                {safeContact.phone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleCopy(safeContact.phone, 'Telefone')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">
                    {safeContact.email || 'Não informado'}
                  </span>
                </div>
                {safeContact.email && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleCopy(safeContact.email, 'E-mail')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Observações
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {safeContact.notes || 'Nenhuma observação registrada.'}
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t flex flex-col gap-2 flex-shrink-0">
          {safeContact.patient_id ? (
            <Button
                size="sm"
                className="w-full flex items-center gap-2"
                onClick={() => toast({ title: "🚧 Recurso em desenvolvimento", description: "Navegação para perfil do paciente em breve." })}
            >
                <User2 className="h-4 w-4" />
                Ver Perfil do Paciente
            </Button>
          ) : (
            <Button
                size="sm"
                className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => setIsAssociateDialogOpen(true)}
            >
                <UserPlus className="h-4 w-4" />
                Associar a Paciente
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="w-full flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <CalendarDays className="h-4 w-4" />
            Criar agendamento
          </Button>
        </div>
      </div>
    </>
  );
};

export default ContactPanel;
