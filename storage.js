
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Storage {
  constructor() {
    this.dataDir = join(__dirname, 'data');
    this.dataFile = join(this.dataDir, 'users.json');
    this.ensureDataDirectory();
    this.loadData();
  }

  ensureDataDirectory() {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  loadData() {
    try {
      if (existsSync(this.dataFile)) {
        const data = readFileSync(this.dataFile, 'utf8');
        this.users = JSON.parse(data);
        console.log(`📁 Loaded ${this.users.length} users from storage`);
      } else {
        this.users = [];
        this.saveData();
        console.log('📁 Created new empty user storage');
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      this.users = [];
      this.saveData();
    }
  }

  saveData() {
    try {
      writeFileSync(this.dataFile, JSON.stringify(this.users, null, 2));
      console.log(`💾 Saved ${this.users.length} users to storage`);
    } catch (error) {
      console.error('❌ Error saving user data:', error);
    }
  }

  getUserByUsername(username) {
    const user = this.users.find(user => user.username === username);
    console.log(`🔍 Looking for user "${username}": ${user ? 'FOUND' : 'NOT FOUND'}`);
    return user;
  }

  getUserById(id) {
    const user = this.users.find(user => user.id === parseInt(id));
    console.log(`🔍 Looking for user ID ${id}: ${user ? 'FOUND' : 'NOT FOUND'}`);
    return user;
  }

  createUser(userData) {
    const newUser = {
      id: this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1,
      ...userData,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    
    this.users.push(newUser);
    this.saveData();
    console.log(`✅ Created user: ${newUser.username} (ID: ${newUser.id})`);
    return newUser;
  }

  updateUser(id, updates) {
    const index = this.users.findIndex(user => user.id === parseInt(id));
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updates };
      this.saveData();
      console.log(`✅ Updated user ID ${id}`);
      return this.users[index];
    }
    console.log(`❌ User ID ${id} not found for update`);
    return null;
  }

  getAllUsers() {
    return this.users;
  }
}

export const storage = new Storage();
