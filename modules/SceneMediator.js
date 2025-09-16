// SceneMediator - посредник между game.js и api.js
// Управляет загрузкой сцен и возвращает готовые JSON объекты

import { initializeSessionWithAI, continueConversationWithAI, reformatResponseToJSON } from '../api.js';
import { extractJsonFromMarkdown } from '../utils.js';
import { addLog } from '../logger.js';

export class SceneMediator {
  constructor() {
    this.sessionInitialized = false;
    this.conversationHistory = [];
    this.sceneCallbacks = [];
    this.isLoading = false;
  }

  // Инициализация сессии с нейросетью
  async initializeSession(systemPrompt, userPrompt) {
    if (this.isLoading) {
      addLog('Медиатор уже выполняет операцию', 'warning');
      return;
    }

    this.isLoading = true;
    addLog('Медиатор: начинаем инициализацию сессии', 'info');

    try {
      const response = await initializeSessionWithAI(systemPrompt, userPrompt);
      
      if (response) {
        this.sessionInitialized = true;
        this.conversationHistory = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
          { role: "assistant", content: response }
        ];
        
        addLog('Медиатор: сессия успешно инициализирована', 'success');
        this.isLoading = false;
        return true;
      }
    } catch (error) {
      addLog(`Медиатор: ошибка инициализации: ${error.message}`, 'error');
      this.isLoading = false;
      throw error;
    }

    this.isLoading = false;
    return false;
  }

  // Загрузка сцены от нейросети
  async loadScene() {
    if (!this.sessionInitialized) {
      throw new Error('Сессия не инициализирована');
    }

    if (this.isLoading) {
      addLog('Медиатор: уже загружает сцену', 'warning');
      return null;
    }

    this.isLoading = true;
    addLog('Медиатор: начинаем загрузку сцены', 'info');

    try {
      const response = await continueConversationWithAI(this.conversationHistory);
      
      if (response) {
        addLog('Медиатор: получен ответ от нейросети', 'success');
        
        // Парсим JSON ответ
        let sceneData;
        try {
          sceneData = JSON.parse(extractJsonFromMarkdown(response));
          addLog('Медиатор: JSON успешно распарсен', 'success');
        } catch (e) {
          addLog('Медиатор: ошибка парсинга JSON, запрашиваем переформатирование', 'warning');
          
          // Если не JSON, просим переформатировать
          const reformatResponse = await reformatResponseToJSON(this.conversationHistory);
          sceneData = JSON.parse(reformatResponse);
          addLog('Медиатор: JSON переформатирован', 'success');
        }

        // Добавляем ответ в историю
        this.conversationHistory.push({ role: "assistant", content: response });
        
        this.isLoading = false;
        return sceneData;
      }
    } catch (error) {
      addLog(`Медиатор: ошибка загрузки сцены: ${error.message}`, 'error');
      this.isLoading = false;
      throw error;
    }

    this.isLoading = false;
    return null;
  }

  // Отправка действия игрока и получение новой сцены
  async sendPlayerAction(actionText, playerState) {
    if (!this.sessionInitialized) {
      throw new Error('Сессия не инициализирована');
    }

    if (this.isLoading) {
      addLog('Медиатор: уже обрабатывает действие', 'warning');
      return null;
    }

    this.isLoading = true;
    addLog(`Медиатор: обрабатываем действие игрока: "${actionText}"`, 'info');

    // Добавляем действие в историю
    this.conversationHistory.push({
      role: "user",
      content: `Игрок выбрал действие: ${actionText}. Текущее состояние персонажа: ${JSON.stringify(playerState, null, 2)}. Создай следующую сцену на основе этого выбора.`
    });

    try {
      const response = await continueConversationWithAI(this.conversationHistory);
      
      if (response) {
        addLog('Медиатор: получен ответ на действие игрока', 'success');
        
        // Парсим JSON ответ
        let sceneData;
        try {
          sceneData = JSON.parse(extractJsonFromMarkdown(response));
          addLog('Медиатор: JSON ответ успешно распарсен', 'success');
        } catch (e) {
          addLog('Медиатор: ошибка парсинга JSON ответа, запрашиваем переформатирование', 'warning');
          
          const reformatResponse = await reformatResponseToJSON(this.conversationHistory);
          sceneData = JSON.parse(reformatResponse);
          addLog('Медиатор: JSON ответ переформатирован', 'success');
        }

        // Добавляем ответ в историю
        this.conversationHistory.push({ role: "assistant", content: response });
        
        this.isLoading = false;
        return sceneData;
      }
    } catch (error) {
      addLog(`Медиатор: ошибка обработки действия: ${error.message}`, 'error');
      this.isLoading = false;
      throw error;
    }

    this.isLoading = false;
    return null;
  }

  // Проверка состояния загрузки
  isLoading() {
    return this.isLoading;
  }

  // Проверка инициализации сессии
  isSessionInitialized() {
    return this.sessionInitialized;
  }

  // Очистка истории
  clearHistory() {
    this.conversationHistory = [];
    this.sessionInitialized = false;
    addLog('Медиатор: история очищена', 'info');
  }
}