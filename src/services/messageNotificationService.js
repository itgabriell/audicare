/**
 * Serviço de notificações para mensagens do WhatsApp
 * Emite som e notificações desktop quando novas mensagens chegam
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
        soundEnabled: true,
        volume: 0.7,
        desktopEnabled: false,
        quietHoursStart: '',
        quietHoursEnd: ''
      };
    } catch {
      return {
        soundEnabled: true,
        volume: 0.7,
        desktopEnabled: false,
        quietHoursStart: '',
        quietHoursEnd: ''
      };
    }
  }

  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('message_notification_settings', JSON.stringify(this.settings));
    if (this.audio) {
      this.audio.volume = this.settings.volume;
    }
  }

  initializeAudio() {
    try {
      // Criar um som de notificação usando Web Audio API (não precisa de arquivo)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.settings.volume * 0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // Alternativa: usar um arquivo de áudio se disponível
      this.audio = new Audio();
      this.audio.volume = this.settings.volume;
      this.audio.preload = 'auto';
      
      // Tentar carregar um som de notificação padrão
      // Se não existir, usar o Web Audio API acima
    } catch (error) {
      console.warn('Erro ao inicializar áudio:', error);
    }
  }

  playSound() {
    if (!this.settings.soundEnabled || this.isInQuietHours()) return;
    
    try {
      // Método 1: Tentar usar um arquivo de áudio
      if (this.audio) {
        this.audio.currentTime = 0;
        this.audio.play().catch(err => {
          console.log('Reprodução de áudio bloqueada:', err);
          // Fallback: usar Web Audio API
          this.playTone();
        });
      } else {
        this.playTone();
      }
    } catch (error) {
      console.warn('Erro ao reproduzir som:', error);
    }
  }

  playTone() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Som de notificação (dois tons)
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.settings.volume * 0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      
      // Segundo tom
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.frequency.value = 1000;
        oscillator2.type = 'sine';
        
        gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode2.gain.linearRampToValueAtTime(this.settings.volume * 0.3, audioContext.currentTime + 0.01);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.15);
      }, 150);
    } catch (error) {
      console.warn('Erro ao reproduzir tom:', error);
    }
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
          requireInteraction: false
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
    // Evitar notificar a mesma mensagem duas vezes
    if (this.lastNotifiedMessageId === message.id) return;
    this.lastNotifiedMessageId = message.id;

    const isInbound = message.sender_type !== 'user' && message.direction === 'inbound';
    if (!isInbound) return; // Só notificar mensagens recebidas

    const title = contactName || 'Nova mensagem';
    const body = message.content?.substring(0, 100) || 'Você recebeu uma nova mensagem';
    
    // Reproduzir som
    this.playSound();
    
    // Mostrar notificação desktop (apenas se a janela não estiver em foco)
    if (document.hidden || !document.hasFocus()) {
      this.showDesktopNotification(title, body);
    }
  }

  notifyNewConversation(conversation) {
    const contactName = conversation.contact?.name || conversation.contact?.phone || 'Novo contato';
    const unreadCount = conversation.unread_count || 0;
    
    if (unreadCount > 0) {
      const title = `Nova conversa: ${contactName}`;
      const body = conversation.last_message_preview || 'Você tem uma nova conversa';
      
      // Reproduzir som
      this.playSound();
      
      // Mostrar notificação desktop
      if (document.hidden || !document.hasFocus()) {
        this.showDesktopNotification(title, body);
      }
    }
  }
}

export const messageNotificationService = new MessageNotificationService();

