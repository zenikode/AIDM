import { addLog, showApiStatus } from './logger.js';
import { apiKey, selectedModel, saveSetting, loadSetting } from './storage.js';
import { extractJsonFromMarkdown, loadFile } from './utils.js';
import { showStoryText, setStoryText } from './story.js';
import { DOMManager } from './modules/domManager.js';
import { Player } from './modules/Player.js';

// === Глобальные переменные ===
let player = new Player();
let domManager = new DOMManager();
let sessionInitialized = false;
let conversationHistory = [];

// === Инициализация при загрузке ===
window.onload = async () => {
  
  // Показываем инструкцию
  setStoryText('Ожидание инициализации сессии с нейросетью.\n\nВведите API ключ и нажмите "Инициализировать сессию".');

  domManager.updateChoiceArea();
  // Установить дефолтное пожелание, если поле пустое
  const storyPrompt = document.getElementById('init-story-prompt');
  if (storyPrompt) {
    const saved = loadSetting();
    if (saved) {
      storyPrompt.value = saved;
    } else {
      storyPrompt.value = await loadFile('default_setting.txt');
    }
    storyPrompt.addEventListener('input', saveSetting);
  }
  // Дружелюбный стартовый текст
  setStoryText('Добро пожаловать в D&D Game!\n\nПридумайте пожелания к сеттингу и нажмите "Начать игру".');
  // Кнопка инициализации (главная)
  const initSessionMain = document.getElementById('init-session-main');
  if (initSessionMain) {
    initSessionMain.onclick = async () => {
      domManager.updateChoiceArea(true);
      await initializeSession();
      domManager.updateChoiceArea();
      const storyPrompt = document.getElementById('init-story-prompt');
      if (storyPrompt) {
        storyPrompt.value = await loadFile('default_setting.txt');
        saveSetting();
      }
    };
  }
};


// === Работа с OpenRouter API ===

// Инициализация сессии с нейросетью
async function initializeSession() {
  if (!apiKey) {
    showApiStatus('❌ Необходимо добавить API ключ в настройках (🛠️ вверху справа)', 'error');
    addLog('Ошибка: API ключ не введен', 'error');
    domManager.updateChoiceArea();
    return;
  }

  showApiStatus('🔄 Инициализация сессии...', 'loading');
  addLog('Начинаем инициализацию сессии с нейросетью', 'info');
  addLog(`Используем модель: ${selectedModel}`, 'debug');

  const systemPrompt = await loadFile('prompt.txt');
  // Получаем пожелания/предысторию
  let userPrompt = "Создай вводную сцену для нового персонажа в D&D. Начни с создания персонажа и первой сцены приключения.";
  const storyPrompt = document.getElementById('init-story-prompt');
  if (storyPrompt && storyPrompt.value.trim()) {
    userPrompt += "\n\nПожелания игрока: " + storyPrompt.value.trim();
  }

  try {
    addLog('Отправляем запрос к нейросети...', 'debug');
    addLog('Сообщение пользователя: ' + JSON.stringify(userPrompt), 'info');

    const response = await callOpenRouterAPI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    if (response) {
      addLog('Получен ответ от нейросети', 'success');
      addLog(`Ответ нейросети (${response.length} символов):`, 'info');
      addLog(response, 'debug');

      sessionInitialized = true;
      window.sessionInitialized = true;
      domManager.updateChoiceArea();
        conversationHistory = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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
    domManager.updateChoiceArea();
  }
}

// Загрузка сцены от нейросети
async function loadSceneFromAI() {
  if (!sessionInitialized) {
    showApiStatus('❌ Сначала инициализируйте сессию', 'error');
    addLog('Ошибка: сессия не инициализирована', 'error');
    domManager.updateChoiceArea();
    return;
  }

  showApiStatus('🔄 Загрузка сцены от нейросети...', 'loading');
  addLog('Загружаем сцену от нейросети...', 'info');

  domManager.updateChoiceArea(true);
  try {
    addLog('Отправляем запрос к нейросети...', 'debug');
    addLog('Сообщение пользователя: "Загрузи сцену"', 'info');
    
    const response = await callOpenRouterAPI(conversationHistory);
    
    if (response) {
      addLog('Получен ответ от нейросети', 'success');
      addLog(`Ответ нейросети (${response.length} символов):`, 'info');
      addLog(response, 'debug');
      
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
  addLog(reformatResponse, 'debug');
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
      domManager.updateChoiceArea();
    }
  } catch (error) {
    showApiStatus(`❌ Ошибка загрузки сцены: ${error.message}`, 'error');
    addLog(`Ошибка загрузки сцены: ${error.message}`, 'error');
    domManager.updateChoiceArea();
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

// === Отрисовка сцены ===
function renderScene(data) {
  // Сохраняем данные игрока
  if (data.player) {
    player.update(data.player);
    domManager.updatePlayerData(data.player);
  }

  // Заголовки
  domManager.updateTitles({
    title: data.title,
    subtitle: data.subtitle
  });

  // Способности
  domManager.renderAbilities(data.abilities || []);

  // Враг
  domManager.renderEnemy(data.enemy);

  // Текст
  showStoryText(data.text || 'Нет данных.', () => {
    // Область выбора с автоподстановкой
    if (window.sessionInitialized) {
      domManager.renderChoices(data.choices || []);
      
      // Отправка действия
      function sendAction() {
        const actionText = domManager.getInputValue();
        if (!actionText) return;
        domManager.clearChoices();
        domManager.updateChoiceArea(true);
        sendTextActionToAI(actionText, () => {
          domManager.updateChoiceArea();
        });
      }
      
      domManager.setChoiceHandlers(sendAction, e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendAction();
        }
      });
    }
  });
}

// Новая функция отправки действия
async function sendTextActionToAI(actionText, onError) {
  showApiStatus('🔄 Отправка действия нейросети...', 'loading');
  addLog(`Игрок ввёл действие: "${actionText}"`, 'info');
  conversationHistory.push({
    role: "user",
    content: `Игрок выбрал действие: ${actionText}. Текущее состояние персонажа: ${JSON.stringify(player.toJSON(), null, 2)}. Создай следующую сцену на основе этого выбора.`
  });
  domManager.updateChoiceArea(true);
  try {
    addLog('Отправляем действие нейросети...', 'debug');
    const response = await callOpenRouterAPI(conversationHistory);
    if (response) {
      addLog('Получен ответ от нейросети на действие игрока', 'success');
      addLog(`Ответ нейросети (${response.length} символов):`, 'info');
      addLog(response, 'debug');
      let sceneData;
      try {
        sceneData = JSON.parse(extractJsonFromMarkdown(response));
        addLog('JSON ответ успешно распарсен', 'success');
      } catch (e) {
        addLog('Ошибка парсинга JSON ответа, запрашиваем переформатирование', 'warning');
        addLog('Сообщение пользователя: "Переформатируй ответ в правильный JSON формат сцены D&D."', 'info');
        const reformatResponse = await callOpenRouterAPI([
          ...conversationHistory,
          { role: "user", content: "Переформатируй ответ в правильный JSON формат сцены D&D." }
        ]);
        addLog(`Ответ нейросети (переформатирование, ${reformatResponse.length} символов):`, 'info');
  addLog(reformatResponse, 'debug');
        sceneData = JSON.parse(reformatResponse);
        addLog('JSON ответ переформатирован', 'success');
      }
      conversationHistory.push({ role: "assistant", content: response });
      addLog('Рендерим новую сцену...', 'debug');
      renderScene(sceneData);
      showApiStatus('✅ Сцена обновлена!', 'success');
      addLog('Сцена успешно обновлена на основе действия игрока', 'success');
      domManager.updateChoiceArea();
    }
  } catch (error) {
    showApiStatus(`❌ Ошибка отправки действия: ${error.message}`, 'error');
    addLog(`Ошибка отправки действия: ${error.message}`, 'error');
    if (typeof onError === 'function') onError();
    domManager.updateChoiceArea();
  }
}

// Установка обработчиков DM панели
domManager.setDMPanelHandlers();

// Панель DM overlay toggle
const toggleDMBtn = document.getElementById('toggle-dm-panel');
const dmOverlay = document.getElementById('dm-overlay');
if (toggleDMBtn && dmOverlay) {
  toggleDMBtn.onclick = () => {
      dmOverlay.style.display = 'flex';
  };
  dmOverlay.onclick = (e) => {
      if (e.target === dmOverlay) {
      dmOverlay.style.display = 'none';
      }
  };
}