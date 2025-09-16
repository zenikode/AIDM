import { addLog, showApiStatus } from './logger.js';
import { apiKey, selectedModel, saveSetting, loadSetting } from './storage.js';
import { typeWriter } from './ui.js';
import { extractJsonFromMarkdown, loadFile } from './utils.js';

// === Глобальные переменные ===
let player = {};
let sessionInitialized = false;
let conversationHistory = [];

// === Инициализация при загрузке ===
window.onload = async () => {
  
  // Показываем инструкцию
  const storyText = document.getElementById('story-text');
  if (storyText) {
    storyText.textContent = 'Ожидание инициализации сессии с нейросетью.\n\nВведите API ключ и нажмите "Инициализировать сессию".';
  }

  updateChoiceAreaUI();
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
  if (storyText) {
    storyText.textContent = 'Добро пожаловать в D&D Game!\n\nПридумайте пожелания к сеттингу и нажмите "Начать игру".';
  }
  // Кнопка инициализации (главная)
  const initSessionMain = document.getElementById('init-session-main');
  if (initSessionMain) {
    initSessionMain.onclick = async () => {
      updateChoiceAreaUI(true);
      await initializeSession();
      updateChoiceAreaUI();
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
    updateChoiceAreaUI();
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
      updateChoiceAreaUI();
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
    updateChoiceAreaUI();
  }
}

// Загрузка сцены от нейросети
async function loadSceneFromAI() {
  if (!sessionInitialized) {
    showApiStatus('❌ Сначала инициализируйте сессию', 'error');
    addLog('Ошибка: сессия не инициализирована', 'error');
    updateChoiceAreaUI();
    return;
  }

  showApiStatus('🔄 Загрузка сцены от нейросети...', 'loading');
  addLog('Загружаем сцену от нейросети...', 'info');

  updateChoiceAreaUI(true);
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
      updateChoiceAreaUI();
    }
  } catch (error) {
    showApiStatus(`❌ Ошибка загрузки сцены: ${error.message}`, 'error');
    addLog(`Ошибка загрузки сцены: ${error.message}`, 'error');
    updateChoiceAreaUI();
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
    Object.assign(player, data.player);
  }

  // Заголовки
  document.title = data.title || 'D&D Игра';
  if (document.getElementById('page-title')) {
    document.getElementById('page-title').textContent = data.title || '';
  }
  const headerTitle = document.getElementById('header-title');
  if (headerTitle) headerTitle.textContent = data.subtitle || data.title || 'Игра';

  // Имя персонажа
  const charNameInline = document.getElementById('char-name-inline');
  if (charNameInline) charNameInline.textContent = player.name || 'Герой';

  // Характеристики + HP/MP (горизонтальная строка)
  const statsRowHorizontal = document.getElementById('stats-row-horizontal');
  if (statsRowHorizontal) {
    statsRowHorizontal.innerHTML = '';
    if (data.stats?.visible !== false) {
      // HP + MP в одной строке
      const hpmpRow = document.createElement('div');
      hpmpRow.className = 'hp-mp-row';
      // HP
      const hpDiv = document.createElement('div');
      hpDiv.className = 'stat-horiz-item stat-hpmp';
      hpDiv.innerHTML = `
        <span class="stat-horiz-icon">💖</span>
        <span class="stat-horiz-label">HP</span>
        <span class="stat-horiz-hpmp-value hp">${player.hp ?? '?'}</span>
      `;
      hpmpRow.appendChild(hpDiv);
      // MP
      const mpDiv = document.createElement('div');
      mpDiv.className = 'stat-horiz-item stat-hpmp';
      mpDiv.innerHTML = `
        <span class="stat-horiz-icon">🔵</span>
        <span class="stat-horiz-label">MP</span>
        <span class="stat-horiz-hpmp-value mp">${player.mp ?? '?'}</span>
      `;
      hpmpRow.appendChild(mpDiv);
      statsRowHorizontal.appendChild(hpmpRow);
      // Основные характеристики — по одной на строку
      const statNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      const icons = data.stats?.icons || ['💪', '🤸', '🛡️', '🧠', '🦉', '🎭'];
      const labels = data.stats?.labels || ['Сила', 'Ловкость', 'Телосложение', 'Интеллект', 'Мудрость', 'Харизма'];
      statNames.forEach((stat, i) => {
        const base = player[stat] || 10;
        const mod = Math.floor((base - 10) / 2);
        const total = base + mod;
        const sign = mod >= 0 ? '+' : '';
        const statDiv = document.createElement('div');
        statDiv.className = 'stat-horiz-item';
        statDiv.innerHTML = `
          <span class="stat-horiz-icon">${icons[i]}</span>
          <span class="stat-horiz-label">${labels[i]}</span>
          <span class="stat-horiz-formula">(${base}${sign}${mod})<b>${total}</b></span>
        `;
        statsRowHorizontal.appendChild(statDiv);
      });
    }
  }

  // Навыки (включая атаку, золото, зелья)
  const abilitiesPanel = document.getElementById('abilities');
  if (abilitiesPanel) {
    abilitiesPanel.innerHTML = '';

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
        ${ab.usage ? `<div class="ability-usage">${ab.usage}</div>` : ''}
      `;
      if (ab.usage) {
        div.style.cursor = 'pointer';
        div.title = 'Вставить пример использования';
        div.onclick = () => {
          const input = document.getElementById('choice-input');
          if (input) {
            if (input.value && !input.value.endsWith(' ')) {
              input.value += ' ';
            }
            input.value += ab.usage;
            input.focus();
          }
        };
      }
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
  const storyTextEl = document.getElementById('story-text');
  if (storyTextEl) storyTextEl.textContent = '';
  typeWriter(data.text || 'Нет данных.', storyTextEl, () => {
    // Область выбора с автоподстановкой
    const suggestionsDiv = document.getElementById('choices-suggestions');
    const input = document.getElementById('choice-input');
    const sendBtn = document.getElementById('choice-send-btn');
    if (window.sessionInitialized && suggestionsDiv && input && sendBtn) {
      suggestionsDiv.innerHTML = '';
      (data.choices || []).forEach(choice => {
        const btn = document.createElement('button');
          btn.className = 'suggestion-btn';
        btn.textContent = choice.text;
        btn.onclick = () => {
            input.value = choice.text;
            input.focus();
          };
          suggestionsDiv.appendChild(btn);
        });
        input.value = '';
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Отправить';
        // Отправка действия
        function sendAction() {
          const actionText = input.value.trim();
          if (!actionText) return;
          suggestionsDiv.innerHTML = '';
          updateChoiceAreaUI(true);
          sendTextActionToAI(actionText, () => {
            updateChoiceAreaUI();
          });
        }
        sendBtn.onclick = sendAction;
        input.onkeydown = e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            sendAction();
          }
        };
    }
  });
}

// Новая функция отправки действия
async function sendTextActionToAI(actionText, onError) {
  showApiStatus('🔄 Отправка действия нейросети...', 'loading');
  addLog(`Игрок ввёл действие: "${actionText}"`, 'info');
  conversationHistory.push({
    role: "user",
    content: `Игрок выбрал действие: ${actionText}. Текущее состояние персонажа: ${JSON.stringify(player, null, 2)}. Создай следующую сцену на основе этого выбора.`
  });
  updateChoiceAreaUI(true);
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
      updateChoiceAreaUI();
    }
  } catch (error) {
    showApiStatus(`❌ Ошибка отправки действия: ${error.message}`, 'error');
    addLog(`Ошибка отправки действия: ${error.message}`, 'error');
    if (typeof onError === 'function') onError();
    updateChoiceAreaUI();
  }
}

// === Управление UI области выбора ===
function updateChoiceAreaUI(isLoading = false) {
  const initSessionMain = document.getElementById('init-session-main');
  const storyPrompt = document.getElementById('init-story-prompt');
  const suggestionsDiv = document.getElementById('choices-suggestions');
  const input = document.getElementById('choice-input');
  const sendBtn = document.getElementById('choice-send-btn');
  const inputHeroName = document.getElementById('input-hero-name');
  const cardContentRow = document.getElementById('card-content-row');

  if (!window.sessionInitialized) {
    if (initSessionMain) {
      initSessionMain.style.display = 'block';
      initSessionMain.disabled = !!isLoading;
      if (isLoading) {
        initSessionMain.textContent = 'Загрузка...';
      } else {
        initSessionMain.textContent = 'Начать игру';
      }
    }
    if (storyPrompt) {
      storyPrompt.style.display = '';
      storyPrompt.disabled = !!isLoading;
    }
    if (suggestionsDiv) suggestionsDiv.style.display = 'none';
    if (input) input.style.display = 'none';
    if (sendBtn) sendBtn.style.display = 'none';
    if (inputHeroName) inputHeroName.style.display = 'none';
    if (cardContentRow) cardContentRow.classList.add('hidden');
  } else {
    if (initSessionMain) initSessionMain.style.display = 'none';
    if (storyPrompt) {
      storyPrompt.style.display = 'none';
      storyPrompt.disabled = false;
    }
    if (suggestionsDiv) suggestionsDiv.style.display = '';
    if (input) {
      input.style.display = '';
      input.disabled = !!isLoading;
    }
    if (sendBtn) {
      sendBtn.style.display = '';
      sendBtn.disabled = !!isLoading;
      sendBtn.textContent = isLoading ? 'Отправка...' : 'Отправить';
    }
    if (inputHeroName) inputHeroName.style.display = '';
    if (cardContentRow) cardContentRow.classList.remove('hidden');
  }
}