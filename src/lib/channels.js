import WhatsAppIcon from '@/assets/whatsapp.svg';

export const CHANNEL_CONFIG = {
    whatsapp: {
        name: 'WhatsApp',
        description: 'Conecte-se com a Z-API para automatizar mensagens no WhatsApp.',
        icon: 'whatsapp',
        icon_path: WhatsAppIcon,
    },
    instagram: {
        name: 'Instagram',
        description: 'Gerencie mensagens diretas do Instagram e interaja com seus seguidores.',
        icon: 'instagram',
    },
    facebook: {
        name: 'Facebook Messenger',
        description: 'Conecte sua página do Facebook para gerenciar mensagens do Messenger.',
        icon: 'facebook',
    },
};

/**
 * @typedef {'whatsapp' | 'instagram' | 'facebook'} ChannelType
 */

// Exported CHANNELS array
export const CHANNELS = Object.keys(CHANNEL_CONFIG);

/**
 * Gets the configuration for a specific channel.
 * @param {ChannelType} channelType
 * @returns {{name: string, description: string, icon: string, icon_path?: string}}
 */
export const getChannelConfig = (channelType) => {
    return CHANNEL_CONFIG[channelType] || {
        name: 'Canal Desconhecido',
        description: 'Configuração para um canal desconhecido.',
        icon: 'unknown',
    };
};