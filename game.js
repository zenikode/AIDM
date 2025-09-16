import { addLog, showApiStatus } from './logger.js';
import { apiKey, selectedModel, saveSetting, loadSetting } from './storage.js';
import { extractJsonFromMarkdown, loadFile } from './utils.js';
import { showStoryText, setStoryText } from './story.js';
import { DOMManager } from './modules/domManager.js';
import { Player } from './modules/Player.js';
import { SceneMediator } from './modules/SceneMediator.js';

// === Глобальные переменные ===
let player = new Player();
let domManager = new DOMManager();
let sceneMediator = new SceneMediator();
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
    addLog('Отправляем запрос к нейросети через медиатор...', 'debug');
    addLog('Сообщение пользователя: ' + JSON.stringify(userPrompt), 'info');

    const initialized = await sceneMediator.initializeSession(systemPrompt, userPrompt);

    if (initialized) {
      addLog('Медиатор успешно инициализировал сессию', 'success');
      
      sessionInitialized = true;
      window.sessionInitialized = true;
      domManager.updateChoiceArea();
      
      showApiStatus(`✅ Сессия инициализирована с моделью ${selectedModel}! Нажмите \"Загрузить сцену\"`, 'success');
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
  addLog('Загружаем сцену от нейросети через медиатор...', 'info');

  domManager.updateChoiceArea(true);
  try {
    addLog('Отправляем запрос к нейросети через медиатор...', 'debug');
    
    const sceneData = await sceneMediator.loadScene();
    
    if (sceneData) {
      addLog('Медиатор успешно загрузил сцену', 'success');
      
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
  addLog(`Игрок ввёл действие: \"${actionText}\"`, 'info');
  
  domManager.updateChoiceArea(true);
  try {
    addLog('Отправляем действие нейросети через медиатор...', 'debug');
    const sceneData = await sceneMediator.sendPlayerAction(actionText, player.toJSON());
    
    if (sceneData) {
      addLog('Медиатор успешно обработал действие игрока', 'success');
      
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