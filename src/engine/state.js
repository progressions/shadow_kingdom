import { TILE } from './constants.js';

// World and camera
export const world = {
  tileW: 100,
  tileH: 60,
  showGrid: false,
  get w() { return this.tileW * TILE; },
  get h() { return this.tileH * TILE; },
};
export const camera = { x: 0, y: 0, w: 320, h: 180 };

// Player and actors
export const player = {
  x: world.w / 2,
  y: world.h / 2,
  w: 12,
  h: 16,
  speed: 100,
  dir: 'down',
  moving: false,
  animTime: 0,
  animFrame: 0,
  hp: 6,
  maxHp: 6,
  attackCooldown: 0.35,
  lastAttack: -999,
  attacking: false,
  attackTimer: 0,
  attackDuration: 0.18,
  damage: 1,
  inventory: { items: [], equipped: { head: null, torso: null, legs: null, leftHand: null, rightHand: null } },
};

export const enemies = [];
export const companions = [];
export const npcs = [];
export const obstacles = [];

export function spawnEnemy(x, y) {
  enemies.push({
    x, y,
    w: 12, h: 16,
    speed: 60,
    dir: 'down',
    moving: true,
    animTime: 0,
    animFrame: 0,
    hp: 3,
    maxHp: 3,
    touchDamage: 1,
    hitTimer: 0,
    hitCooldown: 0.8,
    knockbackX: 0,
    knockbackY: 0,
    avoidSign: Math.random() < 0.5 ? 1 : -1,
    stuckTime: 0,
  });
}

export function spawnCompanion(x, y, sheet, opts = {}) {
  const comp = {
    x, y,
    w: 12, h: 16,
    speed: 110,
    dir: 'down',
    moving: false,
    animTime: 0,
    animFrame: 0,
    sheet,
    name: opts.name || 'Companion',
    portraitSrc: opts.portrait || opts.portraitSrc || null,
    inventory: { items: [], equipped: { head: null, torso: null, legs: null, leftHand: null, rightHand: null } },
  };
  companions.push(comp);
  return comp;
}

export function removeCompanion(comp) {
  const idx = companions.indexOf(comp);
  if (idx !== -1) companions.splice(idx, 1);
}

export function spawnNpc(x, y, dir = 'down', opts = {}) {
  const npc = { 
    x, y, w: 12, h: 16, dir, animFrame: 0, idleTime: 0,
    name: opts.name || 'NPC',
    portraitSrc: opts.portrait || null,
    portrait: null,
    dialog: null,
    sheet: opts.sheet || null,
  };
  if (npc.portraitSrc) {
    const img = new Image();
    img.src = npc.portraitSrc;
    npc.portrait = img;
  }
  npcs.push(npc);
  return npc;
}

// Runtime (input + mode)
export const runtime = {
  keys: new Set(),
  gameState: 'play', // 'play' | 'chat'
  activeNpc: null,
  activeDialog: null, // { tree, nodeId }
  vnFocusIndex: 0,
  vnChoiceCount: 0,
  interactLock: 0, // seconds remaining where interaction is disabled
  autosaveEnabled: false,
  autosaveTimer: 0,
  autosaveIntervalSec: 60,
};
