import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

// Função auxiliar para máscara visual (apenas UI)
const formatPhoneUI = (value) => {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  const limited = numbers.slice(0, 11);
  if (limited.length <= 10) {
    return limited.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  } else {
    return limited.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  }
};

const PHONE_TYPES = [
  { value: 'mobile', label: 'Celular' },
  { value: 'home', label: 'Residencial' },
  { value: 'work', label: 'Trabalho' },
  { value: 'relative', label: 'Parente' },
  { value: 'friend', label: 'Amigo' },
  { value: 'other', label: 'Outro' },
];

const PatientPhonesManager = ({ phones = [], onChange }) => {

  const handleAddPhone = () => {
    const newPhone = {
      phone: '',
      phone_type: 'mobile',
      contact_name: '',
      is_primary: phones.length === 0,
      is_whatsapp: true,
      notes: '',
      tempId: Date.now()
    };
    onChange([...phones, newPhone]);
  };

  const handleRemovePhone = (index) => {
    const updatedPhones = phones.filter((_, i) => i !== index);
    if (phones[index].is_primary && updatedPhones.length > 0) {
        updatedPhones[0].is_primary = true;
    }
    onChange(updatedPhones);
  };

  const handleUpdatePhone = (index, field, value) => {
    const updatedPhones = phones.map((phone, i) => {
      if (i === index) {
        if (field === 'phone') {
            return { ...phone, [field]: formatPhoneUI(value) };
        }
        return { ...phone, [field]: value };
      }
      return phone;
    });

    if (field === 'is_primary' && value === true) {
      updatedPhones.forEach((p, i) => {
        if (i !== index) p.is_primary = false;
      });
    }

    onChange(updatedPhones);
  };

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-semibold">
          <Phone className="h-4 w-4" />
          Telefones de Contato
        </Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleAddPhone}
          className="flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Adicionar Telefone
        </Button>
      </div>

      <div className="space-y-6">
        {phones.map((phone, index) => (
          <div 
            key={phone.id || phone.tempId || `temp-${index}`} 
            className="relative bg-card p-4 rounded-lg border shadow-sm space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campo Número */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Número do Telefone *
                </Label>
                <Input
                  value={phone.phone} 
                  onChange={(e) => handleUpdatePhone(index, 'phone', e.target.value)}
                  placeholder="(99) 99999-9999"
                  maxLength={15}
                  className="bg-background"
                />
              </div>

              {/* Campo Tipo */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select
                  value={phone.phone_type || 'mobile'}
                  onValueChange={(val) => handleUpdatePhone(index, 'phone_type', val)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHONE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nome do Contato / Identificação (Agora sempre visível para facilitar) */}
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Responsável / Identificação</Label>
                <Input 
                value={phone.contact_name || ''}
                onChange={(e) => handleUpdatePhone(index, 'contact_name', e.target.value)}
                placeholder="Ex: Filho (João), Vizinha, Trabalho..."
                className="h-9 bg-background"
                />
            </div>

            {/* Checkboxes e Botão Remover */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-6">
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`primary-${index}`} 
                    checked={!!phone.is_primary}
                    onCheckedChange={(checked) => handleUpdatePhone(index, 'is_primary', checked)}
                  />
                  <label
                    htmlFor={`primary-${index}`}
                    className={cn(
                        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",
                        phone.is_primary && "text-primary font-semibold"
                    )}
                  >
                    Principal
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`whatsapp-${index}`} 
                    checked={!!phone.is_whatsapp}
                    onCheckedChange={(checked) => handleUpdatePhone(index, 'is_whatsapp', checked)}
                  />
                  <label
                    htmlFor={`whatsapp-${index}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Tem WhatsApp
                  </label>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemovePhone(index)}
                className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 h-8 w-8"
                title="Remover telefone"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {phones.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground border-dashed border-2 rounded-lg bg-muted/10">
                <p>Nenhum telefone cadastrado.</p>
                <p className="text-xs mt-1">Clique em "Adicionar Telefone" para começar.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default PatientPhonesManager;