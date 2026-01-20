import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const ChatIntegration = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="flex-1 h-full w-full relative bg-gray-50">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div className="w-full h-full overflow-hidden">
        <iframe
          src="https://chat.audicarefono.com.br"
          className="w-full h-full border-none"
          style={{ width: 'calc(100% + 260px)', marginLeft: '-260px' }}
          title="Chatwoot Inbox"
          allow="camera; microphone; geolocation; keyboard-map"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
};

export default ChatIntegration;
