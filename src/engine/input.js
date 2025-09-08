import { runtime, world } from './state.js';
import { canvas, exitChat, moveChoiceFocus, activateFocusedChoice } from './ui.js';
import { startAttack, tryInteract } from '../systems/combat.js';
import { selectChoice, startCompanionSelector, startSaveMenu } from '../engine/dialog.js';
import { initAudioUnlock, toggleMute, toggleMusic } from './audio.js';
import { saveGame, loadGame } from './save.js';

export function initInput() {
  window.addEventListener('keydown', (e) => {
    // Unlock audio context/playback on first user gesture
    initAudioUnlock();
    const gameplayKeys = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "];
    if (gameplayKeys.includes(e.key)) e.preventDefault();
    if (runtime.gameState === 'chat') {
      if (e.key === 'Escape') { exitChat(runtime); e.preventDefault(); return; }
      if (e.key >= '1' && e.key <= '9') { selectChoice(parseInt(e.key, 10) - 1); e.preventDefault(); return; }
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') { moveChoiceFocus(-1); e.preventDefault(); return; }
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') { moveChoiceFocus(1); e.preventDefault(); return; }
      if (e.key === 'Enter') { activateFocusedChoice(); e.preventDefault(); return; }
      return; // ignore other keys while in chat
    }
    runtime.keys.add(e.key.toLowerCase());
    if (e.key.toLowerCase() === 'g') world.showGrid = !world.showGrid;
    if (e.key === ' ') {
      if (!tryInteract()) startAttack();
    } else if (e.key.toLowerCase() === 'j') {
      startAttack();
    } else if (e.key.toLowerCase() === 'c') {
      // Open companion selection overlay
      startCompanionSelector();
    } else if (e.key.toLowerCase() === 'p') {
      // Open save/load menu
      startSaveMenu();
    } else if (e.key.toLowerCase() === 'm') {
      toggleMute();
    } else if (e.key.toLowerCase() === 'b') {
      toggleMusic();
    } else if (e.key === 'F6' || (e.ctrlKey && e.key.toLowerCase() === 's')) {
      e.preventDefault(); saveGame();
    } else if (e.key === 'F7') {
      e.preventDefault(); loadGame();
    }
  });
  window.addEventListener('keyup', (e) => runtime.keys.delete(e.key.toLowerCase()));
  canvas.addEventListener('mousedown', () => { /* handled in ui for chat exit */ });
}
