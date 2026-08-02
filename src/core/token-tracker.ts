// src/core/token-tracker.ts
import fs from 'fs';
import path from 'path';

const USAGE_FILE = path.join(process.cwd(), 'api-usage.json');
const DAILY_WARNING_THRESHOLD = 40;

interface UsageLog {
  date: string;
  count: number;
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
        const saved: UsageLog = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
        if (saved.date === today) return saved;
      }
    } catch {
      // игнорируем повреждённый файл
    }
    return { date: today, count: 0 };
  }

  trackRequest(): number {
    this.usage.count++;
    fs.writeFileSync(USAGE_FILE, JSON.stringify(this.usage), 'utf-8');
    console.log(`[Счётчик] Запросов сегодня: ${this.usage.count}`);

    // Предупреждение только один раз
    if (this.usage.count > DAILY_WARNING_THRESHOLD && !this.warned) {
      console.warn(`⚠️  Приближение к лимиту (50-200/день). Возможен 429.`);
      this.warned = true;
    }

    return this.usage.count;
  }

  getCount(): number {
    return this.usage.count;
  }
}