import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Pill, ClipboardList } from 'lucide-react';

const TreatmentPlan = ({ data, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-green-600" />
          Plano de Tratamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Conduta / Procedimentos</Label>
          <Textarea 
            className="min-h-[100px]" 
            placeholder="Descreva o plano de tratamento, orientações e procedimentos a serem realizados..."
            value={data.treatment_plan || ''}
            onChange={(e) => handleChange('treatment_plan', e.target.value)}
          />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
           <div className="flex items-center gap-2 mb-2">
                <Pill className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Prescrição de Medicamentos</span>
           </div>
           <p className="text-xs text-muted-foreground mb-3">
               Funcionalidade de prescrição digital em breve. Use o campo de conduta acima por enquanto.
           </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TreatmentPlan;