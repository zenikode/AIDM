export let apiKey = loadApiKey();
export let selectedModel = loadModel();

function saveApiKey(apiKey) {
  localStorage.setItem('dnd_api_key', apiKey);
}

function loadApiKey() {
  return localStorage.getItem('dnd_api_key');
}

function saveModel(selectedModel) {
  localStorage.setItem('dnd_model', selectedModel);
}

function loadModel() {
  let model = localStorage.getItem('dnd_model');
  if (!model) {
    model = 'openrouter/sonoma-dusk-alpha';
    saveModel(model); // Set and save default
  }
  return model;
}

export function saveSetting(storyPrompt) {
  localStorage.setItem('dnd_setting', storyPrompt);
}

export function loadSetting() {
  return localStorage.getItem('dnd_setting');
}

// New functions for game state
export function saveGameState(state) {
  localStorage.setItem('dnd_game_state', JSON.stringify(state));
}

export function loadGameState() {
  const saved = localStorage.getItem('dnd_game_state');
  return saved ? JSON.parse(saved) : null;
}

export function clearGameState() {
  localStorage.removeItem('dnd_game_state');
}

// Обработчик изменения API ключа
const apiKeyInput = document.getElementById('api-key');
if (apiKeyInput) {
    // Заполняем сохраненный или захардкоженный ключ
    apiKeyInput.value = apiKey;
    apiKeyInput.addEventListener('input', (e) => {
        apiKey = e.target.value;
        saveApiKey(apiKey); // Сохраняем при изменении
    });
}

// Обработчик изменения модели
const modelInput = document.getElementById('model-input');
if (modelInput) {
    // Устанавливаем сохраненную или модель по умолчанию
    modelInput.value = selectedModel;
    modelInput.addEventListener('input', (e) => {
        selectedModel = e.target.value;
        saveModel(selectedModel); // Сохраняем при изменении
        console.log('Выбрана модель:', selectedModel);
    });
}
