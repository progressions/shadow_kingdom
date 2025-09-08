// Battle UI bridge (Scaffold)
// Uses existing VN overlay to show simple menus and logs.

import { setOverlayDialog } from '../engine/ui.js';
import { selectAction, next } from './manager.js';

export function showBattleMenus() {
  setOverlayDialog('Choose action', [
    { label: 'Attack', action: 'battle_attack' },
    { label: 'Defend', action: 'battle_defend' },
    { label: 'Flee', action: 'battle_flee' },
  ]);
}

// Minimal hook: the VN selectChoice pipeline will call manager.selectAction or manager.next accordingly.
export function handleBattleChoice(action) {
  if (action === 'battle_next') return next();
  return selectAction(action);
}

