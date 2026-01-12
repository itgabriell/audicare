import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Phone } from 'lucide-react';
import { formatPhoneE164, validatePhoneE164 } from '@/lib/phoneUtils';

const PHONE_TYPES = [
  { value: 'mobile', label: 'Celular' },
  { value: 'home', label: 'Residencial' },
  { value: 'work', label: 'Trabalho' },
  { value: 'relative', label: 'Parente' },
  { value: 'friend', label: 'Amigo' },
  { value: 'other', label: 'Outro' },
];

const PatientPhonesManager = ({ phones = [], onChange }) => {
  const [phoneList, setPhoneList] = useState([]);

  useEffect(() => {
    if (phones && phones.length > 0) {
      setPhoneList(phones);
    } else {
      // Se não há telefones, criar um vazio
      setPhoneList([{
        id: `temp_${Date.now()}`,
        phone: '',
        phone_type: 'mobile',
        contact_name: '',
        is_primary: true,
        is_whatsapp: true,
        notes: '',
      }]);
    }
  }, [phones]);

  useEffect(() => {
    // Notificar mudanças ao componente pai
    if (onChange) {
      onChange(phoneList);
    }
  }, [phoneList, onChange]);

  const addPhone = () => {
    setPhoneList(prev => [...prev, {
      id: `temp_${Date.now()}`,
      phone: '',
      phone_type: 'mobile',
      contact_name: '',
      is_primary: false,
      is_whatsapp: true,
      notes: '',
    }]);
  };

  const removePhone = (index) => {
    setPhoneList(prev => {
      const newList = prev.filter((_, i) => i !== index);
      // Se removemos o telefone principal e ainda há outros, marcar o primeiro como principal
      if (newList.length > 0 && !newList.some(p => p.is_primary)) {
        newList[0].is_primary = true;
      }
      return newList;
    });
  };

  const updatePhone = (index, field, value) => {
    setPhoneList(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value };
      
      // Se marcou como principal, desmarcar outros
      if (field === 'is_primary' && value === true) {
        newList.forEach((phone, i) => {
          if (i !== index) {
            phone.is_primary = false;
          }
        });
      }
      
      return newList;
    });
  };

  const formatPhoneDisplay = (phone) => {
    if (!phone) return '';
    // Remove formatação para exibição
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Telefones de Contato
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPhone}
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar Telefone
        </Button>
      </div>

      <div className="space-y-3">
        {phoneList.map((phoneItem, index) => (
          <div
            key={phoneItem.id || index}
            className="p-4 border rounded-lg space-y-3 bg-card"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Número do Telefone *</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={formatPhoneDisplay(phoneItem.phone)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        updatePhone(index, 'phone', value);
                      }}
                      onBlur={(e) => {
                        const formatted = formatPhoneE164(e.target.value);
                        if (formatted && validatePhoneE164(formatted)) {
                          updatePhone(index, 'phone', formatted);
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={phoneItem.phone_type || 'mobile'}
                      onValueChange={(value) => updatePhone(index, 'phone_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PHONE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(phoneItem.phone_type === 'relative' || phoneItem.phone_type === 'friend') && (
                  <div className="space-y-1">
                    <Label className="text-xs">Nome do Contato</Label>
                    <Input
                      placeholder="Ex: Filho - João, Amigo - Maria"
                      value={phoneItem.contact_name || ''}
                      onChange={(e) => updatePhone(index, 'contact_name', e.target.value)}
                    />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={phoneItem.is_primary || false}
                      onChange={(e) => updatePhone(index, 'is_primary', e.target.checked)}
                      className="rounded"
                    />
                    <span>Telefone Principal</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={phoneItem.is_whatsapp !== false}
                      onChange={(e) => updatePhone(index, 'is_whatsapp', e.target.checked)}
                      className="rounded"
                    />
                    <span>Tem WhatsApp</span>
                  </label>

                  {phoneItem.is_primary && (
                    <Badge variant="default" className="text-xs">Principal</Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Observações (opcional)</Label>
                  <Input
                    placeholder="Ex: Melhor horário para contato"
                    value={phoneItem.notes || ''}
                    onChange={(e) => updatePhone(index, 'notes', e.target.value)}
                  />
                </div>
              </div>

              {phoneList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePhone(index)}
                  className="ml-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {phoneList.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Nenhum telefone cadastrado. Clique em "Adicionar Telefone" para começar.
        </div>
      )}
    </div>
  );
};

export default PatientPhonesManager;

