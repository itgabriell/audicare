import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, ArrowLeft, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PatientHeader = ({ patient }) => {
  const navigate = useNavigate();
  
  if (!patient) return null;

  // Calculate age
  const getAge = (birthdate) => {
    if (!birthdate) return '';
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} anos`;
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Avatar className="h-20 w-20 border-4 border-white shadow-sm">
             <AvatarImage src={patient.avatar_url} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {patient.name?.[0]?.toUpperCase() || <User />}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <h1 className="text-2xl font-bold">{patient.name}</h1>
              <div className="flex gap-2">
                {patient.birthdate && <Badge variant="outline">{getAge(patient.birthdate)}</Badge>}
                <Badge className="bg-green-600 hover:bg-green-700">Ativo</Badge>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {patient.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {patient.phone}
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {patient.email}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/patients/${patient.id}`)}>
               Ver Perfil
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientHeader;