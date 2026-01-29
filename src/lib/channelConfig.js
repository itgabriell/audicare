import { z } from 'zod';

export const CHANNEL_TYPES = {
  WHATSAPP: 'whatsapp',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  TELEGRAM: 'telegram',
  EMAIL: 'email',
  SMS: 'sms',
  VOICE: 'voice',
};

export const CHANNEL_LABELS = {
  [CHANNEL_TYPES.WHATSAPP]: 'WhatsApp',
  [CHANNEL_TYPES.INSTAGRAM]: 'Instagram',
  [CHANNEL_TYPES.FACEBOOK]: 'Facebook',
  [CHANNEL_TYPES.TELEGRAM]: 'Telegram',
  [CHANNEL_TYPES.EMAIL]: 'E-mail',
  [CHANNEL_TYPES.SMS]: 'SMS',
  [CHANNEL_TYPES.VOICE]: 'Voz',
};

export const CHANNEL_COLORS = {
  [CHANNEL_TYPES.WHATSAPP]: 'bg-green-500',
  [CHANNEL_TYPES.INSTAGRAM]: 'bg-pink-500',
  [CHANNEL_TYPES.FACEBOOK]: 'bg-blue-500',
  [CHANNEL_TYPES.TELEGRAM]: 'bg-sky-500',
  [CHANNEL_TYPES.EMAIL]: 'bg-gray-500',
  [CHANNEL_TYPES.SMS]: 'bg-blue-400',
  [CHANNEL_TYPES.VOICE]: 'bg-rose-500',
};

export const CHANNEL_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

export const getChannelLabel = (channelType) => {
  return CHANNEL_LABELS[channelType] || channelType;
};

export const getChannelColor = (channelType) => {
  return CHANNEL_COLORS[channelType] || 'bg-gray-500';
};

const whatsappSchema = z.object({
  zapi_token: z.string().min(1, { message: "O Token da Z-API é obrigatório." }),
});

const instagramSchema = z.object({
  page_id: z.string().min(1, { message: "O ID da Página é obrigatório." }),
  access_token: z.string().min(1, { message: "O Token de Acesso é obrigatório." }),
});

const facebookSchema = z.object({
  page_id: z.string().min(1, { message: "O ID da Página é obrigatório." }),
  access_token: z.string().min(1, { message: "O Token de Acesso é obrigatório." }),
});

const channelSchemas = {
  [CHANNEL_TYPES.WHATSAPP]: whatsappSchema,
  [CHANNEL_TYPES.INSTAGRAM]: instagramSchema,
  [CHANNEL_TYPES.FACEBOOK]: facebookSchema,
};

/**
 * Validates credentials for a given channel.
 * @param {import('./channels').ChannelType} channel - The channel type.
 * @param {object} credentials - The credentials object to validate.
 * @returns {import('zod').SafeParseReturnType<any, any>} The result of the validation.
 */
export const validateCredentials = (channel, credentials) => {
  const schema = channelSchemas[channel];
  if (!schema) {
    // For channels without specific credentials, always pass validation.
    return { success: true, data: {} };
  }
  return schema.safeParse(credentials);
};