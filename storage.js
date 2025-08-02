
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Storage {
  constructor() {
    this.dataFile = join(__dirname, 'data', 'users.json');
    this.ensureDataDirectory();
    this.loadData();
  }

  ensureDataDirectory() {
    const dataDir = join(__dirname, 'data');
    if (!existsSync(dataDir)) {
      import('fs').then(fs => fs.mkdirSync(dataDir, { recursive: true }));
    }
  }

  loadData() {
    try {
      if (existsSync(this.dataFile)) {
        const data = readFileSync(this.dataFile, 'utf8');
        this.users = JSON.parse(data);
      } else {
        this.users = [];
        this.saveData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.users = [];
    }
  }

  saveData() {
    try {
      writeFileSync(this.dataFile, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async getUserByUsername(username) {
    return this.users.find(user => user.username === username);
  }

  async getUserById(id) {
    return this.users.find(user => user.id === id);
  }

  async createUser(userData) {
    const newUser = {
      id: this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1,
      ...userData,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    
    this.users.push(newUser);
    this.saveData();
    return newUser;
  }

  async updateUser(id, updates) {
    const index = this.users.findIndex(user => user.id === id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updates };
      this.saveData();
      return this.users[index];
    }
    return null;
  }

  async getAllUsers() {
    return this.users;
  }
}

export const storage = new Storage();
