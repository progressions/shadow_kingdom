import { jest } from '@jest/globals';

// Mock sprites to avoid canvas dependencies during module import
await jest.unstable_mockModule('./sprites.js', () => ({
  makeSpriteSheet: () => ({}),
  sheetForName: () => ({}),
  makeSnakeSpriteSheet: () => ({}),
  enemyMookPalette: {},
  enemyFeaturedPalette: {},
  enemyBossPalette: {},
  enemyMookSheet: {},
  enemyFeaturedSheet: {},
  enemyBossSheet: {},
}));
// Mock UI functions used by save_core to avoid touching the DOM
await jest.unstable_mockModule('./ui.js', () => ({
  // Broad UI shim to satisfy dialog/engine imports during module evaluation
  canvas: {},
  ctx: {},
  enterChat: () => {},
  setOverlayDialog: () => {},
  exitChat: () => {},
  updatePartyUI: () => {},
  showBanner: () => {},
  showMusicTheme: () => {},
  hideBanner: () => {},
  showPersistentBanner: () => {},
  fadeTransition: () => {},
  initMinimap: () => {},
  updateMinimap: () => {},
}));

const { normalizeSave, decideLoadRoute } = await import('./save_core.js');

describe('save_core.normalizeSave', () => {
  test('clamps dynamic enemies and spawners; normalizes arrays and loadouts', () => {
    const s = {
      schema: 'save',
      version: 3,
      at: 123,
      world: { w: 200, h: 100 },
      dynamicEnemies: [
        { x: -10, y: 9999, dir: '', hp: -5, spriteScale: undefined },
        { x: 199.9, y: 0.1, hp: 2 },
      ],
      uniqueActors: {
        'enemy:boss': { state: 'alive', x: -100, y: 5000, dir: '', hp: -1 },
      },
      spawners: [
        { id: '', x: -5, y: 1000, w: 0, h: 0, nextAtDelay: -3, batchSize: 0, intervalSec: 0, totalToSpawn: -10, concurrentCap: 0, currentlyAliveIds: ['a','a','b'], proximityMode: 'weird', radiusPx: 0, active: false, disabled: 'no' },
      ],
      openedChests: ['c1','c2','c1'],
      brokenBreakables: ['b1','b1'],
      vnSeen: ['v1','v2','v1'],
      affinityFlags: ['a','a'],
      questFlags: ['q1', 'q1', ''],
      loadouts: { melee: {}, ranged: {} },
      torch: { bearerIndex: -5, burnMs: -10 },
    };
    const out = normalizeSave(s);
    // Dynamic enemies clamped and defaults applied
    expect(out.dynamicEnemies[0].x).toBe(0);
    expect(out.dynamicEnemies[0].y).toBe(99); // 0..H-1
    expect(out.dynamicEnemies[0].dir).toBe('down');
    expect(out.dynamicEnemies[0].hp).toBe(0);
    expect(out.dynamicEnemies[0].spriteScale).toBe(1);
    expect(out.dynamicEnemies[1].x).toBe(199);
    expect(out.dynamicEnemies[1].y).toBe(0);

    // Unique actors clamped
    expect(out.uniqueActors['enemy:boss'].x).toBe(0);
    expect(out.uniqueActors['enemy:boss'].y).toBe(99);
    expect(out.uniqueActors['enemy:boss'].dir).toBe('down');
    expect(out.uniqueActors['enemy:boss'].hp).toBe(0);
    expect(out.uniqueActors['enemy:boss'].spriteScale).toBe(1);

    // Spawners normalized
    const sp = out.spawners[0];
    expect(sp.id).toBeDefined();
    expect(sp.x).toBe(0);
    expect(sp.y).toBe(99);
    expect(sp.w).toBeGreaterThanOrEqual(1);
    expect(sp.h).toBeGreaterThanOrEqual(1);
    expect(sp.nextAtDelay).toBeGreaterThanOrEqual(0);
    expect(sp.batchSize).toBeGreaterThanOrEqual(1);
    expect(sp.intervalSec).toBeGreaterThanOrEqual(0.1);
    expect(sp.totalToSpawn === null || sp.totalToSpawn >= 0).toBeTruthy();
    expect(sp.concurrentCap === null || sp.concurrentCap >= 1).toBeTruthy();
    expect(sp.currentlyAliveIds).toEqual(['a','b']);
    expect(['ignore','near','far']).toContain(sp.proximityMode);
    expect(sp.radiusPx).toBeGreaterThanOrEqual(1);
    expect(sp.active).toBe(false); // preserves explicit false; defaults to true when absent
    expect(sp.disabled).toBe(true);

    // Arrays deduped and sorted
    expect(out.openedChests).toEqual(['c1','c2']);
    expect(out.brokenBreakables).toEqual(['b1']);
    expect(out.vnSeen).toEqual(['v1','v2']);
    expect(out.affinityFlags).toEqual(['a']);
    expect(out.questFlags).toEqual(['', 'q1']);

    // Loadouts normalized
    expect(out.loadouts.melee).toEqual({ rightHandId: null, leftHandId: null });
    expect(out.loadouts.ranged).toEqual({ rightHandId: null });

    // Torch clamped
    expect(out.torch.bearerIndex).toBeGreaterThanOrEqual(-1);
    expect(out.torch.burnMs).toBe(0);
  });
});

describe('save_core.decideLoadRoute', () => {
  test('returns switch when target differs from current', () => {
    const runtime = { currentLevel: 2 };
    const data = { currentLevel: 3 };
    const d = decideLoadRoute(data, runtime);
    expect(d).toEqual({ action: 'switch', target: 3 });
  });
  test('returns same when target equals current', () => {
    const runtime = { currentLevel: 3 };
    const data = { currentLevel: 3 };
    const d = decideLoadRoute(data, runtime);
    expect(d).toEqual({ action: 'same', target: 3 });
  });
  test('defaults to level 1 when data missing', () => {
    const runtime = { currentLevel: 1 };
    const d = decideLoadRoute({}, runtime);
    expect(d).toEqual({ action: 'same', target: 1 });
  });
});
