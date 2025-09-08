import { runtime, world } from './state.js';
import { canvas, exitChat } from './ui.js';
import { startAttack, tryInteract } from '../systems/combat.js';
import { selectChoice } from '../engine/dialog.js';

export function initInput() {
  window.addEventListener('keydown', (e) => {
    const gameplayKeys = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "];
    if (gameplayKeys.includes(e.key)) e.preventDefault();
    if (runtime.gameState === 'chat') {
      if (e.key === 'Escape') { exitChat(runtime); e.preventDefault(); return; }
      if (e.key >= '1' && e.key <= '9') { selectChoice(parseInt(e.key, 10) - 1); e.preventDefault(); return; }
      return; // ignore other keys while in chat
    }
    runtime.keys.add(e.key.toLowerCase());
    if (e.key.toLowerCase() === 'g') world.showGrid = !world.showGrid;
    if (e.key === ' ') {
      if (!tryInteract()) startAttack();
    } else if (e.key.toLowerCase() === 'j') {
      startAttack();
    }
  });
  window.addEventListener('keyup', (e) => runtime.keys.delete(e.key.toLowerCase()));
  canvas.addEventListener('mousedown', () => { /* handled in ui for chat exit */ });
}
