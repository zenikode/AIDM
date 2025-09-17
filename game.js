import { addLog, showApiStatus } from './logger.js';
import { apiKey, selectedModel, saveSetting, loadSetting } from './storage.js';
import { loadFile } from './utils.js';
import { DOMManager } from './modules/domManager.js';
import { Player } from './modules/Player.js';
import { SceneMediator } from './modules/SceneMediator.js';

// === Глобальные переменные ===
let player = new Player();
let domManager = new DOMManager();
let sceneMediator = new SceneMediator();
let sessionInitialized = false;
let conversationHistory = [];
let chatHistoryCleared = false; // <--- Новая переменная для отслеживания очистки истории чата

// === Инициализация при загрузке ===
window.onload = async () => {

  domManager.updateChoiceArea();

  // Установка обработчиков DM панели
  domManager.setDMPanelHandlers();

  // Дружелюбный стартовый текст - replaced with welcome screen
  domManager.showWelcome();

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
  // Кнопка инициализации (главная)
  const initSessionMain = document.getElementById('init-session-main');
  if (initSessionMain) {
    initSessionMain.onclick = async () => {
      await initializeSession();
    };
  }
};


// === Работа с OpenRouter API ===

// Инициализация сессии с нейросетью
async function initializeSession() {
  domManager.updateChoiceArea(true);
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

    const sceneData = await sceneMediator.initializeSession(systemPrompt, userPrompt);

    if (sceneData) {
      addLog('Медиатор успешно инициализировал сессию и вернул первую сцену', 'success');
      
      sessionInitialized = true;
      window.sessionInitialized = true;
      
      if (!chatHistoryCleared) {
        domManager.clearChatHistory();
        chatHistoryCleared = true;
      }
      
      domManager.updateChoiceArea();
      
      showApiStatus(`✅ Сессия инициализирована с моделью ${selectedModel}!`, 'success');
      addLog('Сессия успешно инициализирована и первая сцена готова', 'success');
      
      // Append initial AI scene with animation and choices after
      renderScene(sceneData);
      
      // Hide welcome after first message
      domManager.hideWelcome();
    } else {
      showApiStatus('❌ Не удалось инициализировать сессию', 'error');
      addLog('Медиатор не вернул сцену', 'error');
    }
  } catch (error) {
    showApiStatus(`❌ Ошибка инициализации: ${error.message}`, 'error');
    addLog(`Ошибка инициализации: ${error.message}`, 'error');
    domManager.updateChoiceArea();
  }
  domManager.updateChoiceArea();
}

// Новая функция отправки действия
async function sendTextActionToAI(actionText, onError) {
  showApiStatus('🔄 Отправка действия нейросети...', 'loading');
  addLog(`Игрок ввёл действие: "${actionText}"`, 'info');
  
  domManager.updateChoiceArea(true);
  
  // Append player action to history
  domManager.appendPlayerMessage(actionText);
  
  domManager.clearInput(); // Clear input after sending
  
  try {
    addLog('Отправляем действие нейросети через медиатор...', 'debug');
    const sceneData = await sceneMediator.sendPlayerAction(actionText, player.toJSON());
    
    if (sceneData) {
      addLog('Медиатор успешно обработал действие игрока', 'success');
      renderScene(sceneData);
      domManager.updateChoiceArea();
    }
  } catch (error) {
    showApiStatus(`❌ Ошибка отправки действия: ${error.message}`, 'error');
    addLog(`Ошибка отправки действия: ${error.message}`, 'error');
    if (typeof onError === 'function') onError();
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
      renderScene(sceneData);
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
  addLog('Рендерим сцену...', 'debug');
  
  // Сохраняем данные игрока
  if (data.player) {
    player.update(data.player);
    domManager.updatePlayerData(data.player);
  }

  // Append AI scene with animation, callback renders choices
  domManager.appendAIMessage(data, () => {
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

  // Заголовки (update for current, but since no current, perhaps set header)
  domManager.updateTitles({
    title: data.title,
    subtitle: data.subtitle
  });

  // Способности
  domManager.renderAbilities(data.abilities || []);

  // Враг
  domManager.renderEnemy(data.enemy);
}

// Optional: Clear history on new session if desired, but keep persistent by default