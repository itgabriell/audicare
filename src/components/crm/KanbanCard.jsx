import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MessageSquare, CalendarPlus, DollarSign, TrendingUp, Tag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const KanbanCard = ({
  lead,
  onOpenConversation,
  onScheduleFromLead,
  onEditLead,
}) => {
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

  const tags = Array.isArray(lead.tags) ? lead.tags : (lead.tags ? JSON.parse(lead.tags) : []);

  return (
    <motion.div
      layout
      onClick={() => onEditLead(lead)}
      className="bg-card rounded-lg p-4 shadow-sm border cursor-pointer hover:shadow-md transition-all group hover:border-primary/20"
    >
      <div className="flex flex-col h-full gap-3">
        {/* Header com Nome e Score */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-foreground truncate flex-1">
            {lead.name || 'Lead sem nome'}
          </h4>
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
              <span className="truncate">{lead.phone}</span>
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
            {lead.estimated_value && (
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

        {/* Última Atividade */}
        {lead.last_activity_at && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        )}

        {/* Card Action Buttons: visíveis no hover */}
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
                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
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