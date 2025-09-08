import { runtime, world } from './state.js';
import { canvas } from './ui.js';
import { startAttack, tryInteract } from '../systems/combat.js';

export function initInput() {
  window.addEventListener('keydown', (e) => {
    const gameplayKeys = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "];
    if (gameplayKeys.includes(e.key)) e.preventDefault();
    if (runtime.gameState === 'chat') {
      if (e.key === 'Escape') e.preventDefault();
      return; // chat handles its own input
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

