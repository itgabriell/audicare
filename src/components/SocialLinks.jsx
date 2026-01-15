import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Instagram,
  Facebook,
  MessageCircle
} from 'lucide-react';

const SocialLinks = () => {
  const socialLinks = [
    {
      name: 'Instagram',
      icon: Instagram,
      url: 'https://instagram.com/audicarefono',
      color: 'hover:text-pink-500',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      url: 'https://www.facebook.com/audicarefono',
      color: 'hover:text-blue-600',
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      url: 'https://wa.me/556198113666',
      color: 'hover:text-green-500',
    },
  ];

  const handleSocialClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex items-center gap-1">
      {socialLinks.map((social) => {
        const IconComponent = social.icon;
        return (
          <Button
            key={social.name}
            variant="ghost"
            size="sm"
            onClick={() => handleSocialClick(social.url)}
            className={`h-9 w-9 p-0 transition-all duration-200 hover:scale-110 active:scale-95 ${social.color}`}
            title={`Seguir no ${social.name}`}
          >
            <IconComponent className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
};

export default SocialLinks;
