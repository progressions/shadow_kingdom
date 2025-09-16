import { jest } from '@jest/globals';
import { applyLevelPng } from './level_png_helper.js';

describe('applyLevelPng helper', () => {
  test('applies PNG, initializes minimap, snaps camera, applies restore', async () => {
    const cfg = { url: 'assets/maps/level_2.png', legend: { theme: 'desert' } };
    const calls = [];
    const applyPngMap = jest.fn(async (url, legend) => {
      calls.push(['apply', url, !!legend]);
      return { /* terrain canvas stub */ id: 'terrain_2' };
    });
    const initMinimap = jest.fn(() => { calls.push(['minimap']); });
    const camera = { x: 0, y: 0, w: 320, h: 240 };
    const world = { w: 1400, h: 900 };
    const player = { x: 600, y: 400, w: 12, h: 16 };
    const applyPendingRestore = jest.fn(() => { calls.push(['restore']); });

    const t = await applyLevelPng(cfg, { applyPngMap, initMinimap, camera, world, player, applyPendingRestore });
    expect(t && t.id).toBe('terrain_2');
    expect(applyPngMap).toHaveBeenCalledWith(cfg.url, cfg.legend);
    expect(initMinimap).toHaveBeenCalled();
    expect(applyPendingRestore).toHaveBeenCalled();
    // Camera centers on player and clamps to world
    const expX = Math.max(0, Math.min(world.w - camera.w, Math.round(player.x + player.w/2 - camera.w/2)));
    const expY = Math.max(0, Math.min(world.h - camera.h, Math.round(player.y + player.h/2 - camera.h/2)));
    expect(camera.x).toBe(expX);
    expect(camera.y).toBe(expY);
  });

  test('handles null terrain and small worlds (clamp to 0)', async () => {
    const cfg = { url: 'x', legend: {} };
    const applyPngMap = jest.fn(async () => null);
    const initMinimap = jest.fn();
    const camera = { x: 5, y: 5, w: 800, h: 600 };
    const world = { w: 400, h: 300 };
    const player = { x: 0, y: 0, w: 12, h: 16 };
    const applyPendingRestore = jest.fn();
    const t = await applyLevelPng(cfg, { applyPngMap, initMinimap, camera, world, player, applyPendingRestore });
    expect(t).toBeNull();
    expect(initMinimap).toHaveBeenCalled();
    expect(applyPendingRestore).toHaveBeenCalled();
    expect(camera.x).toBe(0);
    expect(camera.y).toBe(0);
  });
});
