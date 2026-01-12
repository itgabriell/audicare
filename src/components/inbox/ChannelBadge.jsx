import React from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, Instagram, Facebook } from 'lucide-react';

// A simple WhatsApp icon component
const WhatsAppIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const channelMap = {
  whatsapp: { icon: WhatsAppIcon, label: 'WhatsApp', color: 'text-green-500' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'text-pink-500' },
  facebook: { icon: Facebook, label: 'Facebook', color: 'text-blue-600' },
  default: { icon: MessageSquare, label: 'Chat', color: 'text-muted-foreground' },
};

const ChannelBadge = ({ channel, className }) => {
  const { icon: Icon, label, color } = channelMap[channel] || channelMap.default;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', className)}>
      <Icon className={cn('h-3.5 w-3.5', color)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
};

export default ChannelBadge;