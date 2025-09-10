// Lightweight debug tests for save system and VN intro cooldown
import { runtime, player, obstacles } from '../engine/state.js';
import { TILE } from '../engine/constants.js';
import { tryInteract } from '../systems/combat.js';
import { saveGame, loadGame } from '../engine/save.js';

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function waitForLevel(target, timeoutMs = 4000) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if ((runtime.currentLevel || 0) === target && !runtime.pendingLevel) return true;
    await sleep(50);
  }
  return false;
}

async function goToLevel(target) {
  if ((runtime.currentLevel || 0) === target) return true;
  runtime.pendingLevel = target;
  return await waitForLevel(target);
}

async function openChestById(id) {
  // find chest obstacle by id
  const chest = obstacles.find(o => o && o.type === 'chest' && o.id === id);
  if (!chest) throw new Error(`Chest not found: ${id}`);
  // Move player adjacent and face chest
  player.x = Math.round(chest.x - player.w - 2);
  player.y = Math.round(chest.y + chest.h/2 - player.h/2);
  player.dir = 'right';
  // Interact to open
  tryInteract();
  // Give engine a moment to process removal
  await sleep(50);
  return true;
}

async function testOpenedChestPersistence(slot = 9) {
  const report = { name: 'OpenedChestPersistence', ok: false, details: '' };
  try {
    const ok = await goToLevel(1);
    if (!ok) throw new Error('Failed to load Level 1');
    const chestId = 'chest_l1_sword';
    await openChestById(chestId);
    // Save and read back
    saveGame(slot);
    await sleep(100);
    const key = `shadow_kingdom_save_${slot}`;
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('No save payload found');
    const data = JSON.parse(raw);
    const arr = Array.isArray(data.openedChests) ? data.openedChests : [];
    const has = arr.includes(chestId);
    if (!has) throw new Error(`openedChests missing ${chestId}`);
    report.ok = true; report.details = 'openedChests contains chest id';
  } catch (e) {
    report.ok = false; report.details = String(e && e.message || e);
  }
  console.log(`[TEST] ${report.name}: ${report.ok ? 'OK' : 'FAIL'} — ${report.details}`);
  return report;
}

async function testEnemyIntroAfterLoadById(slot = 8) {
  const report = { name: 'EnemyIntroAfterLoadById', ok: false, details: '' };
  try {
    const ok = await goToLevel(1);
    if (!ok) throw new Error('Failed to load Level 1');
    const S = await import('../engine/state.js');
    const { enemies, player, runtime: rt } = S;
    // Find Gorg
    const gorg = enemies.find(e => (e?.vnId === 'enemy:gorg') || ((e?.name||'').toLowerCase().includes('gorg')));
    if (!gorg) throw new Error('Gorg not found');
    // Ensure he is unseen
    if (rt.vnSeen) { delete rt.vnSeen['enemy:gorg']; }
    gorg._vnShown = false;
    // Place player well away so Gorg isn't visible when saving
    player.x = Math.max(0, gorg.x - 400);
    player.y = Math.max(0, gorg.y - 300);
    // Save and then load
    saveGame(slot);
    await sleep(100);
    loadGame(slot);
    // Give time for deserialize + async intro_texts import
    await sleep(150);
    // Move into view of Gorg
    player.x = gorg.x; player.y = gorg.y;
    await sleep(200);
    const seen = !!(rt.vnSeen && rt.vnSeen['enemy:gorg']);
    const g2 = S.enemies.find(e => (e?.vnId === 'enemy:gorg') || ((e?.name||'').toLowerCase().includes('gorg')));
    const flagged = !!(g2 && g2._vnShown);
    if (!seen || !flagged) throw new Error(`Intro did not trigger after load (seen=${seen}, flagged=${flagged})`);
    report.ok = true; report.details = 'Enemy VN intro (by vnId) triggers after load';
  } catch (e) {
    report.ok = false; report.details = String(e && e.message || e);
  }
  console.log(`[TEST] ${report.name}: ${report.ok ? 'OK' : 'FAIL'} — ${report.details}`);
  return report;
}

async function testVnIntroCooldown() {
  const report = { name: 'VnIntroCooldown', ok: false, details: '' };
  try {
    const ok = await goToLevel(1);
    if (!ok) throw new Error('Failed to load Level 1');
    // Find two VN-flagged NPCs (Canopy, Yorna, Hola)
    const npcs = (await import('../engine/state.js')).npcs;
    const actors = npcs.filter(n => n && n.vnOnSight && n.name);
    if (actors.length < 2) throw new Error('Not enough vnOnSight NPCs');
    const a = actors[0], b = actors[1];
    const keyA = `npc:${(a.name||'').toLowerCase()}`;
    const keyB = `npc:${(b.name||'').toLowerCase()}`;
    // Reset flags so intros are eligible
    runtime.vnSeen[keyA] = false; delete runtime.vnSeen[keyA]; a._vnShown = false;
    runtime.vnSeen[keyB] = false; delete runtime.vnSeen[keyB]; b._vnShown = false;
    // Place player so both are within camera view
    const cx = Math.round((a.x + b.x) / 2);
    const cy = Math.round((a.y + b.y) / 2);
    player.x = cx; player.y = cy; runtime.introCooldown = 0;
    // Wait a bit for first intro to schedule
    await sleep(150);
    const firstCount = [a,b].filter(x => !!x._vnShown).length;
    if (firstCount !== 1) throw new Error(`Expected 1 intro scheduled initially (got ${firstCount})`);
    // During cooldown (0.8s), second should not trigger
    await sleep(300);
    const midCount = [a,b].filter(x => !!x._vnShown).length;
    if (midCount !== 1) throw new Error(`Cooldown did not hold; count=${midCount}`);
    // After cooldown expires, the other should trigger
    await sleep(700);
    const finalCount = [a,b].filter(x => !!x._vnShown).length;
    if (finalCount < 2) throw new Error(`Second intro did not trigger after cooldown (count=${finalCount})`);
    report.ok = true; report.details = 'Cooldown gated intros sequentially';
  } catch (e) {
    report.ok = false; report.details = String(e && e.message || e);
  }
  console.log(`[TEST] ${report.name}: ${report.ok ? 'OK' : 'FAIL'} — ${report.details}`);
  return report;
}

async function testUniquePoseRoundTrip(slot = 7) {
  const report = { name: 'UniquePoseRoundTrip', ok: false, details: '' };
  try {
    const ok = await goToLevel(1);
    if (!ok) throw new Error('Failed to load Level 1');
    const S = await import('../engine/state.js');
    const { enemies } = S;
    const u = enemies.find(e => e && typeof e.vnId === 'string' && e.vnId.startsWith('enemy:'));
    if (!u) throw new Error('No unique enemy with vnId found');
    const vnId = u.vnId;
    // Nudge pose and damage
    u.x = Math.max(0, Math.min(u.x + 17, S.world.w - (u.w||12)));
    u.y = Math.max(0, Math.min(u.y + 11, S.world.h - (u.h||16)));
    u.dir = 'left';
    u.hp = Math.max(1, (u.hp|0) - 3);
    const before = { x: u.x, y: u.y, dir: u.dir, hp: u.hp };
    // Save and reload
    saveGame(slot);
    await sleep(100);
    loadGame(slot);
    await sleep(200);
    const u2 = S.enemies.find(e => e && e.vnId === vnId);
    if (!u2) throw new Error('Unique not present after load');
    const after = { x: u2.x, y: u2.y, dir: u2.dir, hp: u2.hp };
    const same = (before.x === after.x) && (before.y === after.y) && (before.dir === after.dir) && (before.hp === after.hp);
    if (!same) throw new Error(`Pose/HP mismatch: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
    report.ok = true; report.details = 'Unique pose/hp round-trips';
  } catch (e) {
    report.ok = false; report.details = String(e && e.message || e);
  }
  console.log(`[TEST] ${report.name}: ${report.ok ? 'OK' : 'FAIL'} — ${report.details}`);
  return report;
}

  try {
    window.testOpenedChestPersistence = testOpenedChestPersistence;
    window.testVnIntroCooldown = testVnIntroCooldown;
    window.testEnemyIntroAfterLoadById = testEnemyIntroAfterLoadById;
    window.testUniquePoseRoundTrip = testUniquePoseRoundTrip;
    window.runLightSaveTests = async function() {
    const r1 = await testOpenedChestPersistence(9);
    const r2 = await testVnIntroCooldown();
    const r3 = await testEnemyIntroAfterLoadById(8);
    const r4 = await testUniquePoseRoundTrip(7);
    const ok = r1.ok && r2.ok && r3.ok && r4.ok;
    console.log(`[TEST] Summary: ${ok ? 'OK' : 'FAIL'}`);
    return { ok, results: [r1, r2, r3, r4] };
  };
} catch {}
