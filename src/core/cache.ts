// src/core/cache.ts
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'cache');

export class Cache {
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  private getCacheKey(messages: any[], model: string, temperature: number): string {
    // Включаем модель и температуру в ключ
    const data = JSON.stringify({ messages, model, temperature });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private getCachePath(key: string): string {
    return path.join(CACHE_DIR, `${key}.json`);
  }

  async get(messages: any[], model: string, temperature: number): Promise<string | null> {
    if (!this.enabled) return null;
    try {
      const key = this.getCacheKey(messages, model, temperature);
      const filePath = this.getCachePath(key);
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      // Храним до 7 дней
      if (Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) {
        return null;
      }
      return parsed.response;
    } catch {
      return null;
    }
  }

  async set(messages: any[], model: string, temperature: number, response: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      const key = this.getCacheKey(messages, model, temperature);
      const filePath = this.getCachePath(key);
      await fs.writeFile(filePath, JSON.stringify({
        timestamp: Date.now(),
        response,
      }), 'utf-8');
    } catch (e) {
      // игнорируем ошибки записи кеша
    }
  }

  async clear(): Promise<void> {
    try {
      await fs.rm(CACHE_DIR, { recursive: true, force: true });
    } catch {}
  }
}