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
      whileHover={{ y: -4, boxShadow: '0 10px 20px -5px rgb(0 0 0 / 0.1)' }}
      className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 flex flex-col justify-between transition-all group"
    >
      <div>
        <div className="flex items-start justify-between mb-4 cursor-pointer" onClick={handleCardClick}>
          <div className="flex items-center gap-3 w-full overflow-hidden">
            <div className="relative w-12 h-12 flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/30 rounded-2xl flex items-center justify-center text-primary font-bold text-lg shadow-inner">
                {patient.name?.charAt(0) || 'P'}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-primary transition-colors font-sans text-lg">
                {patient.name}
              </h3>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded tracking-wider">CPF</span>
                {patient.cpf ? `${patient.cpf.slice(0, 3)}.${patient.cpf.slice(3, 6)}.${patient.cpf.slice(6, 9)}-${patient.cpf.slice(9)}` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          {/* Telefones */}
          {(patient.phone || (patient.phones && patient.phones.length > 0)) && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0 text-sm">
                  {(() => {
                    const primaryPhone = patient.phones?.find(p => p.is_primary) || patient.phones?.[0];
                    const displayPhone = primaryPhone?.phone || patient.phone;
                    return <span className="truncate block font-medium text-slate-700 dark:text-slate-300">{displayPhone}</span>;
                  })()}
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-100 hover:text-green-700 rounded-lg transition-colors" onClick={handleWhatsAppClick}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>WhatsApp</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {patient.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{patient.email}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
        <Button variant="ghost" size="sm" className="w-full text-slate-500 hover:text-slate-900 rounded-xl" onClick={handleEdit}>
          <Edit className="h-3.5 w-3.5 mr-2" /> Editar
        </Button>
        <Button variant="ghost" size="sm" className="w-full text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
        </Button>
      </div>
    </motion.div>
  );
};

export default memo(PatientCard);
