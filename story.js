// story.js — управление историей и выводом текста
// typeWriter — приватная функция, не экспортируется

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

// Показать текст истории с анимацией
export function showStoryText(text, callback) {
  const storyTextEl = document.getElementById('story-text');
  if (!storyTextEl) return;
  typeWriter(text, storyTextEl, callback);
}

// Просто установить текст истории (без анимации)
export function setStoryText(text) {
  const storyTextEl = document.getElementById('story-text');
  if (storyTextEl) storyTextEl.textContent = text;
}