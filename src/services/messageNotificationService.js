/**
 * Serviço de notificações para mensagens do WhatsApp
 * ALTERADO: Som completamente desativado para uso com Chatwoot
 */

class MessageNotificationService {
  constructor() {
    this.audio = null;
    this.lastNotifiedMessageId = null;
    this.settings = this.loadSettings();
    this.initializeAudio();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('message_notification_settings');
      return saved ? JSON.parse(saved) : {
        soundEnabled: false, // Alterado para false por padrão
        volume: 0.0,         // Volume zerado
        desktopEnabled: false,
        quietHoursStart: '',
        quietHoursEnd: ''
      };
    } catch {
      return {
        soundEnabled: false,
        volume: 0.0,
        desktopEnabled: false,
        quietHoursStart: '',
        quietHoursEnd: ''
      };
    }
  }

  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('message_notification_settings', JSON.stringify(this.settings));
  }

  initializeAudio() {
    // Método neutralizado intencionalmente
    // Não inicializa AudioContext nem carrega arquivos para evitar consumo de memória e barulho
    console.log('Sistema de áudio de notificações desativado.');
  }

  playSound() {
    // Bloqueio total de som
    return;
  }

  playTone() {
    // Bloqueio total de tom
    return;
  }

  async showDesktopNotification(title, body, icon) {
    if (!this.settings.desktopEnabled || this.isInQuietHours()) return;
    
    if (!('Notification' in window)) {
      console.log('Notificações desktop não suportadas');
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'whatsapp-message',
          requireInteraction: false,
          silent: true // Força silêncio na notificação do sistema também
        });
      } catch (error) {
        console.warn('Erro ao exibir notificação desktop:', error);
      }
    }
  }

  isInQuietHours() {
    if (!this.settings.quietHoursStart || !this.settings.quietHoursEnd) return false;
    
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = this.settings.quietHoursStart.split(':').map(Number);
    const start = startH * 60 + startM;
    
    const [endH, endM] = this.settings.quietHoursEnd.split(':').map(Number);
    const end = endH * 60 + endM;

    if (end < start) {
      return current >= start || current <= end;
    }
    return current >= start && current <= end;
  }

  notifyNewMessage(message, contactName) {
    // Mantém a lógica de verificação para não gerar erros, mas não toca som
    if (this.lastNotifiedMessageId === message.id) return;
    this.lastNotifiedMessageId = message.id;

    const isInbound = message.sender_type !== 'user' && message.direction === 'inbound';
    if (!isInbound) return; 

    // O som foi removido. 
    // Mantemos apenas a notificação visual desktop se estiver ativada nas configurações
    if (this.settings.desktopEnabled && (document.hidden || !document.hasFocus())) {
        const title = contactName || 'Nova mensagem';
        const body = message.content?.substring(0, 100) || 'Você recebeu uma nova mensagem';
        this.showDesktopNotification(title, body);
    }
  }

  notifyNewConversation(conversation) {
    // O som foi removido.
    const contactName = conversation.contact?.name || conversation.contact?.phone || 'Novo contato';
    const unreadCount = conversation.unread_count || 0;
    
    if (unreadCount > 0 && this.settings.desktopEnabled) {
      const title = `Nova conversa: ${contactName}`;
      const body = conversation.last_message_preview || 'Você tem uma nova conversa';
      
      if (document.hidden || !document.hasFocus()) {
        this.showDesktopNotification(title, body);
      }
    }
  }
}

export const messageNotificationService = new MessageNotificationService();