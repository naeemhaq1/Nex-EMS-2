// NEXLINX EMS Storage Configuration
// Centralized storage management for all data persistence needs

export interface StorageConfig {
  type: 'memory' | 'file' | 'database';
  path?: string;
  maxSize?: number;
  compression?: boolean;
}

export interface DataStore {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

class MemoryStorage implements DataStore {
  private data = new Map<string, { value: any; expires?: number }>();

  async get(key: string): Promise<any> {
    const item = this.data.get(key);
    if (!item) return null;

    if (item.expires && Date.now() > item.expires) {
      this.data.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.data.set(key, { value, expires });
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.data.keys());
  }
}

export const defaultStorage = new MemoryStorage();

export class StorageManager {
  private stores = new Map<string, DataStore>();

  constructor() {
    this.stores.set('default', defaultStorage);
  }

  getStore(name: string = 'default'): DataStore {
    return this.stores.get(name) || defaultStorage;
  }

  addStore(name: string, store: DataStore): void {
    this.stores.set(name, store);
  }

  removeStore(name: string): boolean {
    if (name === 'default') return false;
    return this.stores.delete(name);
  }
}

export const storageManager = new StorageManager();