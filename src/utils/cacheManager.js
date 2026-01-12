import { openDB } from 'idb';

const DB_NAME = 'audicare_cache';
const DB_VERSION = 1;
const STORES = {
  MESSAGES: 'messages',
  CONTACTS: 'contacts',
  TEMPLATES: 'templates',
  METADATA: 'metadata'
};

export const cacheManager = {
  async openDB() {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const store = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
          store.createIndex('conversation_id', 'conversation_id');
          store.createIndex('timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains(STORES.CONTACTS)) {
          db.createObjectStore(STORES.CONTACTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
          db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      },
    });
  },

  async get(storeName, key) {
    try {
        const db = await this.openDB();
        return await db.get(storeName, key);
    } catch (e) {
        console.warn("Cache get failed", e);
        return null;
    }
  },

  async set(storeName, value) {
    try {
        const db = await this.openDB();
        return await db.put(storeName, value);
    } catch (e) {
        console.warn("Cache set failed", e);
    }
  },

  async getStats() {
      // Mock stats if DB fails
      return { size: 'Unknown', entries: 0 };
  }
};