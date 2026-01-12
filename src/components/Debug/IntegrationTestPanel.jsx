import React from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

const IntegrationTestPanel = ({ embedded }) => {
  return (
    <div className="h-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Testes de Integração</h3>
        <Button size="sm" variant="outline">
          <Play className="h-3 w-3 mr-2" /> Executar Todos
        </Button>
      </div>
      <div className="text-sm text-muted-foreground border rounded p-4 bg-muted/10">
        Selecione um teste para iniciar.
      </div>
    </div>
  );
};

export default IntegrationTestPanel;