import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MessageSquare, CalendarPlus, DollarSign, TrendingUp, Tag, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const KanbanCard = ({
  lead,
  onOpenConversation,
  onScheduleFromLead,
  onEditLead,
}) => {
  
  // --- Formatação de Telefone ---
  const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    if (clean.length > 13 || clean.startsWith('33')) return `ID: ${clean.substring(0, 6)}...`;
    if (clean.length === 11) return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`;
    if (clean.length === 12 && clean.startsWith('55')) return `(${clean.substring(2, 4)}) ${clean.substring(4, 9)}-${clean.substring(9)}`;
    if (clean.length === 13 && clean.startsWith('55')) return `(${clean.substring(2, 4)}) ${clean.substring(4, 9)}-${clean.substring(9)}`;
    return phone;
  };

  const formatCurrency = (value) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getProbabilityColor = (prob) => {
    if (prob >= 70) return 'text-green-500';
    if (prob >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (score >= 50) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
  };

  // --- LÓGICA DE TEMPO DE ESPERA ---
  const getWaitStatus = () => {
      if (!lead.last_message_at) return null;
      
      const lastMsgDate = new Date(lead.last_message_at);
      const minutesWaiting = differenceInMinutes(new Date(), lastMsgDate);
      
      // Se já foi respondido (first_response_at > last_message_at), não está esperando
      if (lead.first_response_at && new Date(lead.first_response_at) > lastMsgDate) {
          return null;
      }

      if (minutesWaiting > 60) { // Mais de 1 hora
          return { color: 'text-red-500', bg: 'bg-red-50', label: 'Atrasado' };
      }
      if (minutesWaiting > 15) { // Mais de 15 min
          return { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Atenção' };
      }
      return { color: 'text-green-600', bg: 'bg-green-50', label: 'Novo' };
  };

  const waitStatus = getWaitStatus();
  const tags = Array.isArray(lead.tags) ? lead.tags : (lead.tags ? JSON.parse(lead.tags) : []);

  return (
    <motion.div
      layout
      onClick={() => onEditLead(lead)}
      className={`bg-card rounded-lg p-4 shadow-sm border cursor-pointer hover:shadow-md transition-all group hover:border-primary/20 relative overflow-hidden ${
          waitStatus?.label === 'Atrasado' ? 'border-l-4 border-l-red-500' : ''
      }`}
    >
      <div className="flex flex-col h-full gap-3">
        {/* Header com Nome e Status de Espera */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate">
                {lead.name || 'Lead sem nome'}
              </h4>
              
              {/* Indicador de Tempo de Espera */}
              {lead.last_message_at && (
                  <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(lead.last_message_at), { addSuffix: true, locale: ptBR })}
                      </span>
                      {waitStatus && (
                          <span className={`text-[10px] px-1.5 rounded-full font-medium ml-1 ${waitStatus.color} ${waitStatus.bg}`}>
                              {waitStatus.label}
                          </span>
                      )}
                  </div>
              )}
          </div>

          {lead.lead_score !== undefined && lead.lead_score > 0 && (
            <Badge variant="outline" className={`text-xs ${getScoreColor(lead.lead_score)}`}>
              {lead.lead_score}
            </Badge>
          )}
        </div>

        {/* Informações de Contato */}
        <div className="space-y-1.5">
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{formatPhoneNumber(lead.phone)}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
        </div>

        {/* Valor e Probabilidade */}
        {(lead.estimated_value || lead.probability !== undefined) && (
          <div className="flex items-center gap-3 pt-2 border-t border-border/50">
            {lead.estimated_value > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{formatCurrency(lead.estimated_value)}</span>
              </div>
            )}
            {lead.probability !== undefined && lead.probability > 0 && (
              <div className={`flex items-center gap-1.5 text-xs font-medium ${getProbabilityColor(lead.probability)}`}>
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{lead.probability}%</span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {tags.slice(0, 2).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                <Tag className="h-2.5 w-2.5 mr-1" />
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="mt-auto pt-3 border-t border-transparent group-hover:border-border transition-colors duration-300">
          <div className="flex justify-end items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {lead.phone && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenConversation(lead);
                    }}
                    className="h-8 w-8 hover:bg-green-50 hover:text-green-600"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="sr-only">Abrir conversa</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Abrir conversa</p>
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onScheduleFromLead(lead);
                  }}
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span className="sr-only">Agendar consulta</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Agendar consulta</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(KanbanCard);