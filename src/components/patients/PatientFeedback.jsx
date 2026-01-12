import React from 'react';
import { Star, MessageSquare, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const PatientFeedback = ({ patientId }) => {
  const { toast } = useToast();

  const showToast = () => {
    toast({
      title: "🚧 Em Construção!",
      description: "Esta funcionalidade ainda não foi implementada. Peça no próximo prompt! 🚀",
    });
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Feedback do Paciente</h3>
        <div className="flex gap-2">
            <Button onClick={showToast} variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Solicitar Feedback
            </Button>
            <Button onClick={showToast} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
            </Button>
        </div>
      </div>
      <div className="text-center py-12">
        <Star className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground">Nenhum feedback recebido</p>
        <p className="text-sm text-muted-foreground mt-1">Solicite a opinião dos seus pacientes.</p>
      </div>
    </div>
  );
};

export default PatientFeedback;