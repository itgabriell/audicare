import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

const APIDebugPanel = ({ embedded }) => {
  return (
    <div className="h-full">
      <h3 className="font-medium mb-2">Monitor de API</h3>
      <div className="text-sm text-muted-foreground border rounded p-4 bg-muted/10">
        Nenhuma requisição recente capturada.
      </div>
    </div>
  );
};

export default APIDebugPanel;