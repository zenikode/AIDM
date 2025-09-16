// OpenRouter API модуль
import { addLog } from './logger.js';
import { apiKey, selectedModel } from './storage.js';

// Вызов OpenRouter API
export async function callOpenRouterAPI(messages) {
  addLog(`Отправляем запрос к OpenRouter API (модель: ${selectedModel})`, 'debug');
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'D&D Game Interface'
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: messages,
      temperature: 0.8,
      max_tokens: 2000
    })
  });

  addLog(`Получен ответ: HTTP ${response.status}`, 'debug');

  if (!response.ok) {
    const errorText = await response.text();
    addLog(`Ошибка API: ${response.status} - ${errorText}`, 'error');
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  addLog('Ответ успешно получен и обработан', 'success');
  return data.choices[0].message.content;
}

// Вспомогательные функции для работы с API
export async function initializeSessionWithAI(systemPrompt, userPrompt) {
  return await callOpenRouterAPI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]);
}

export async function continueConversationWithAI(conversationHistory) {
  return await callOpenRouterAPI(conversationHistory);
}

export async function reformatResponseToJSON(conversationHistory) {
  return await callOpenRouterAPI([
    ...conversationHistory,
    { role: "user", content: "Переформатируй ответ в правильный JSON формат сцены D&D." }
  ]);
}