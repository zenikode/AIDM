export function typeWriter(text, el, callback) {
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