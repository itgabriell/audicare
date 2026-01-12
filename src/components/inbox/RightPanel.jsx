import React, { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tag, Calendar, Mail, Phone, PlusCircle, MessageSquare as MessageSquareText, User, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useContactDetails } from '@/hooks/useContactDetails';
import AppointmentModal from './AppointmentModal';
import AssociatePatientDialog from './AssociatePatientDialog';
import { linkContactToPatient } from '@/lib/messaging';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppointments } from '@/hooks/useAppointments';
import { Badge } from '@/components/ui/badge';

const RightPanel = ({ contactId, onClose }) => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
    const [isAssociateDialogOpen, setIsAssociateDialogOpen] = useState(false);

    const {
        contact,
        loading,
        error,
        refetch,
    } = useContactDetails(contactId);

    const { appointments } = useAppointments();

    const safeContact = contact || {};
    const contactName = safeContact.name || safeContact.phone || 'Desconhecido';

    const patientAppointments = useMemo(() => {
        if (!safeContact.patient_id) return [];
        return appointments
            .filter(app => app.patient_id === safeContact.patient_id)
            .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
    }, [appointments, safeContact.patient_id]);

    const getStatusColor = (status) => {
        switch(status) {
            case 'confirmed': return 'bg-green-100 text-green-800 hover:bg-green-100';
            case 'completed': return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
            case 'canceled': return 'bg-red-100 text-red-800 hover:bg-red-100';
            case 'no-show': return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
            default: return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
        }
    };

    const translateStatus = (status) => {
         switch(status) {
            case 'confirmed': return 'Confirmado';
            case 'completed': return 'Concluído';
            case 'canceled': return 'Cancelado';
            case 'no-show': return 'Não compareceu';
            case 'scheduled': return 'Agendado';
            default: return status;
        }
    }

    const handleAssociatePatient = async (patientId) => {
        try {
            await linkContactToPatient(contactId, patientId);
            toast({
                title: 'Sucesso',
                description: 'Contato associado ao paciente com sucesso!',
            });
            setIsAssociateDialogOpen(false);
            refetch();
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Erro ao associar',
                description: error.message || 'Erro ao associar contato.',
            });
        }
    };

    const handleProfileClick = () => {
        if (safeContact.patient_id) {
            navigate(`/patients/${safeContact.patient_id}`);
        } else {
            setIsAssociateDialogOpen(true);
        }
    };

    const showToast = () => {
        toast({
            title: "🚧 Funcionalidade em breve!",
            description: "Você poderá executar esta ação em futuras atualizações. 🚀",
        });
    };

    if (!contactId) {
        return (
            <aside className="w-full lg:w-96 border-l bg-card flex-shrink-0 p-6 flex items-center justify-center text-center text-muted-foreground">
                <p>Selecione uma conversa para ver os detalhes do contato.</p>
            </aside>
        );
    }

    if (loading) {
        return (
             <aside className="w-full lg:w-96 border-l bg-card flex-shrink-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </aside>
        );
    }

    return (
        <aside className="w-full lg:w-96 border-l bg-card flex-shrink-0 flex flex-col h-full">
            <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Detalhes do Contato</h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
                    <X className="h-5 w-5" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-6 text-center border-b">
                    <Avatar className="h-20 w-20 mx-auto">
                        <AvatarImage src={safeContact.avatar_url} alt={contactName} />
                        <AvatarFallback className="text-3xl">{contactName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <h3 className="mt-4 text-xl font-semibold">{contactName}</h3>
                    {safeContact.patient_id && (
                        <div className="flex items-center justify-center gap-2 mt-2 text-sm text-green-600 font-medium">
                            <User className="h-4 w-4" />
                            <span>Paciente Associado</span>
                        </div>
                    )}
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Tag className="h-4 w-4" />
                        <span>{safeContact.status || 'Lead'}</span>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground">Informações</h4>
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{safeContact.phone || 'Não informado'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{safeContact.email || 'Não informado'}</span>
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-3">Ações Rápidas</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsAppointmentOpen(true)}>
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Agendar
                            </Button>
                            <Button variant="outline" size="sm" onClick={showToast}>
                                <MessageSquareText className="h-4 w-4 mr-2" />
                                Template
                            </Button>
                             <Button 
                                variant={safeContact.patient_id ? "outline" : "default"} 
                                size="sm" 
                                className={cn("col-span-2", !safeContact.patient_id && "bg-blue-600 hover:bg-blue-700")}
                                onClick={handleProfileClick}
                             >
                                <User className="h-4 w-4 mr-2" />
                                {safeContact.patient_id ? 'Ver Perfil do Paciente' : 'Associar a Paciente'}
                            </Button>
                        </div>
                    </div>
                    
                    <Separator />

                    <Card>
                        <CardHeader className="p-4">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Histórico de Agendamentos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            {patientAppointments.length > 0 ? (
                                <div className="space-y-3">
                                    {patientAppointments.map(app => (
                                        <div key={app.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium">{format(new Date(app.appointment_date), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                                                <p className="text-xs text-muted-foreground">{app.appointment_type || 'Consulta'}</p>
                                            </div>
                                            <Badge variant="outline" className={cn("border-0 whitespace-nowrap", getStatusColor(app.status))}>
                                                {translateStatus(app.status)}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-sm text-muted-foreground">
                                    <p>Nenhum agendamento encontrado.</p>
                                    <Button variant="link" size="sm" onClick={() => setIsAppointmentOpen(true)}>Criar novo agendamento</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>

            <AppointmentModal
                isOpen={isAppointmentOpen}
                onClose={() => setIsAppointmentOpen(false)}
                patientName={safeContact.patient_name || contactName}
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
        </aside>
    );
};

export default RightPanel;
