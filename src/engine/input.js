import { runtime, world } from './state.js';
import { canvas, exitChat, moveChoiceFocus, activateFocusedChoice, showBanner, cycleMinimapMode, beginMinimapPeek, endMinimapPeek } from './ui.js';
import { startAttack, tryInteract, willAttackHitEnemy, startRangedAttack } from '../systems/combat.js';
import { selectChoice, startCompanionSelector, startSaveMenu, startInventoryMenu, startPrompt } from '../engine/dialog.js';
import { initAudioUnlock, toggleMute, toggleMusic, stopMusic, playSfx } from './audio.js';
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
    // Double-tap WASD/Arrow keys to dash in that direction
    try {
      const k = e.key.toLowerCase();
      const allowed = (k === 'w' || k === 'a' || k === 's' || k === 'd' || k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright');
      // Count a tap only on the transition from up->down (ignore auto-repeat and held state)
      const wasHeld = runtime.keys.has(k);
      if (allowed && !e.repeat && !wasHeld) {
        const now = (typeof performance !== 'undefined' && performance.now) ? (performance.now() / 1000) : (Date.now() / 1000);
        const last = (runtime._dashLastTap && typeof runtime._dashLastTap[k] === 'number') ? runtime._dashLastTap[k] : -999;
        const windowSec = (typeof runtime._dashDoubleTapWindow === 'number') ? runtime._dashDoubleTapWindow : 0.25;
        const canDash = !runtime.paused && !runtime.gameOver && ((runtime._dashCooldown || 0) <= 0) && ((runtime._suppressInputTimer || 0) <= 0) && ((runtime._dashTimer || 0) <= 0);
        if (canDash && (now - last) <= windowSec) {
          // Start dash in axis-aligned direction of the tapped key
          let vx = 0, vy = 0;
          if (k === 'w' || k === 'arrowup') vy = -1;
          else if (k === 's' || k === 'arrowdown') vy = 1;
          else if (k === 'a' || k === 'arrowleft') vx = -1;
          else if (k === 'd' || k === 'arrowright') vx = 1;
          const spd = (typeof runtime._dashSpeedDefault === 'number') ? runtime._dashSpeedDefault : 340;
          runtime._dashVx = vx * spd;
          runtime._dashVy = vy * spd;
          runtime._dashTimer = (typeof runtime._dashDurationDefault === 'number') ? runtime._dashDurationDefault : 0.14;
          // Prime dash-combo window (dash -> attack)
          try {
            const nowT = runtime._timeSec || 0;
            const win = (typeof runtime._dashComboWindowSec === 'number') ? runtime._dashComboWindowSec : 0.25;
            runtime._dashComboReadyUntil = nowT + win;
            runtime._dashJustStartedAtSec = nowT;
          } catch {}
          const cdBase = (typeof runtime._dashCooldownDefault === 'number') ? runtime._dashCooldownDefault : 0.35;
          const cdr = (runtime?.combatBuffs?.dashCdr || 0);
          const effCd = Math.max(0.06, cdBase / Math.max(1e-6, (1 + cdr)));
          runtime._dashCooldown = Math.max(runtime._dashCooldown || 0, effCd);
          // Face the dash direction immediately
          try { import('./state.js').then(m => { const p = m.player; if (p) { if (Math.abs(vx) > Math.abs(vy)) p.dir = vx < 0 ? 'left' : 'right'; else if (vy !== 0) p.dir = vy < 0 ? 'up' : 'down'; } }); } catch {}
          // Subtle SFX for feedback
          try { playSfx('slipstream'); } catch {}
          // Optional: subtle screen shake could reinforce the feel (kept minimal)
          try { runtime.shakeTimer = Math.max(runtime.shakeTimer || 0, 0.05); } catch {}
        }
        // Update last tap time for this key on genuine taps only
        if (!runtime._dashLastTap) runtime._dashLastTap = {};
        runtime._dashLastTap[k] = now;
      }
    } catch {}
    // Finally mark the key as held
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
              // Show remaining burn time
              const ms = Math.max(0, Math.floor(runtime._torchBurnMs || 0));
              const mm = Math.floor(ms / 60000);
              const ss = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
              showBanner(`Torch handed to ${c.name || 'Companion'} (${mm}:${ss} left)`);
              import('./ui.js').then(u => u.updatePartyUI && u.updatePartyUI(companions)).catch(()=>{});
            } else {
              showBanner('No torches available');
            }
          } else {
            showBanner('No companion to carry a torch');
          }
        });
      } catch {}
    } else if (e.key.toLowerCase() === 't') {
      // Quick-equip a torch to left hand from inventory (consumes one).
      try {
        import('./state.js').then(async (m) => {
          const { player, companions, runtime } = await m;
          const eq = player?.inventory?.equipped || {};
          // Block if right hand is two-handed
          if (eq.rightHand && eq.rightHand.twoHanded) { showBanner('Cannot equip with two-handed weapon'); return; }
          // Already lit
          if (eq.leftHand && eq.leftHand.id === 'torch') { showBanner('Torch already lit'); return; }
          const inv = player?.inventory?.items || [];
          const idx = inv.findIndex(s => s && s.stackable && s.id === 'torch' && (s.qty||0) > 0);
          if (idx === -1) { showBanner('No torches'); return; }
          // If something is in left hand, move it back (torch consumes on unequip handled elsewhere)
          if (eq.leftHand) {
            const cur = eq.leftHand;
            if (cur.id === 'torch') eq.leftHand = null; // consume existing torch
            else { inv.push(cur); eq.leftHand = null; }
          }
          // Consume one torch from stack and equip a lit torch instance
          inv[idx].qty = Math.max(0, (inv[idx].qty || 0) - 1);
          if (inv[idx].qty <= 0) inv.splice(idx, 1);
          eq.leftHand = { id: 'torch', name: 'Torch', slot: 'leftHand', atk: 0, burnMsRemaining: 180000 };
          // Immediate lighting/UI refresh
          try {
            import('./lighting.js').then(L => L.rebuildLighting && L.rebuildLighting(0)).catch(()=>{});
            import('./ui.js').then(u => { u.updateOverlayDim && u.updateOverlayDim(); u.updatePartyUI && u.updatePartyUI(companions); }).catch(()=>{});
          } catch {}
          // Tutorial flag: clear torch-equip hint and advance to "find a weapon"
          try {
            if (!runtime.questFlags) runtime.questFlags = {};
            if (runtime.questFlags['tutorial_inv_equip_torch']) {
              runtime.questFlags['tutorial_inv_equip_torch'] = false;
              import('./ui.js').then(u => u.hideBanner && u.hideBanner()).catch(()=>{});
            }
            if (!runtime.questFlags['tutorial_find_sword_done'] && !runtime.questFlags['tutorial_find_sword']) {
              runtime.questFlags['tutorial_find_sword'] = true;
              import('./ui.js').then(u => u.showPersistentBanner && u.showPersistentBanner('You need a weapon! Find a nearby chest')).catch(()=>{});
            }
          } catch {}
          showBanner('Torch lit');
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
