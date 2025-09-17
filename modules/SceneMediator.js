// SceneMediator - посредник между game.js и api.js
// Управляет загрузкой сцен и возвращает готовые JSON объекты

import { initializeSessionWithAI, continueConversationWithAI, reformatResponseToJSON } from '../api.js';
import { addLog } from '../logger.js';

export class SceneMediator {
  constructor() {
    this.sessionInitialized = false;
    this.conversationHistory = [];
    this.sceneCallbacks = [];
    this.isLoading = false;
  }

  async _parseSceneResponse(response, history) {
    let sceneData;
    let usedResponse = response;
    try {
      sceneData = JSON.parse(response.trim());
      addLog('Медиатор: ответ успешно распарсен напрямую', 'success');
    } catch (e) {
      addLog('Медиатор: ошибка парсинга ответа, переформатируем', 'warning');
      const tempHistory = [...history, { role: "assistant", content: response }];
      const reformatResponse = await reformatResponseToJSON(tempHistory);
      sceneData = JSON.parse(reformatResponse);
      addLog('Медиатор: ответ переформатирован', 'success');
      usedResponse = reformatResponse;
    }
    return { sceneData, usedResponse };
  }

  // Инициализация сессии с нейросетью
  async initializeSession(systemPrompt, userPrompt) {
    if (this.isLoading) {
      addLog('Медиатор уже выполняет операцию', 'warning');
      return null;
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
        
        const { sceneData, usedResponse } = await this._parseSceneResponse(response, this.conversationHistory);
        this.conversationHistory[2].content = usedResponse;
        
        this.isLoading = false;
        return sceneData;
      }
    } catch (error) {
      addLog(`Медиатор: ошибка инициализации: ${error.message}`, 'error');
      this.isLoading = false;
      throw error;
    }

    this.isLoading = false;
    return null;
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
        
        const { sceneData, usedResponse } = await this._parseSceneResponse(response, this.conversationHistory);
        this.conversationHistory.push({ role: "assistant", content: usedResponse });
        
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
        
        const { sceneData, usedResponse } = await this._parseSceneResponse(response, this.conversationHistory);
        this.conversationHistory.push({ role: "assistant", content: usedResponse });
        
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