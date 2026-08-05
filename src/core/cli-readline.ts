// src/core/cli-readline.ts
//
// Баг, который это чинит: и src/cli.ts, и src/stages/approval-stage.ts
// раньше независимо друг от друга вызывали readline.createInterface({
// input: process.stdin, ... }). Пока работал pipeline, интерфейс из cli.ts
// оставался открытым (закрывается только в finally в самом конце runCLI),
// а ApprovalStage поверх него создавал ЕЩЁ ОДИН интерфейс на тот же
// process.stdin. Два readline.Interface, одновременно подписанных на один
// и тот же TTY-поток, независимо друг от друга обрабатывают и "эхуют"
// каждый введённый (или вставленный) символ — отсюда и видимое удвоение:
// набираешь "n", а в терминале появляется "nn".
//
// Фикс: во всём процессе должен существовать РОВНО ОДИН readline.Interface.
// getSharedReadline() создаёт его лениво при первом обращении и дальше
// всегда возвращает тот же самый экземпляр — независимо от того, кто
// вызвал первым, cli.ts или какой-то из Stage-классов.
import readline from 'readline';

let sharedRl: readline.Interface | null = null;

export function getSharedReadline(): readline.Interface {
  if (!sharedRl) {
    sharedRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return sharedRl;
}

export function askQuestion(query: string): Promise<string> {
  const rl = getSharedReadline();
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * Закрывает общий readline-интерфейс. Вызывать ТОЛЬКО один раз, в самом
 * конце работы CLI (runCLI в cli.ts) — а не из отдельных стадий/шагов
 * пайплайна, иначе ввод для последующих стадий перестанет работать.
 */
export function closeSharedReadline(): void {
  if (sharedRl) {
    sharedRl.close();
    sharedRl = null;
  }
}
