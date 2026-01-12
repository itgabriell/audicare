import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { FileText, Stethoscope } from 'lucide-react';

const ConsultationNotes = ({ data, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-blue-500" />
          Anamnese e Diagnóstico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Queixa Principal</Label>
          <Input 
            placeholder="Ex: Dificuldade auditiva no ouvido direito..." 
            value={data.complaint || ''}
            onChange={(e) => handleChange('complaint', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Histórico / Observações</Label>
          <Textarea 
            className="min-h-[120px] resize-none" 
            placeholder="Detalhes da consulta, histórico do problema..."
            value={data.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-blue-600 dark:text-blue-400 font-semibold">Diagnóstico</Label>
          <Textarea 
            className="min-h-[80px] border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10"
            placeholder="Conclusão diagnóstica..."
            value={data.diagnosis || ''}
            onChange={(e) => handleChange('diagnosis', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsultationNotes;