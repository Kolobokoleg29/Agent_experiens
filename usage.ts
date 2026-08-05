// usage.ts — простой просмотр дневной статистики использования API.
// Запускается через `npm run usage`.
import * as fs from 'fs';
import * as path from 'path';

const USAGE_FILE = path.join(process.cwd(), 'api-usage.json');

interface UsageLog {
  date: string;
  count: number;
  totalTokens: number;
}

function main() {
  if (!fs.existsSync(USAGE_FILE)) {
    console.log('📊 Статистика использования пуста — сегодня ещё не было запросов к OpenRouter.');
    return;
  }

  const raw = fs.readFileSync(USAGE_FILE, 'utf-8');
  const usage: Partial<UsageLog> = JSON.parse(raw);

  console.log('📊 Статистика использования OpenRouter API');
  console.log('─'.repeat(45));
  console.log(`Дата:            ${usage.date ?? '—'}`);
  console.log(`Запросов сегодня: ${usage.count ?? 0}`);
  console.log(`Токенов сегодня:  ${usage.totalTokens ?? 0}`);
  console.log('─'.repeat(45));
  console.log('Типичный дневной лимит бесплатных моделей — 50-200 запросов/день.');
}

main();
