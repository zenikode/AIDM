export class DOMManager {
  constructor() {
    this.player = {};
    this.elements = this._cacheElements();
  }

  // Кэширование DOM элементов
  _cacheElements() {
    return {
      // Заголовки
      pageTitle: document.getElementById('page-title'),
      headerTitle: document.getElementById('header-title'),
      charNameInline: document.getElementById('char-name-inline'),
      
      // Статистика
      statsRowHorizontal: document.getElementById('stats-row-horizontal'),
      
      // Способности
      abilitiesPanel: document.getElementById('abilities'),
      
      // Бой
      battleArea: document.getElementById('battle-area'),
      enemyName: document.getElementById('enemy-name'),
      enemyHp: document.getElementById('enemy-hp'),
      statusEffects: document.getElementById('status-effects'),
      enemyOverlay: document.getElementById('enemy-overlay'),
      
      // Область выбора
      initSessionMain: document.getElementById('init-session-main'),
      storyPrompt: document.getElementById('init-story-prompt'),
      suggestionsDiv: document.getElementById('choices-suggestions'),
      choiceInput: document.getElementById('choice-input'),
      choiceSendBtn: document.getElementById('choice-send-btn'),
      inputHeroName: document.getElementById('input-hero-name'),
      cardContentRow: document.getElementById('card-content-row'),
      
      // DM панель
      toggleDMBtn: document.getElementById('toggle-dm-panel'),
      dmOverlay: document.getElementById('dm-overlay'),
      
      // API элементы
      apiKeyInput: document.getElementById('api-key'),
      modelInput: document.getElementById('model-input'),
      consoleLogs: document.getElementById('console-logs'),
      apiStatus: document.getElementById('api-status'),
      clearLogsBtn: document.getElementById('clear-logs'),
      
      // История чата
      chatHistory: document.getElementById('chat-history'),
      
      // Приветственный экран
      welcomeScreen: document.getElementById('welcome-screen'),

      // Clear button
      clearSessionBtn: document.getElementById('clear-session')
    };
  }

  // Обновление данных игрока
  updatePlayerData(playerData) {
    this.player = { ...this.player, ...playerData };
    this._updatePlayerUI();
  }

  // Обновление UI игрока
  _updatePlayerUI() {
    // Имя персонажа
    if (this.elements.charNameInline) {
      this.elements.charNameInline.textContent = this.player.name || 'Герой';
    }

    // Характеристики
    this._renderStats();
  }

  // Рендеринг характеристик
  _renderStats() {
    if (!this.elements.statsRowHorizontal) return;

    this.elements.statsRowHorizontal.innerHTML = '';

    // HP + MP в одной строке
    const hpmpRow = document.createElement('div');
    hpmpRow.className = 'hp-mp-row';
    
    // HP
    const hpDiv = document.createElement('div');
    hpDiv.className = 'stat-horiz-item stat-hpmp';
    hpDiv.innerHTML = `
      <span class="stat-horiz-icon">💖</span>
      <span class="stat-horiz-label">HP</span>
      <span class="stat-horiz-hpmp-value hp">${this.player.hp ?? '?'}</span>
    `;
    hpmpRow.appendChild(hpDiv);
    
    // MP
    const mpDiv = document.createElement('div');
    mpDiv.className = 'stat-horiz-item stat-hpmp';
    mpDiv.innerHTML = `
      <span class="stat-horiz-icon">🔵</span>
      <span class="stat-horiz-label">MP</span>
      <span class="stat-horiz-hpmp-value mp">${this.player.mp ?? '?'}</span>
    `;
    hpmpRow.appendChild(mpDiv);
    
    this.elements.statsRowHorizontal.appendChild(hpmpRow);

    // Основные характеристики
    const statNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const icons = ['💪', '🤸', '🛡️', '🧠', '🦉', '🎭'];
    const labels = ['Сила', 'Ловкость', 'Телосложение', 'Интеллект', 'Мудрость', 'Харизма'];
    
    statNames.forEach((stat, i) => {
      const base = this.player[stat] || 10;
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
      this.elements.statsRowHorizontal.appendChild(statDiv);
    });
  }

  // Рендеринг способностей
  renderAbilities(abilities = []) {
    if (!this.elements.abilitiesPanel) return;

    this.elements.abilitiesPanel.innerHTML = '';

    abilities.forEach(ab => {
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
          if (this.elements.choiceInput) {
            if (this.elements.choiceInput.value && !this.elements.choiceInput.value.endsWith(' ')) {
              this.elements.choiceInput.value += ' ';
            }
            this.elements.choiceInput.value += ab.usage;
            
          }
        };
      }
      
      this.elements.abilitiesPanel.appendChild(div);
    });
  }

  // Рендеринг врага
  renderEnemy(enemyData) {
    const enemiesContainer = document.getElementById('enemies-container') || this.elements.battleArea.querySelector('.enemies-container');
    const overlay = this.elements.enemyOverlay;

    if (!enemiesContainer || !overlay) return;

    // Clear previous enemies
    enemiesContainer.innerHTML = '';

    let enemies = [];
    if (Array.isArray(enemyData)) {
      enemies = enemyData;
    } else if (enemyData) {
      enemies = [enemyData]; // Wrap single in array
    }

    if (enemies.length > 0) {
      overlay.style.display = 'block';
      
      enemies.forEach(enemy => {
        const enemyBox = document.createElement('div');
        enemyBox.className = 'enemy-box';
        
        enemyBox.innerHTML = `
          <div class="enemy-name">${enemy.name || 'Враг'}</div>
          <div class="enemy-hp">HP: <span>${enemy.hp || '?'}</span></div>
          <div class="status-effects">
            ${enemy.status ? enemy.status.map(status => `<span class="status-tag">${status}</span>`).join('') : ''}
          </div>
        `;
        
        enemiesContainer.appendChild(enemyBox);
      });
    } else {
      overlay.style.display = 'none';
    }
  }

  // Обновление заголовков
  updateTitles(titleData = {}) {
    document.title = titleData.title || 'D&D Игра';
    
    if (this.elements.pageTitle) {
      this.elements.pageTitle.textContent = titleData.title || '';
    }
    
    if (this.elements.headerTitle) {
      this.elements.headerTitle.textContent = titleData.subtitle || titleData.title || 'Игра';
    }
  }

  // Обновление области выбора
  updateChoiceArea(isLoading = false) {
    if (!window.sessionInitialized) {
      this._showInitUI(isLoading);
    } else {
      this._showGameUI(isLoading);
    }
  }

  // Показать UI инициализации
  _showInitUI(isLoading) {
    if (this.elements.initSessionMain) {
      this.elements.initSessionMain.style.display = 'block';
      this.elements.initSessionMain.disabled = !!isLoading;
      this.elements.initSessionMain.textContent = isLoading ? 'Загрузка...' : 'Начать игру';
    }
    
    if (this.elements.storyPrompt) {
      this.elements.storyPrompt.style.display = '';
      this.elements.storyPrompt.disabled = !!isLoading;
    }
    
    this._hideGameElements();
  }

  // Показать UI игры
  _showGameUI(isLoading) {
    if (this.elements.initSessionMain) this.elements.initSessionMain.style.display = 'none';
    
    if (this.elements.storyPrompt) {
      this.elements.storyPrompt.style.display = 'none';
      this.elements.storyPrompt.disabled = false;
    }
    
    this._showGameElements(isLoading);
  }

  // Скрыть игровые элементы
  _hideGameElements() {
    if (this.elements.suggestionsDiv) this.elements.suggestionsDiv.style.display = 'none';
    if (this.elements.choiceInput) this.elements.choiceInput.style.display = 'none';
    if (this.elements.choiceSendBtn) this.elements.choiceSendBtn.style.display = 'none';
    if (this.elements.inputHeroName) this.elements.inputHeroName.style.display = 'none';
    if (this.elements.cardContentRow) this.elements.cardContentRow.classList.add('hidden');
  }

  // Показать игровые элементы
  _showGameElements(isLoading) {
    if (this.elements.suggestionsDiv) this.elements.suggestionsDiv.style.display = '';
    if (this.elements.choiceInput) {
      this.elements.choiceInput.style.display = '';
      this.elements.choiceInput.disabled = !!isLoading;
    }
    if (this.elements.choiceSendBtn) {
      this.elements.choiceSendBtn.style.display = '';
      this.elements.choiceSendBtn.disabled = !!isLoading;
      this.elements.choiceSendBtn.textContent = isLoading ? 'Отправка...' : 'Отправить';
    }
    if (this.elements.inputHeroName) this.elements.inputHeroName.style.display = '';
    if (this.elements.cardContentRow) this.elements.cardContentRow.classList.remove('hidden');
  }

  // Рендеринг предложений выбора
  renderChoices(choices = []) {
    if (!this.elements.suggestionsDiv) return;

    this.elements.suggestionsDiv.innerHTML = '';
    
    choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'suggestion-btn';
      btn.textContent = choice.text;
      btn.onclick = () => {
        if (this.elements.choiceInput) {
          this.elements.choiceInput.value = choice.text;
          
        }
      };
      this.elements.suggestionsDiv.appendChild(btn);
    });

    if (this.elements.choiceInput) {
      this.elements.choiceInput.disabled = false;
    }
    
    if (this.elements.choiceSendBtn) {
      this.elements.choiceSendBtn.disabled = false;
      this.elements.choiceSendBtn.textContent = 'Отправить';
    }
  }

  // Очистка предложений выбора
  clearChoices() {
    if (this.elements.suggestionsDiv) {
      this.elements.suggestionsDiv.innerHTML = '';
    }
  }

  // Получение значения ввода
  getInputValue() {
    return this.elements.choiceInput ? this.elements.choiceInput.value.trim() : '';
  }

  // Очистка ввода
  clearInput() {
    if (this.elements.choiceInput) {
      this.elements.choiceInput.value = '';
    }
  }

  // Установка обработчиков событий
  setChoiceHandlers(onSendAction, onInputKeyDown) {
    if (this.elements.choiceSendBtn && this.elements.choiceInput) {
      this.elements.choiceSendBtn.onclick = onSendAction;
      this.elements.choiceInput.onkeydown = onInputKeyDown;
    }
  }

  // Установка обработчиков DM панели
  setDMPanelHandlers() {
    if (this.elements.toggleDMBtn && this.elements.dmOverlay) {
      this.elements.toggleDMBtn.onclick = () => {
        this.elements.dmOverlay.style.display = 'flex';
      };
      
      this.elements.dmOverlay.onclick = (e) => {
        if (e.target === this.elements.dmOverlay) {
          this.elements.dmOverlay.style.display = 'none';
        }
      };
    }

    // Clear session button handler will be set in game.js
  }

  // Добавить сообщение игрока в историю
  appendPlayerMessage(actionText) {
    if (!this.elements.chatHistory) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-player';
    messageDiv.innerHTML = `<div class="message-text">Действие: ${actionText}</div>`;
    
    this.elements.chatHistory.appendChild(messageDiv);
    
    // Scroll to align message at top
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Track in global chatMessages
    if (window.chatMessages) {
      window.chatMessages.push({ type: 'player', content: actionText });
    }
  }

  // Добавить сообщение AI в историю
  appendAIMessage(sceneData, callback) {
    if (!this.elements.chatHistory) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-ai';
    
    // Убираем заголовки из сообщения чата
    let content = `<div class="message-text" id="temp-text-${Date.now()}"></div>`; // Только основной текст
    
    messageDiv.innerHTML = content;
    this.elements.chatHistory.appendChild(messageDiv);
    
    // Scroll to align message at top of screen before typing
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    const textEl = messageDiv.querySelector('.message-text');
    if (sceneData.text && textEl) {
      typeWriter(sceneData.text, textEl, () => {
        // Optional scroll after typing if needed
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (callback) callback();
      });
    } else {
      if (callback) callback();
    }

    // Track in global chatMessages
    if (window.chatMessages && sceneData.text) {
      window.chatMessages.push({ type: 'ai', content: sceneData.text });
    }
  }

  // Restore chat history from saved messages (no animation)
  restoreChatHistory(messages) {
    if (!this.elements.chatHistory || !messages) return;

    this.elements.chatHistory.innerHTML = '';

    messages.forEach((msg, index) => {
      const messageDiv = document.createElement('div');
      if (msg.type === 'player') {
        messageDiv.className = 'message-player';
        messageDiv.innerHTML = `<div class="message-text">Действие: ${msg.content}</div>`;
      } else if (msg.type === 'ai') {
        messageDiv.className = 'message-ai';
        messageDiv.innerHTML = `<div class="message-text">${msg.content}</div>`;
      }
      this.elements.chatHistory.appendChild(messageDiv);
      
      // Scroll last message to top
      if (index === messages.length - 1) {
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Очистка истории чата (например, при новой игре)
  clearChatHistory() {
    if (this.elements.chatHistory) {
      this.elements.chatHistory.innerHTML = '';
    }
    if (window.chatMessages) {
      window.chatMessages = [];
    }
  }

  // Показать приветственный экран
  showWelcome() {
    if (this.elements.welcomeScreen) {
      this.elements.welcomeScreen.classList.remove('hidden');
      this.elements.welcomeScreen.style.display = 'flex';
    }
  }

  // Скрыть приветственный экран
  hideWelcome() {
    if (this.elements.welcomeScreen) {
      this.elements.welcomeScreen.classList.add('hidden');
      setTimeout(() => {
        this.elements.welcomeScreen.style.display = 'none';
      }, 500); // Соответствует длительности перехода
    }
  }

  // New method to toggle clear session button visibility
  toggleClearButton(show) {
    const clearBtn = document.getElementById('clear-session');
    if (clearBtn) {
      clearBtn.style.display = show ? 'block' : 'none';
    }
  }
}


function typeWriter(text, el, callback) {
  let i = 0;
  el.textContent = '';
  const typing = () => {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(typing, 30);
    } else if (callback) callback();
  };
  typing();
}
