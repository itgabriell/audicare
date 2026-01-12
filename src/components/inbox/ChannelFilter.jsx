import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageCircle, Instagram, Phone, Mail } from 'lucide-react';

const CHANNELS = [
  { id: 'all', label: 'Todos', icon: null },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'phone', label: 'Telefone', icon: Phone },
  { id: 'email', label: 'E-mail', icon: Mail },
];

const ChannelFilter = ({ selectedChannel, onSelectChannel }) => {
  return (
    // UI Redesign: Pill-style segmented control group.
    <div className="flex items-center gap-2">
      {CHANNELS.map((channel) => {
        const isActive =
          selectedChannel === channel.id ||
          (!selectedChannel && channel.id === 'all');
        const Icon = channel.icon;

        return (
          <Button
            key={channel.id}
            type="button"
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectChannel(channel.id)}
            // UI Redesign: Fully rounded buttons for a pill effect.
            className={cn(
              "h-9 px-4 text-sm whitespace-nowrap rounded-full flex-shrink-0",
              isActive ? "font-semibold" : ""
            )}
          >
            {Icon && <Icon className="h-4 w-4 mr-2" />}
            {channel.label}
          </Button>
        );
      })}
    </div>
  );
};

export default ChannelFilter;