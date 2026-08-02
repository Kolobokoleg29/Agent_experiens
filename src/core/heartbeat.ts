export class Heartbeat {
  static start(label: string): () => void {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`   ⏳ ${label} — модель ещё думает (${elapsed} сек)...`);
    }, 15000);

    return () => clearInterval(interval);
  }
}