import React from 'react';
import { Instagram, Facebook, MessageSquare } from 'lucide-react';
import { getChannelConfig } from '@/lib/channels';

const ChannelIcon = ({ channelType, className }) => {
  const config = getChannelConfig(channelType);
  const { icon, icon_path, name } = config;

  if (icon === 'whatsapp') {
    return <img src={icon_path} alt={`${name} icon`} className={className} />;
  }
  if (icon === 'instagram') {
    return <Instagram className={className} aria-label={`${name} icon`} />;
  }
  if (icon === 'facebook') {
    return <Facebook className={className} aria-label={`${name} icon`} />;
  }
  
  return <MessageSquare className={className} aria-label="Default channel icon" />;
};

export default ChannelIcon;