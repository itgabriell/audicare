import React from 'react';
import { Calendar } from 'lucide-react';

const PatientAppointments = ({ patientId }) => {
  return (
    <div className="bg-card rounded-xl shadow-sm border p-6">
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground">Nenhuma consulta agendada</p>
      </div>
    </div>
  );
};

export default PatientAppointments;