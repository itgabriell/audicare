import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PHONE_TYPE_LABELS = {
  mobile: 'Celular',
  home: 'Residencial',
  work: 'Trabalho',
  relative: 'Parente',
  friend: 'Amigo',
  other: 'Outro',
};

const PatientPhonesDisplay = ({ phones = [], patientId }) => {
  const navigate = useNavigate();

  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  const handleWhatsApp = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    navigate(`/inbox?phone=${cleaned}`);
  };

  if (!phones || phones.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Nenhum telefone cadastrado
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {phones.map((phoneItem, index) => (
        <div
          key={phoneItem.id || index}
          className="flex items-center justify-between p-3 border rounded-lg bg-card"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatPhone(phoneItem.phone)}</span>
              {phoneItem.is_primary && (
                <Badge variant="default" className="text-xs">Principal</Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {PHONE_TYPE_LABELS[phoneItem.phone_type] || phoneItem.phone_type}
              </Badge>
              {phoneItem.is_whatsapp && (
                <Badge variant="secondary" className="text-xs">WhatsApp</Badge>
              )}
            </div>
            {phoneItem.contact_name && (
              <p className="text-xs text-muted-foreground mt-1">
                Contato: {phoneItem.contact_name}
              </p>
            )}
            {phoneItem.notes && (
              <p className="text-xs text-muted-foreground mt-1">
                {phoneItem.notes}
              </p>
            )}
          </div>
          {phoneItem.is_whatsapp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleWhatsApp(phoneItem.phone)}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default PatientPhonesDisplay;

