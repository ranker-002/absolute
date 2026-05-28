import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const USERS_FILE = path.join(ROOT, 'memory', 'users.json');

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'user' | 'readonly';
  createdAt: number;
  lastSeen: number;
  preferences: Record<string, unknown>;
  interactionCount: number;
}

export class MultiUserManager {
  private users: Map<string, User> = new Map();
  private currentUser: User | null = null;

  async init(): Promise<void> {
    await this.load();
    if (!this.users.has('default')) {
      await this.addUser('default', 'Admin', 'admin');
    }
    this.currentUser = this.users.get('default') || null;
  }

  private async load(): Promise<void> {
    try {
      const raw = await fs.readFile(USERS_FILE, 'utf-8');
      const data = JSON.parse(raw) as User[];
      for (const u of data) this.users.set(u.id, u);
    } catch (_e) { /* first run */ }
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
    await fs.writeFile(USERS_FILE, JSON.stringify(Array.from(this.users.values()), null, 2), 'utf-8');
  }

  async addUser(id: string, name: string, role: 'admin' | 'user' | 'readonly' = 'user'): Promise<User> {
    const user: User = {
      id,
      name,
      role,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      preferences: {},
      interactionCount: 0
    };
    this.users.set(id, user);
    await this.save();
    logger.info('MultiUser', 'Added user: ' + name + ' (' + role + ')');
    return user;
  }

  async switchUser(userId: string): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    this.currentUser = user;
    user.lastSeen = Date.now();
    await this.save();
    logger.info('MultiUser', 'Switched to: ' + user.name);
    return user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async recordInteraction(): Promise<void> {
    if (!this.currentUser) return;
    this.currentUser.interactionCount++;
    this.currentUser.lastSeen = Date.now();
    await this.save();
  }

  async updatePreference(key: string, value: unknown): Promise<void> {
    if (!this.currentUser) return;
    this.currentUser.preferences[key] = value;
    await this.save();
  }

  getUsers(): User[] {
    return Array.from(this.users.values());
  }

  async removeUser(userId: string): Promise<boolean> {
    if (userId === 'default') return false;
    this.users.delete(userId);
    await this.save();
    return true;
  }

  hasPermission(permission: 'admin' | 'transform' | 'chat'): boolean {
    if (!this.currentUser) return false;
    switch (permission) {
      case 'admin': return this.currentUser.role === 'admin';
      case 'transform': return this.currentUser.role !== 'readonly';
      case 'chat': return true;
      default: return false;
    }
  }
}
