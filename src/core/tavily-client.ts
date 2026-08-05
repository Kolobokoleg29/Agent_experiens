import dotenv from 'dotenv';
dotenv.config();

export class TavilyClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('TAVILY_API_KEY не задан — веб-поиск отключён');
    }
  }

  async search(query: string, maxResults = 5): Promise<string> {
    if (!this.apiKey) return 'Веб-поиск недоступен: не задан TAVILY_API_KEY.';
    try {
      const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          max_results: maxResults,
          search_depth: 'basic',
        }),
      });
      const data: any = await resp.json();
      if (!resp.ok) {
        return `Ошибка поиска (${resp.status}): ${JSON.stringify(data)}`;
      }
      const results = (data.results || [])
        .map((r: any, i: number) =>
          `${i + 1}. ${r.title}\n${r.url}\n${(r.content || '').slice(0, 400)}`
        )
        .join('\n\n');
      return results || 'Ничего не найдено.';
    } catch (err: any) {
      return `Ошибка поиска: ${err.message}`;
    }
  }

  async fetchUrl(url: string): Promise<string> {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (agent-tools doc-checker)' },
      });
      if (!resp.ok) return `Ошибка загрузки (${resp.status}) для ${url}`;
      const html = await resp.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return text.slice(0, 6000); // обрезаем до 6000 символов
    } catch (err: any) {
      return `Ошибка загрузки ${url}: ${err.message}`;
    }
  }
}