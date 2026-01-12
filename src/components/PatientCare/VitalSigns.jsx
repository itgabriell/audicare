import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HeartPulse, Thermometer, Activity, Scale, Ruler } from 'lucide-react';

const VitalSigns = ({ data, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-red-500" />
          Sinais Vitais
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <HeartPulse className="h-3 w-3" />
            Pressão Arterial
          </Label>
          <div className="flex items-center gap-1">
            <Input 
              placeholder="120" 
              className="h-8 text-sm"
              value={data.blood_pressure_systolic || ''}
              onChange={(e) => handleChange('blood_pressure_systolic', e.target.value)}
            />
            <span className="text-muted-foreground">/</span>
            <Input 
              placeholder="80" 
              className="h-8 text-sm"
              value={data.blood_pressure_diastolic || ''}
              onChange={(e) => handleChange('blood_pressure_diastolic', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Freq. Cardíaca
          </Label>
          <div className="relative">
            <Input 
              placeholder="BPM" 
              className="h-8 text-sm pr-8"
              value={data.heart_rate || ''}
              onChange={(e) => handleChange('heart_rate', e.target.value)}
            />
            <span className="absolute right-2 top-2 text-xs text-muted-foreground">bpm</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
             <Thermometer className="h-3 w-3" />
             Temperatura
          </Label>
           <div className="relative">
            <Input 
              placeholder="°C" 
              className="h-8 text-sm pr-6"
              value={data.temperature || ''}
              onChange={(e) => handleChange('temperature', e.target.value)}
            />
            <span className="absolute right-2 top-2 text-xs text-muted-foreground">°C</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
             <Scale className="h-3 w-3" />
             Peso
          </Label>
           <div className="relative">
            <Input 
              placeholder="kg" 
              className="h-8 text-sm pr-6"
              value={data.weight || ''}
              onChange={(e) => handleChange('weight', e.target.value)}
            />
            <span className="absolute right-2 top-2 text-xs text-muted-foreground">kg</span>
          </div>
        </div>

         <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
             <Ruler className="h-3 w-3" />
             Altura
          </Label>
           <div className="relative">
            <Input 
              placeholder="cm" 
              className="h-8 text-sm pr-6"
              value={data.height || ''}
              onChange={(e) => handleChange('height', e.target.value)}
            />
            <span className="absolute right-2 top-2 text-xs text-muted-foreground">cm</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VitalSigns;