import { runtime, world } from './state.js';
import { canvas, exitChat, moveChoiceFocus, activateFocusedChoice, showBanner, cycleMinimapMode, beginMinimapPeek, endMinimapPeek } from './ui.js';
import { startAttack, tryInteract, willAttackHitEnemy, startRangedAttack } from '../systems/combat.js';
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
    // Double-tap WASD to dash in that direction
    try {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
        const now = (typeof performance !== 'undefined' && performance.now) ? (performance.now() / 1000) : (Date.now() / 1000);
        const last = (runtime._dashLastTap && typeof runtime._dashLastTap[k] === 'number') ? runtime._dashLastTap[k] : -999;
        const windowSec = (typeof runtime._dashDoubleTapWindow === 'number') ? runtime._dashDoubleTapWindow : 0.25;
        const canDash = !runtime.paused && !runtime.gameOver && ((runtime._dashCooldown || 0) <= 0) && ((runtime._suppressInputTimer || 0) <= 0) && ((runtime._dashTimer || 0) <= 0);
        if (canDash && (now - last) <= windowSec) {
          // Start dash in axis-aligned direction of the tapped key
          let vx = 0, vy = 0;
          if (k === 'w') vy = -1; else if (k === 's') vy = 1; else if (k === 'a') vx = -1; else if (k === 'd') vx = 1;
          const spd = (typeof runtime._dashSpeedDefault === 'number') ? runtime._dashSpeedDefault : 340;
          runtime._dashVx = vx * spd;
          runtime._dashVy = vy * spd;
          runtime._dashTimer = (typeof runtime._dashDurationDefault === 'number') ? runtime._dashDurationDefault : 0.14;
          runtime._dashCooldown = Math.max(runtime._dashCooldown || 0, 0.25);
          // Face the dash direction immediately
          try { import('./state.js').then(m => { const p = m.player; if (p) { if (Math.abs(vx) > Math.abs(vy)) p.dir = vx < 0 ? 'left' : 'right'; else if (vy !== 0) p.dir = vy < 0 ? 'up' : 'down'; } }); } catch {}
          // Optional: subtle screen shake could reinforce the feel (kept minimal)
          try { runtime.shakeTimer = Math.max(runtime.shakeTimer || 0, 0.05); } catch {}
        }
        // Update last tap time for this key
        if (!runtime._dashLastTap) runtime._dashLastTap = {};
        runtime._dashLastTap[k] = now;
      }
    } catch {}
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
    } else if (e.key.toLowerCase() === 'k') {
      // Mark K held time and fire once immediately
      runtime._kDownAtSec = runtime._timeSec || 0;
      runtime._kReleasePending = false;
      startRangedAttack();
    } else if (e.key.toLowerCase() === 'c') {
      // Open companion selection overlay
      startCompanionSelector();
    } else if (e.key.toLowerCase() === 'p') {
      // Open save/load menu
      startSaveMenu();
    } else if (e.key.toLowerCase() === 'i') {
      // Open Player inventory directly
      startInventoryMenu();
    } else if (e.key.toLowerCase() === 'l') {
      // Toggle torch bearer: assign to nearest companion or clear
      try {
        import('./state.js').then(async (m) => {
          const { companions, player, runtime, setTorchBearer, clearTorchBearer } = await m;
          if (runtime._torchBearerRef) {
            clearTorchBearer();
            showBanner('Torch bearer dismissed');
            import('./ui.js').then(u => u.updatePartyUI && u.updatePartyUI(companions)).catch(()=>{});
          } else if (companions && companions.length) {
            const c = m.nearestCompanionTo(player.x + player.w/2, player.y + player.h/2);
            if (!c) { showBanner('No companion nearby'); return; }
            const ok = setTorchBearer(c);
            if (ok) {
              showBanner(`${c.name || 'Companion'} is carrying the torch`);
              import('./ui.js').then(u => u.updatePartyUI && u.updatePartyUI(companions)).catch(()=>{});
            } else {
              showBanner('No torches available');
            }
          } else {
            showBanner('No companion to carry a torch');
          }
        });
      } catch {}
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
    if (e.key.toLowerCase() === 'k') {
      // Clear hold-toggle state on release
      runtime._kDownAtSec = null;
      runtime._kToggledThisHold = false;
    }
  });
  canvas.addEventListener('mousedown', () => { /* handled in ui for chat exit */ });
}
