// === Глобальные переменные ===
let player = {};
let currentSceneId = 'start';
let apiKey = 'sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'; // Захардкоженный ключ для тестирования
let selectedModel = 'deepseek/deepseek-chat-v3.1:free'; // Модель по умолчанию
let sessionInitialized = false;
let conversationHistory = [];

// === Функции для работы с localStorage ===
function saveSettings() {
  localStorage.setItem('dnd_api_key', apiKey);
  localStorage.setItem('dnd_model', selectedModel);
}

function loadSettings() {
  const savedApiKey = localStorage.getItem('dnd_api_key');
  const savedModel = localStorage.getItem('dnd_model');
  
  if (savedApiKey) {
    apiKey = savedApiKey;
  }
  if (savedModel) {
    selectedModel = savedModel;
  }
}

function extractJsonFromMarkdown(markdown) {
  // Шаг 1: Попробуем распарсить всю строку как JSON (если это чистый JSON)
  try {
    const parsed = JSON.parse(markdown.trim());
    return parsed; // Успешно — возвращаем объект
  } catch (e) {
    // Не удалось — продолжаем поиск в Markdown-блоках
  }

  // Шаг 2: Ищем код-блоки с json
  const jsonCodeBlockRegex = /```(?:json|JSON)\s*([\s\S]*?)\s*```/g;
  let match;

  while ((match = jsonCodeBlockRegex.exec(markdown)) !== null) {
    const jsonStr = match[1].trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return parsed; // Возвращаем первый найденный валидный JSON
    } catch (e) {
      console.warn('Невалидный JSON в блоке:', jsonStr.substring(0, 100) + '...');
    }
  }

  // Если ничего не нашлось — возвращаем null
  return null;
}

// === Функции для работы с консолью логов ===
function addLog(message, type = 'info') {
  const consoleLogs = document.getElementById('console-logs');
  if (!consoleLogs) return;

  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${type}`;
  
  const typeIcon = {
    'info': 'ℹ️',
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'debug': '🔍'
  }[type] || 'ℹ️';
  
  logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-icon">${typeIcon}</span> <span class="log-message">${message}</span>`;
  
  consoleLogs.appendChild(logEntry);
  consoleLogs.scrollTop = consoleLogs.scrollHeight;
  
  // Ограничиваем количество логов
  const logs = consoleLogs.querySelectorAll('.log-entry');
  if (logs.length > 100) {
    logs[0].remove();
  }
}

function clearLogs() {
  const consoleLogs = document.getElementById('console-logs');
  if (consoleLogs) {
    consoleLogs.innerHTML = '<div class="log-entry">Логи очищены...</div>';
  }
}

// === Инициализация при загрузке ===
window.onload = () => {
  // Загружаем сохраненные настройки
  loadSettings();
  
  // Показываем инструкцию
  const storyText = document.getElementById('story-text');
  if (storyText) {
    storyText.textContent = 'Ожидание инициализации сессии с нейросетью.\n\nВведите API ключ и нажмите "Инициализировать сессию".';
  }

  // Настраиваем обработчики кнопок
  const initButton = document.getElementById('init-session');
  const loadSceneButton = document.getElementById('load-scene');
  const clearLogsButton = document.getElementById('clear-logs');
  
  if (initButton) {
    initButton.addEventListener('click', initializeSession);
  }
  
  if (loadSceneButton) {
    loadSceneButton.addEventListener('click', loadSceneFromAI);
  }
  
  if (clearLogsButton) {
    clearLogsButton.addEventListener('click', clearLogs);
  }

  // Обработчик изменения API ключа
  const apiKeyInput = document.getElementById('api-key');
  if (apiKeyInput) {
    // Заполняем сохраненный или захардкоженный ключ
    apiKeyInput.value = apiKey;
    apiKeyInput.addEventListener('input', (e) => {
      apiKey = e.target.value;
      saveSettings(); // Сохраняем при изменении
    });
  }

  // Обработчик изменения модели
  const modelInput = document.getElementById('model-input');
  if (modelInput) {
    // Устанавливаем сохраненную или модель по умолчанию
    modelInput.value = selectedModel;
    modelInput.addEventListener('input', (e) => {
      selectedModel = e.target.value;
      saveSettings(); // Сохраняем при изменении
      console.log('Выбрана модель:', selectedModel);
    });
  }
};


// === Работа с OpenRouter API ===

// Инициализация сессии с нейросетью
async function initializeSession() {
  if (!apiKey) {
    showApiStatus('❌ Введите API ключ OpenRouter', 'error');
    addLog('Ошибка: API ключ не введен', 'error');
    return;
  }

  showApiStatus('🔄 Инициализация сессии...', 'loading');
  addLog('Начинаем инициализацию сессии с нейросетью', 'info');
  addLog(`Используем модель: ${selectedModel}`, 'debug');

  const systemPrompt = `Ты - мастер подземелий (DM) для игры D&D. Твоя задача:

1. Создавать увлекательные сцены в формате JSON
2. Отвечать на выборы игроков новыми сценами
3. Ведение счета характеристик персонажа

ФОРМАТ СЦЕНЫ (JSON):
{
  "title": "Название сцены",
  "subtitle": "Подзаголовок",
  "text": "Описание сцены с атмосферой",
  "choices": [
    {"id": "choice1", "text": "Описание выбора"}
  ],
  "player": {
    "name": "Имя персонажа",
    "str": 15, "dex": 12, "con": 14, "int": 10, "wis": 13, "cha": 11,
    "hp": 20, "mp": 10
  },
  "stats": {
    "visible": true,
    "icons": ["💪", "🤸", "🛡️", "🧠", "🦉", "🎭"],
    "labels": ["Сила", "Ловкость", "Телосложение", "Интеллект", "Мудрость", "Харизма"]
  },
  "abilities": [
    {"icon": "⚔️", "name": "Атака", "desc": "Урон: 5"},
    {"icon": "💰", "name": "Золото", "desc": "Монеты: 100"},
    {"icon": "🧪", "name": "Зелья", "desc": "Количество: 3"}
  ]
}

Начни с вводной сцены для нового персонажа. 

Отвечай json файлами указанной структуры без markdown-разметки. `;

  try {
    addLog('Отправляем запрос к нейросети...', 'debug');
    addLog('Сообщение пользователя: "Создай вводную сцену для нового персонажа в D&D. Начни с создания персонажа и первой сцены приключения."', 'info');
    
    const response = await callOpenRouterAPI([
      { role: "system", content: systemPrompt },
      { role: "user", content: "Создай вводную сцену для нового персонажа в D&D. Начни с создания персонажа и первой сцены приключения." }
    ]);

    if (response) {
      addLog('Получен ответ от нейросети', 'success');
      addLog(`Ответ нейросети (${response.length} символов):`, 'info');
      addLog(response.substring(0, 500) + (response.length > 500 ? '...' : ''), 'debug');
      
      sessionInitialized = true;
      conversationHistory = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Создай вводную сцену для нового персонажа в D&D. Начни с создания персонажа и первой сцены приключения." },
        { role: "assistant", content: response }
      ];
      
      showApiStatus(`✅ Сессия инициализирована с моделью ${selectedModel}! Нажмите "Загрузить сцену"`, 'success');
      addLog('Сессия успешно инициализирована', 'success');
      
      // Автоматически загружаем первую сцену
      setTimeout(() => {
        loadSceneFromAI();
      }, 1000);
    }
  } catch (error) {
    showApiStatus(`❌ Ошибка инициализации: ${error.message}`, 'error');
    addLog(`Ошибка инициализации: ${error.message}`, 'error');
  }
}

// Загрузка сцены от нейросети
async function loadSceneFromAI() {
  if (!sessionInitialized) {
    showApiStatus('❌ Сначала инициализируйте сессию', 'error');
    addLog('Ошибка: сессия не инициализирована', 'error');
    return;
  }

  showApiStatus('🔄 Загрузка сцены от нейросети...', 'loading');
  addLog('Загружаем сцену от нейросети...', 'info');

  try {
    addLog('Отправляем запрос к нейросети...', 'debug');
    addLog('Сообщение пользователя: "Загрузи сцену"', 'info');
    
    const response = await callOpenRouterAPI(conversationHistory);
    
    if (response) {
      addLog('Получен ответ от нейросети', 'success');
      addLog(`Ответ нейросети (${response.length} символов):`, 'info');
      addLog(response.substring(0, 500) + (response.length > 500 ? '...' : ''), 'debug');
      
      // Парсим JSON ответ
      let sceneData;
      try {
        sceneData = JSON.parse(extractJsonFromMarkdown (response));
        addLog('JSON успешно распарсен', 'success');
    } catch (e) {
        addLog('Ошибка парсинга JSON, запрашиваем переформатирование', 'warning');
        addLog('Сообщение пользователя: "Переформатируй ответ в правильный JSON формат сцены D&D."', 'info');
        // Если не JSON, просим переформатировать
        const reformatResponse = await callOpenRouterAPI([
          ...conversationHistory,
          { role: "user", content: "Переформатируй ответ в правильный JSON формат сцены D&D." }
        ]);
        addLog(`Ответ нейросети (переформатирование, ${reformatResponse.length} символов):`, 'info');
        addLog(reformatResponse.substring(0, 500) + (reformatResponse.length > 500 ? '...' : ''), 'debug');
        sceneData = JSON.parse(reformatResponse);
        addLog('JSON переформатирован', 'success');
      }

      // Добавляем ответ в историю
      conversationHistory.push({ role: "assistant", content: response });
      
      // Рендерим сцену
      addLog('Рендерим сцену...', 'debug');
      renderScene(sceneData);
      showApiStatus('✅ Сцена загружена!', 'success');
      addLog('Сцена успешно загружена и отображена', 'success');
    }
  } catch (error) {
    showApiStatus(`❌ Ошибка загрузки сцены: ${error.message}`, 'error');
    addLog(`Ошибка загрузки сцены: ${error.message}`, 'error');
  }
}

// Вызов OpenRouter API
async function callOpenRouterAPI(messages) {
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

// Показать статус API
function showApiStatus(message, type = 'info') {
  const statusDiv = document.getElementById('api-status');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = `api-status ${type}`;
  }
}

// Отправка выбора нейросети
async function sendChoiceToAI(choice) {
  showApiStatus('🔄 Отправка выбора нейросети...', 'loading');
  addLog(`Игрок выбрал: "${choice.text}" (ID: ${choice.id})`, 'info');

  // Добавляем выбор в историю
  conversationHistory.push({
    role: "user", 
    content: `Игрок выбрал: "${choice.text}" (ID: ${choice.id}). Текущее состояние персонажа: ${JSON.stringify(player, null, 2)}. Создай следующую сцену на основе этого выбора.`
  });

  try {
    addLog('Отправляем выбор нейросети...', 'debug');
    const userMessage = `Игрок выбрал: "${choice.text}" (ID: ${choice.id}). Текущее состояние персонажа: ${JSON.stringify(player, null, 2)}. Создай следующую сцену на основе этого выбора.`;
    addLog(`Сообщение пользователя: "${userMessage.substring(0, 200)}..."`, 'info');
    
    const response = await callOpenRouterAPI(conversationHistory);
    
    if (response) {
      addLog('Получен ответ от нейросети на выбор игрока', 'success');
      addLog(`Ответ нейросети (${response.length} символов):`, 'info');
      addLog(response.substring(0, 500) + (response.length > 500 ? '...' : ''), 'debug');
      
      // Парсим JSON ответ
      let sceneData;
      try {
        sceneData = JSON.parse(extractJsonFromMarkdown(response));
        addLog('JSON ответ успешно распарсен', 'success');
      } catch (e) {
        addLog('Ошибка парсинга JSON ответа, запрашиваем переформатирование', 'warning');
        addLog('Сообщение пользователя: "Переформатируй ответ в правильный JSON формат сцены D&D."', 'info');
        // Если не JSON, просим переформатировать
        const reformatResponse = await callOpenRouterAPI([
          ...conversationHistory,
          { role: "user", content: "Переформатируй ответ в правильный JSON формат сцены D&D." }
        ]);
        addLog(`Ответ нейросети (переформатирование, ${reformatResponse.length} символов):`, 'info');
        addLog(reformatResponse.substring(0, 500) + (reformatResponse.length > 500 ? '...' : ''), 'debug');
        sceneData = JSON.parse(reformatResponse);
        addLog('JSON ответ переформатирован', 'success');
      }

      // Добавляем ответ в историю
      conversationHistory.push({ role: "assistant", content: response });
      
      // Рендерим новую сцену
      addLog('Рендерим новую сцену...', 'debug');
      renderScene(sceneData);
      showApiStatus('✅ Сцена обновлена!', 'success');
      addLog('Сцена успешно обновлена на основе выбора игрока', 'success');
    }
  } catch (error) {
    showApiStatus(`❌ Ошибка отправки выбора: ${error.message}`, 'error');
    addLog(`Ошибка отправки выбора: ${error.message}`, 'error');
  }
}

// === Отрисовка сцены ===
function renderScene(data) {
  // Сохраняем данные игрока
  if (data.player) {
    Object.assign(player, data.player);
  }

  // Заголовки
  document.title = data.title || 'D&D Игра';
  if (document.getElementById('page-title')) {
    document.getElementById('page-title').textContent = data.title || '';
  }
  document.getElementById('game-title').textContent = data.subtitle || data.title || 'Игра';

  // Имя персонажа
  document.getElementById('char-name').textContent = player.name || 'Герой';

  // HP и MP
  document.getElementById('hp-value').textContent = player.hp ?? '?';
  document.getElementById('mp-value').textContent = player.mp ?? '?';

  // Характеристики (без HP и MP)
  const statsPanel = document.getElementById('stats-panel');
  if (statsPanel) {
    statsPanel.innerHTML = '';
    if (data.stats?.visible !== false) {
      // Основные характеристики
      const statNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      const icons = data.stats?.icons || ['💪', '🤸', '🛡️', '🧠', '🦉', '🎭'];
      const labels = data.stats?.labels || ['Сила', 'Ловкость', 'Телосложение', 'Интеллект', 'Мудрость', 'Харизма'];

      statNames.forEach((stat, i) => {
        const value = player[stat] || 10;
        const mod = Math.floor((value - 10) / 2);
        const sign = mod >= 0 ? '+' : '';
        const item = document.createElement('div');
        item.className = 'stat-item compact';
        item.innerHTML = `
          <div class="stat-name">${icons[i]} ${labels[i]}</div>
          <div class="stat-value-mod">
            <span class="stat-value">${value}</span>
            <span class="stat-mod">${sign}${mod}</span>
          </div>
        `;
        statsPanel.appendChild(item);
      });
    }
  }


  // Навыки (включая атаку, золото, зелья)
  const abilitiesPanel = document.getElementById('abilities');
  if (abilitiesPanel) {
    abilitiesPanel.innerHTML = '';

    // Добавляем основные параметры
    coreAbilities.forEach(ab => {
      const div = document.createElement('div');
      div.className = 'ability';
      div.innerHTML = `
        <div class="ability-header">
          <span class="ability-icon">${ab.icon}</span>
          <span class="ability-name">${ab.name}</span>
          <span class="ability-cost">${ab.value}</span>
        </div>
        <div class="ability-desc">${ab.desc}</div>
      `;
      abilitiesPanel.appendChild(div);
    });

    // Добавляем обычные навыки
    (data.abilities || []).forEach(ab => {
      const div = document.createElement('div');
      div.className = 'ability';
      div.innerHTML = `
        <div class="ability-header">
          <span class="ability-icon">${ab.icon}</span>
          <span class="ability-name">${ab.name}</span>
          ${ab.cost ? `<span class="ability-cost">${ab.cost}</span>` : ''}
        </div>
        <div class="ability-desc">${ab.desc}</div>
      `;
      abilitiesPanel.appendChild(div);
    });
  }

  // Бой
  const battleArea = document.getElementById('battle-area');
  if (battleArea) {
    if (data.enemy) {
      battleArea.style.display = 'block';
      document.getElementById('enemy-name').textContent = data.enemy.name;
      document.getElementById('enemy-hp').textContent = data.enemy.hp;
      document.getElementById('status-effects').textContent = 
        data.enemy.status?.includes('weakened') ? '⚠️ Ослаблен' : '';
    } else {
      battleArea.style.display = 'none';
    }
  }

  // Текст
  const storyText = document.getElementById('story-text');
  storyText.textContent = '';
  typeWriter(data.text || 'Нет данных.', storyText, () => {
    const choicesContainer = document.getElementById('choices');
    if (choicesContainer) {
      choicesContainer.innerHTML = '';

      (data.choices || []).forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice.text;

        btn.onclick = () => {
          if (sessionInitialized) {
            // Отправляем выбор нейросети
            sendChoiceToAI(choice);
          } else {
            // Если сессия не инициализирована, показываем ошибку
            addLog('Ошибка: сессия не инициализирована, нельзя отправить выбор', 'error');
            alert('❌ Сначала инициализируйте сессию с нейросетью!');
          }
        };

        choicesContainer.appendChild(btn);
      });
    }
  });
}

// === Печать текста по буквам ===
function typeWriter(text, el, callback) {
  let i = 0;
  const typing = () => {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(typing, 30);
    } else if (callback) callback();
  };
  typing();
}