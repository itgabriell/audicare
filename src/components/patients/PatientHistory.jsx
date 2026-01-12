import React from 'react';
import { FileText } from 'lucide-react';

const PatientHistory = ({ patient }) => {
  return (
    <div className="bg-card rounded-xl shadow-sm border p-6">
      <h3 className="text-lg font-semibold mb-4">Histórico Médico</h3>
      {patient?.medical_history ? (
        <p className="text-foreground whitespace-pre-wrap">{patient.medical_history}</p>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum histórico médico registrado</p>
        </div>
      )}
    </div>
  );
};

export default PatientHistory;