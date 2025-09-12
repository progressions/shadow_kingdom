import { runtime, world } from './state.js';
import { canvas, exitChat, moveChoiceFocus, activateFocusedChoice, showBanner, cycleMinimapMode, beginMinimapPeek, endMinimapPeek } from './ui.js';
import { startAttack, tryInteract, willAttackHitEnemy } from '../systems/combat.js';
import { selectChoice, startCompanionSelector, startSaveMenu, startInventoryMenu, startPrompt } from '../engine/dialog.js';
import { initAudioUnlock, toggleMute, toggleMusic, stopMusic } from './audio.js';
import { saveGame, loadGame } from './save.js';

export function initInput() {
  window.addEventListener('keydown', (e) => {
    // Unlock audio context/playback on first user gesture
    initAudioUnlock();
    const gameplayKeys = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "];
    if (gameplayKeys.includes(e.key)) e.preventDefault();
    // If awaiting game-over key, any key shows the Game Over menu
    if (runtime._awaitGameOverKey) {
      e.preventDefault();
      runtime._awaitGameOverKey = false;
      // Show the Game Over menu
      import('./dialog.js').then(d => d.startGameOver && d.startGameOver());
      return;
    }
    // Suppress input briefly (e.g., right after death) to avoid skipping scenes
    if ((runtime._suppressInputTimer || 0) > 0) {
      e.preventDefault();
      return;
    }
    // No special freeze handling — VN intros removed
    if (runtime.gameState === 'chat') {
      if (e.key === 'Escape') {
        if (!runtime.lockOverlay) { exitChat(runtime); }
        e.preventDefault();
        return;
      }
      if (e.key.toLowerCase() === 'x') { if (!runtime.lockOverlay) { exitChat(runtime); } e.preventDefault(); return; }
      if (e.key >= '1' && e.key <= '9') { selectChoice(parseInt(e.key, 10) - 1); e.preventDefault(); return; }
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') { moveChoiceFocus(-1); e.preventDefault(); return; }
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') { moveChoiceFocus(1); e.preventDefault(); return; }
      if (e.key === 'Enter') { activateFocusedChoice(); e.preventDefault(); return; }
      return; // ignore other keys while in chat
    }
    runtime.keys.add(e.key.toLowerCase());
    if (e.key === 'Escape') {
      // Pause game and music
      runtime.paused = true;
      stopMusic();
      startPrompt(null, 'Paused', [
        { label: 'Resume', action: 'end' },
        { label: 'Save/Load', action: 'open_save_menu' },
        { label: 'Inventory', action: 'open_inventory' },
        { label: 'Debug', action: 'open_debug' },
        { label: 'Main Menu', action: 'return_to_main' },
      ]);
      e.preventDefault();
      return;
    }
    if (e.key.toLowerCase() === 'g') world.showGrid = !world.showGrid;
    if (e.key === ' ') {
      // Prioritize attacking if an enemy is in front/in range
      if (willAttackHitEnemy()) {
        startAttack();
      } else if (!tryInteract()) {
        startAttack();
      }
    } else if (e.key.toLowerCase() === 'j') {
      startAttack();
    } else if (e.key.toLowerCase() === 'c') {
      // Open companion selection overlay
      startCompanionSelector();
    } else if (e.key.toLowerCase() === 'p') {
      // Open save/load menu
      startSaveMenu();
    } else if (e.key.toLowerCase() === 'i') {
      // Open Player inventory directly
      startInventoryMenu();
    } else if (e.key.toLowerCase() === 'm') {
      toggleMute();
    } else if (e.key.toLowerCase() === 'b') {
      toggleMusic();
    } else if (e.key.toLowerCase() === 'n') {
      // Minimap: tap to cycle Off->Compact->Large. If currently Off, holding shows a peek.
      beginMinimapPeek();
    } else if (e.key === 'F6' || (e.ctrlKey && e.key.toLowerCase() === 's')) {
      e.preventDefault(); saveGame();
    } else if (e.key === 'F7') {
      e.preventDefault(); loadGame();
    } else if (e.shiftKey && e.key.toLowerCase() === 'd') {
      // Shift+D — schedule next level (cur+1). Main loop loads if implemented.
      const cur = runtime.currentLevel || 1;
      const next = cur + 1;
      runtime.pendingLevel = next;
      try { showBanner(`Next Level: Pending Level ${next}`); } catch {}
    }
  });
  window.addEventListener('keyup', (e) => {
    runtime.keys.delete(e.key.toLowerCase());
    if (e.key.toLowerCase() === 'n') {
      // End peek; if no peek happened (or even if it did), cycle the persistent mode
      const wasPeek = true; // endMinimapPeek is idempotent
      endMinimapPeek();
      // Cycle mode on key release for a clean single transition
      cycleMinimapMode();
    }
  });
  canvas.addEventListener('mousedown', () => { /* handled in ui for chat exit */ });
}
