import { companions, npcs, runtime } from './state.js';
import { updatePartyUI, showBanner } from './ui.js';

// Quest reward config: supports future quests that require manual turn-in via requiresTurnIn: true
export const QUEST_REWARDS = {
  canopy_triage:            { companion: 'canopy',   amount: 0.8, rewardFlag: 'canopy_triage_reward',      doneFlag: 'canopy_triage_done' },
  canopy_sister2:          { companion: 'canopy',   amount: 1.0, rewardFlag: 'canopy_sister2_reward',     doneFlag: 'canopy_sister2_done' },
  canopy_sister3:          { companion: 'canopy',   amount: 1.2, rewardFlag: 'canopy_sister3_reward',     doneFlag: 'canopy_sister3_done' },
  canopy_fetch_ribbon:     { companion: 'canopy',   amount: 0.8, rewardFlag: 'canopy_fetch_ribbon_reward',doneFlag: 'canopy_fetch_ribbon_done' },

  yorna_knot:              { companion: 'yorna',    amount: 0.8, rewardFlag: 'yorna_knot_reward',         doneFlag: 'yorna_knot_done' },
  yorna_ring:              { companion: 'yorna',    amount: 1.0, rewardFlag: 'yorna_ring_reward',         doneFlag: 'yorna_ring_done' },
  yorna_causeway:          { companion: 'yorna',    amount: 1.2, rewardFlag: 'yorna_causeway_reward',     doneFlag: 'yorna_causeway_done' },
  yorna_find_hola:         { companion: 'yorna',    amount: 0.7, rewardFlag: 'yorna_find_hola_reward',    doneFlag: 'yorna_find_hola_done' },

  hola_practice:           { companion: 'hola',     amount: 0.7, rewardFlag: 'hola_practice_reward',      doneFlag: 'hola_practice_done' },
  hola_silence:            { companion: 'hola',     amount: 1.0, rewardFlag: 'hola_silence_reward',       doneFlag: 'hola_silence_done' },
  hola_breath_bog:         { companion: 'hola',     amount: 1.2, rewardFlag: 'hola_breath_bog_reward',    doneFlag: 'hola_breath_bog_done' },
  // Level 1 Hola quest: Find Yorna
  hola_find_yorna:        { companion: 'hola',     amount: 0.7, rewardFlag: 'hola_find_yorna_reward',    doneFlag: 'hola_find_yorna_done' },

  twil_fuse:               { companion: 'twil',     amount: 0.8, rewardFlag: 'twil_fuse_reward',          doneFlag: 'twil_fuse_done' },
  twil_ember:              { companion: 'twil',     amount: 1.2, rewardFlag: 'twil_ember_reward',         doneFlag: 'twil_ember_done' },

  twil_trace:              { companion: 'twil',     amount: 0.8, rewardFlag: 'twil_trace_reward',         doneFlag: 'twil_trace_done' },
  twil_wake:               { companion: 'twil',     amount: 1.0, rewardFlag: 'twil_wake_reward',          doneFlag: 'twil_wake_done' },

  tin_shallows:            { companion: 'tin',      amount: 1.0, rewardFlag: 'tin_shallows_reward',       doneFlag: 'tin_shallows_done' },
  tin_gaps4:               { companion: 'tin',      amount: 1.0, rewardFlag: 'tin_gaps4_reward',          doneFlag: 'tin_gaps4_done' },

  nellis_beacon:           { companion: 'nellis',   amount: 1.2, rewardFlag: 'nellis_beacon_reward',      doneFlag: 'nellis_beacon_done' },
  nellis_crossroads4:      { companion: 'nellis',   amount: 1.0, rewardFlag: 'nellis_crossroads4_reward', doneFlag: 'nellis_crossroads4_done' },

  urn_rooftops:            { companion: 'urn',      amount: 0.8, rewardFlag: 'urn_rooftops_reward',       doneFlag: 'urn_rooftops_done' },
  varabella_crossfire:     { companion: 'varabella',amount: 1.0, rewardFlag: 'varabella_crossfire_reward',doneFlag: 'varabella_crossfire_done' },

  snake_den:               { companion: 'snek',     amount: 0.8, rewardFlag: 'snake_den_reward',          doneFlag: 'snake_den_done' },
};

function findActorFor(nameKey) {
  const key = String(nameKey || '').toLowerCase();
  if (!key) return null;
  let target = null;
  for (const c of companions) { if ((c.name||'').toLowerCase().includes(key)) { target = c; break; } }
  if (!target) { for (const n of npcs) { if ((n.name||'').toLowerCase().includes(key)) { target = n; break; } } }
  return target;
}

export function autoTurnInIfCleared(questId) {
  try {
    const id = String(questId||'').trim();
    if (!id) return;
    const cfg = QUEST_REWARDS[id];
    if (!cfg) return; // not an auto quest or not configured
    if (!runtime.questFlags) runtime.questFlags = {};
    if (!runtime.affinityFlags) runtime.affinityFlags = {};
    const cleared = !!runtime.questFlags[`${id}_cleared`];
    const done = !!runtime.questFlags[cfg.doneFlag];
    const claimed = !!runtime.affinityFlags[cfg.rewardFlag];
    if (!cleared || done || claimed) return;
    const actor = findActorFor(cfg.companion);
    if (actor) {
      const before = typeof actor.affinity === 'number' ? actor.affinity : 5;
      const after = Math.max(1, Math.min(10, before + cfg.amount));
      actor.affinity = after;
      runtime.affinityFlags[cfg.rewardFlag] = true;
      showBanner(`${actor.name || 'Companion'} affinity +${cfg.amount.toFixed(1)} (Quest)`);
      try { updatePartyUI(companions); } catch {}
    }
    runtime.questFlags[cfg.doneFlag] = true;
  } catch {}
}
