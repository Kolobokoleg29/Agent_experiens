// src/cli.ts
import readline from 'readline';
import { Pipeline } from './pipeline';
import { OpenRouterClient } from './core/openrouter-client';
import { TavilyClient } from './core/tavily-client';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

export async function runCLI() {
  console.log('🎮 Agent for Phaser — аналитический пайплайн для 2D-игр');
  console.log('Выберите режим:');
  console.log('1. Полный анализ рынка и поиск ниш');
  console.log('2. Детальный анализ конкретной игры');
  console.log('3. Генерация игры из описания (быстрый режим)');

  const mode = await askQuestion('Ваш выбор (1/2/3): ');

  const openRouter = new OpenRouterClient();
  const tavily = process.env.TAVILY_API_KEY ? new TavilyClient() : undefined;

  const pipeline = new Pipeline(openRouter, tavily);

  try {
    switch (mode.trim()) {
      case '1':
        console.log('🔍 Запуск полного анализа рынка...');
        await pipeline.runFullResearch();
        break;
      case '2':
        const gameUrl = await askQuestion('Введите ссылку или название игры: ');
        await pipeline.analyzeGame(gameUrl);
        break;
      case '3':
        const prompt = await askQuestion('Опишите 2D-игру, которую хотите создать: ');
        await pipeline.run(prompt);
        break;
      default:
        console.log('Неверный выбор.');
    }
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    rl.close();
  }
}