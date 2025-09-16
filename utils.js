// Вспомогательные функции
export function extractJsonFromMarkdown(markdown) {
  try {
    const parsed = JSON.parse(markdown.trim());
    return parsed;
  } catch (e) {}
  const jsonCodeBlockRegex = /```(?:json|JSON)\s*([\s\S]*?)\s*```/g;
  let match;
  while ((match = jsonCodeBlockRegex.exec(markdown)) !== null) {
    const jsonStr = match[1].trim();
    try {
      const parsed = JSON.parse(jsonStr);
      return parsed;
    } catch (e) {}
  }
  return null;
}


export async function loadFile(filename) {
    const resp = await fetch(filename);
    if (!resp.ok) throw new Error('Не удалось загрузить prompt.txt');
    return await resp.text();
}
// Можно добавить генерацию броска кубика и другие утилиты
