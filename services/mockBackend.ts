
import { UserProfile, UploadedFile, ScheduledTask, Message } from '../types';
import { db } from './db';

/**
 * ASYNCHRONOUS BACKEND SERVICE
 * Powered by IndexedDB for high-capacity local storage.
 */
export const MockBackend = {
  // Authentication Service
  async register(user: any) {
    const existing = await db.get('users', user.username);
    if (existing) throw new Error("Username already taken.");
    await db.put('users', user);
    // Initialize profile for new user
    await db.put('profile', {
      id: user.username,
      name: user.name,
      role: 'New Member',
      preferences: 'Professional and concise.',
      avatar: `https://picsum.photos/seed/${user.username}/200`
    });
  },

  async login(credentials: any) {
    const user = await db.get<any>('users', credentials.username);
    if (!user || user.password !== credentials.password) {
      throw new Error("Invalid username or access token.");
    }
    return user;
  },

  // User Profile Service
  async getProfile(username?: string): Promise<UserProfile> {
    if (!username) return { name: 'Guest', role: 'Visitor', preferences: '' };
    const profile = await db.get<UserProfile & { id: string }>('profile', username);
    if (profile) return profile;
    
    return {
      name: 'Alex Rivera',
      role: 'Operations Manager',
      preferences: 'Professional, concise, values data visualization.',
      avatar: 'https://picsum.photos/seed/alex/200'
    };
  },

  async saveProfile(profile: UserProfile, username: string) {
    await db.put('profile', { ...profile, id: username });
  },

  // Uploaded Data Service
  async getFiles(): Promise<UploadedFile[]> {
    return await db.getAll<UploadedFile>('files');
  },

  async saveFile(file: UploadedFile) {
    await db.put('files', file);
  },

  async deleteFile(id: string) {
    await db.delete('files', id);
  },

  // Task Orchestrator Service
  async getTasks(): Promise<ScheduledTask[]> {
    const tasks = await db.getAll<ScheduledTask>('tasks');
    return tasks.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  },

  async saveTask(task: ScheduledTask) {
    await db.put('tasks', task);
  },

  // Memory Service
  async getMessages(): Promise<Message[]> {
    const msgs = await db.getAll<Message>('messages');
    return msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  async saveMessage(message: Message) {
    await db.put('messages', message);
  },

  async clearMemory() {
    await db.clear('messages');
  }
};
