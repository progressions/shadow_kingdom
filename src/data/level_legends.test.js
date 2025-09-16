import { mapConfigForLevel, LEVEL_LEGENDS, COMMON_COLORS } from './level_legends.js';

describe('level_legends data', () => {
  test('exports configs for levels 1-5', () => {
    for (let lvl = 1; lvl <= 5; lvl++) {
      const cfg = mapConfigForLevel(lvl);
      expect(cfg).toBeTruthy();
      expect(typeof cfg.url).toBe('string');
      expect(cfg.legend).toBeTruthy();
      expect(cfg.legend.colors && typeof cfg.legend.colors).toBe('object');
    }
  });

  test('returns null for unknown level', () => {
    expect(mapConfigForLevel(0)).toBeNull();
    expect(mapConfigForLevel(6)).toBeNull();
  });

  test('common player_spawn color is used in levels 2-5', () => {
    for (const lvl of [2, 3, 4, 5]) {
      const cfg = mapConfigForLevel(lvl);
      const colors = cfg.legend.colors;
      expect(colors[COMMON_COLORS.PLAYER_SPAWN]).toBeTruthy();
      expect(colors[COMMON_COLORS.PLAYER_SPAWN].type).toBe('player_spawn');
    }
  });

  test('level 1 uses shared player_spawn mapping', () => {
    const cfg = mapConfigForLevel(1);
    const colors = cfg.legend.colors;
    const key = COMMON_COLORS.PLAYER_SPAWN;
    expect(colors[key]).toBeTruthy();
    expect(colors[key].type).toBe('player_spawn');
  });

  test('LEVEL_LEGENDS mapping matches mapConfigForLevel', () => {
    for (let lvl = 1; lvl <= 5; lvl++) {
      expect(LEVEL_LEGENDS[lvl]).toBe(mapConfigForLevel(lvl));
    }
  });

  test('selected common colors map to expected types (spot check)', () => {
    const lvls = [2, 3, 4, 5].map(mapConfigForLevel);
    for (const cfg of lvls) {
      const c = cfg.legend.colors;
      expect(c[COMMON_COLORS.WALL_STONE].type).toBe('wall');
      expect(c[COMMON_COLORS.SPAWN_BOSS].type).toBe('spawn_boss');
      expect(c[COMMON_COLORS.SPAWN_GUARDIAN].type).toBe('spawn_guardian');
    }
  });
});
