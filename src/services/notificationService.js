import { supabase } from '@/lib/customSupabaseClient';

const DEFAULT_SETTINGS = {
  sound: true,
  volume: 0.8,
  desktop: false,
  quietHoursStart: '',
  quietHoursEnd: ''
};

class NotificationService {
  constructor() {
    this.settings = this.loadSettings();
    this.history = [];
    this.permission = Notification.permission;
    this.audio = new Audio('/assets/notification.mp3'); // Ensure this asset exists or handle error
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('notification_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('notification_settings', JSON.stringify(this.settings));
    this.audio.volume = this.settings.volume;
  }

  async requestPermission() {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    this.permission = result;
    return result === 'granted';
  }

  notify(title, body, data = {}) {
    // 1. Check Quiet Hours
    if (this.isInQuietHours()) return;

    // 2. Add to History
    const notification = {
      id: Date.now(),
      title,
      body,
      timestamp: new Date(),
      read: false,
      data
    };
    this.history.unshift(notification);
    if (this.history.length > 50) this.history.pop();

    // 3. Play Sound
    if (this.settings.sound) {
      this.playSound();
    }

    // 4. Desktop Notification
    if (this.settings.desktop && this.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {
        console.warn("Desktop notification failed", e);
      }
    }
  }

  playSound() {
    this.audio.volume = this.settings.volume;
    this.audio.currentTime = 0;
    this.audio.play().catch(e => console.log("Audio play blocked", e));
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

  clearHistory() {
    this.history = [];
  }
}

export const notificationService = new NotificationService();