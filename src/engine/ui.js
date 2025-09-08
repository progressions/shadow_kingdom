export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const sidebarLog = document.getElementById('sidebar-log');
const sidebarInput = document.getElementById('sidebar-input');

export function clearLog() { if (sidebarLog) sidebarLog.textContent = ''; }
export function appendLogLine(text) {
  if (!sidebarLog) return;
  const line = document.createElement('div');
  line.textContent = text;
  sidebarLog.appendChild(line);
  sidebarLog.scrollTop = sidebarLog.scrollHeight;
}
export function showMessage(text) { clearLog(); appendLogLine(text); }

export function enterChat(runtime) {
  runtime.gameState = 'chat';
  runtime.keys.clear();
  if (sidebarInput) {
    sidebarInput.value = '';
    setTimeout(() => sidebarInput.focus(), 0);
  }
}
export function exitChat(runtime) {
  runtime.gameState = 'play';
  runtime.activeNpc = null;
  if (sidebarInput) sidebarInput.blur();
}

export function setupChatInputHandlers(runtime) {
  if (!sidebarInput) return;
  sidebarInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const msg = sidebarInput.value.trim();
      if (msg) {
        appendLogLine('You: ' + msg);
        appendLogLine('NPC: Hello');
        sidebarInput.value = '';
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      exitChat(runtime);
      e.preventDefault();
    }
  });
  canvas.addEventListener('mousedown', () => { if (runtime.gameState === 'chat') exitChat(runtime); });
}

