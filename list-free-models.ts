async function main() {
  const resp = await fetch("https://openrouter.ai/api/v1/models");
  if (!resp.ok) {
    throw new Error(`Ошибка запроса: ${resp.status} ${resp.statusText}`);
  }
  const { data } = await resp.json();

  const freeModels = data.filter((m: any) =>
    m.pricing?.prompt === "0" && m.pricing?.completion === "0"
  );

  console.log(`Найдено бесплатных моделей: ${freeModels.length}\n`);

  // Сортируем так, чтобы модели с "coder"/"code" в названии были сверху — они полезнее для наших задач
  freeModels.sort((a: any, b: any) => {
    const aCoder = /code|coder/i.test(a.id) ? 0 : 1;
    const bCoder = /code|coder/i.test(b.id) ? 0 : 1;
    return aCoder - bCoder;
  });

  for (const m of freeModels) {
    console.log(`ID: ${m.id}`);
    console.log(`  Название: ${m.name}`);
    console.log(`  Контекст: ${m.context_length} токенов`);
    console.log(`  Поддержка tool calling: ${m.supported_parameters?.includes("tools") ? "да" : "нет"}`);
    console.log("---");
  }
}

main().catch(console.error);