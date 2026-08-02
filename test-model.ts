import "dotenv/config";

const MODEL_ID = process.argv[2];

if (!MODEL_ID) {
  console.error("Использование: npx tsx test-model.ts <model-id>");
  process.exit(1);
}

async function main() {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages: [
        { role: "user", content: "Ответь одним словом: работаешь?" }
      ],
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    console.error("Ошибка:", data);
    return;
  }

  console.log("Модель ответила:", data.choices[0].message.content);
  console.log("Реально использованная модель:", data.model);
}

main().catch(console.error);