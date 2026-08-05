// src/core/token-tracker.ts
import fs from 'fs';
import path from 'path';

const USAGE_FILE = path.join(process.cwd(), 'api-usage.json');
// Порог для количества ЗАПРОСОВ в день (типичный дневной лимит бесплатных
// моделей OpenRouter — 50-200 запросов/день).
const DAILY_REQUEST_WARNING_THRESHOLD = 40;

interface UsageLog {
  date: string;
  count: number;       // количество запросов за день
  totalTokens: number; // суммарное количество токенов (prompt+completion) за день
}

export class TokenTracker {
  private usage: UsageLog;
  private warned: boolean = false;

  constructor() {
    this.usage = this.load();
  }

  private load(): UsageLog {
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (fs.existsSync(USAGE_FILE)) {
        const saved: Partial<UsageLog> = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
        if (saved.date === today) {
          return { date: today, count: saved.count ?? 0, totalTokens: saved.totalTokens ?? 0 };
        }
      }
    } catch {
      // игнорируем повреждённый файл
    }
    return { date: today, count: 0, totalTokens: 0 };
  }

  private persist() {
    fs.writeFileSync(USAGE_FILE, JSON.stringify(this.usage), 'utf-8');
  }

  /** Считает КОЛИЧЕСТВО ЗАПРОСОВ (не токенов) — защита от дневного лимита free-моделей. */
  trackRequest(): number {
    this.usage.count++;
    this.persist();
    console.log(`[Счётчик] Запросов сегодня: ${this.usage.count}`);

    // Предупреждение только один раз
    if (this.usage.count > DAILY_REQUEST_WARNING_THRESHOLD && !this.warned) {
      console.warn(`⚠️  Приближение к дневному лимиту запросов (50-200/день). Возможен 429.`);
      this.warned = true;
    }

    return this.usage.count;
  }

  /** Считает реальные ТОКЕНЫ из usage.total_tokens ответа API. */
  trackTokens(tokens: number): number {
    if (!tokens || tokens <= 0) return this.usage.totalTokens;
    this.usage.totalTokens += tokens;
    this.persist();
    console.log(`[Счётчик] Токенов сегодня: ${this.usage.totalTokens}`);
    return this.usage.totalTokens;
  }

  getCount(): number {
    return this.usage.count;
  }

  getTokenCount(): number {
    return this.usage.totalTokens;
  }
}