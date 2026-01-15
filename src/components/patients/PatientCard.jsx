import React, { useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Phone, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const PatientCard = ({ patient, onEdit, onDelete }) => {
  const navigate = useNavigate();

  const handleWhatsAppClick = useCallback((e) => {
    e.stopPropagation();
    // Usar telefone principal ou primeiro disponível
    const primaryPhone = patient.phones?.find(p => p.is_primary && p.is_whatsapp) 
      || patient.phones?.find(p => p.is_whatsapp)
      || patient.phones?.find(p => p.is_primary)
      || patient.phones?.[0];
    
    const phoneToUse = primaryPhone?.phone || patient.phone;
    
    if (phoneToUse) {
      navigate(`/inbox?phone=${phoneToUse.replace(/\D/g, '')}`);
    }
  }, [patient.phone, patient.phones, navigate]);

  const handleCardClick = useCallback(() => {
    navigate(`/patients/${patient.id}`);
  }, [patient.id, navigate]);

  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    onEdit(patient);
  }, [patient, onEdit]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete(patient.id);
  }, [patient.id, onDelete]);



  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
      className="bg-card rounded-xl shadow-sm border p-6 flex flex-col justify-between transition-all"
    >
      <div>
        <div className="flex items-start justify-between mb-4 cursor-pointer" onClick={handleCardClick}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
              <span className="text-primary font-semibold text-lg">
                {patient.name?.charAt(0) || 'P'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground hover:text-primary transition-colors">{patient.name}</h3>
              <p className="text-sm text-muted-foreground">CPF: {patient.cpf || '---'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {/* Exibir telefones - mostrar principal ou primeiro disponível */}
          {(patient.phone || (patient.phones && patient.phones.length > 0)) && (
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {(() => {
                    const primaryPhone = patient.phones?.find(p => p.is_primary) || patient.phones?.[0];
                    const displayPhone = primaryPhone?.phone || patient.phone;
                    const phoneCount = patient.phones?.length || (patient.phone ? 1 : 0);
                    return (
                      <>
                        <span className="truncate">{displayPhone}</span>
                        {phoneCount > 1 && (
                          <span className="text-xs ml-1 text-muted-foreground">
                            (+{phoneCount - 1} {phoneCount - 1 === 1 ? 'outro' : 'outros'})
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-50 hover:text-green-600 flex-shrink-0" onClick={handleWhatsAppClick}>
                            <MessageCircle className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Enviar mensagem</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate max-w-[180px]">{patient.email}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

      </div>
    </motion.div>
  );
};

export default memo(PatientCard);
