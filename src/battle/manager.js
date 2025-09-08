// Battle Manager (Scaffold)
// Minimal state machine for entering/leaving battle and driving a placeholder scene.

import { runtime, companions } from '../engine/state.js';
import { setOverlayDialog, exitChat, showBanner } from '../engine/ui.js';
import { deriveStatsFromEquipment } from './derivation.js';

let inBattle = false;
let state = null;

export function isInBattle() { return inBattle; }
export function getBattleState() { return state ? structuredClone(state) : null; }

export function enterBattle(battleConfig = {}, partyActors = null) {
  if (inBattle) return;
  inBattle = true;
  runtime.gameState = 'chat'; // reuse overlay input routing

  const party = buildPartySnapshot(partyActors);
  const enemies = buildEnemySnapshot(battleConfig);

  state = {
    scene: { backdrop: battleConfig.backdrop || 'forest_night', music: battleConfig.music || 'battle_default' },
    party, enemies,
    turn: { order: [], currentIndex: 0, awaitingInput: true, actorId: null, targetSelection: null },
    outcome: null,
    log: [battleConfig.intro || 'A battle begins!']
  };

  // Placeholder UI: show simple menu that allows exiting with a win/lose for now
  setOverlayDialog('Battle begins!', [
    { label: 'Attack (placeholder)', action: 'battle_attack' },
    { label: 'Defend (placeholder)', action: 'battle_defend' },
    { label: 'Flee', action: 'battle_flee' },
  ]);
}

export function exitBattle(outcome = 'win') {
  if (!inBattle) return;
  inBattle = false;
  runtime.gameState = 'play';
  state = null;
  exitChat(runtime);
  if (outcome === 'win') showBanner('Victory!');
  else if (outcome === 'lose') showBanner('Defeat...');
  else showBanner('Escaped');
}

export function updateBattle(_dt) {
  // Reserved for timers/animations later
}

// Placeholder action handlers (wired via input router or VN overlay selectChoice bridge later)
export function selectAction(actionId) {
  if (!inBattle || !state) return;
  switch (actionId) {
    case 'battle_attack':
      state.log.push('You attack (placeholder).');
      setOverlayDialog('You attack (placeholder).', [ { label: 'Continue', action: 'battle_next' } ]);
      break;
    case 'battle_defend':
      state.log.push('You defend (placeholder).');
      setOverlayDialog('You defend (placeholder).', [ { label: 'Continue', action: 'battle_next' } ]);
      break;
    case 'battle_flee':
      exitBattle('flee');
      break;
  }
}

export function next() {
  // For MVP, end battle on continue
  exitBattle('win');
}

function buildPartySnapshot(partyActors) {
  // partyActors: { player, companions: [] } optional; otherwise use player + current companions (capped)
  return (partyActors?.list || []).map(a => snapshotActor(a));
}

function buildEnemySnapshot(battleConfig) {
  const list = battleConfig?.enemies || [ { template: 'elite', level: 1 } ];
  // Minimal placeholders
  return list.map((e, i) => ({ id: `e${i}`, name: e.template || 'Enemy', hp: 10, maxHp: 10, stats: { ATK: 2, DEF: 1 } }));
}

function snapshotActor(actor) {
  const stats = deriveStatsFromEquipment(actor);
  return {
    id: actor.name?.toLowerCase?.() || 'player',
    name: actor.name || 'Player',
    hp: stats.HP, maxHp: stats.HP, stats,
    abilities: []
  };
}

