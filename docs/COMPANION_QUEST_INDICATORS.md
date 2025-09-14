# Companion Quest Indicators — General Plan (No Code Yet)

Goal
- Subtly indicate when any companion has a new quest, a turn‑in, or (optionally) a mid‑chain update, without nagging or clutter.
- Works whether the companion is in the party or standing as an NPC.

User Signals (layers)
- Over‑Head Exclamation (!):
  - Fires once per availability transition (false → true) when safe.
  - Short bounce‑in (≈1.0s), a light ring pulse, a few sparkles, and a soft chime.
  - Shown over the companion sprite (party follower or NPC). If off‑screen, queue until visible.
- Party UI Dot:
  - Tiny dot on the companion’s heart/portrait. One gentle pulse on first reveal, then static.
  - Hidden during combat; persists until acted on (dialog opened and quest started/turned‑in).
- Companion Selector Tag:
  - Append “(New)” or “(Turn‑In)” after the name in the selector list.
- Optional Rotating Top Hint:
  - Low‑frequency one‑liner (e.g., “Yorna: new quest”) rotating every 6–8s, only out of combat.

States
- New: at least one quest start is available (a choice with `action: 'start_quest'` whose `requires` are satisfied and `<id>_started` is not set).
- Turn‑In: an active quest with `<id>_cleared` and not `<id>_done`.
- Update (optional): mid‑chain beat unlocked (lower priority; can map to New if not needed).

Safety & Suppression
- Suppress over‑head/sound while: in combat, boss arena, VN overlay open, camera panning.
- Delay reveal until player has been out of combat for ~4–6 seconds.
- Stagger multiple reveals by ~0.4s to avoid cacophony.

Detection & Aggregation (reuses dialog gating)
- Detector: evaluate companion dialog trees to find visible “Start”/“Turn‑In” choices by reusing `meetsRequirement` logic.
- Aggregator: compute per‑companion availability sets and diff against previous frame/state.
- Events to run aggregation:
  - On level load after spawns settle (and after `levelN_reached`).
  - On quest flag changes (start, clear, done, counters update).
  - On dialog open/close for that companion.

Data Model (runtime)
- `runtime.questIndicators: Record<companionKey, { new: boolean, turnIn: boolean, newIds: Set<string>, turnInIds: Set<string> }>`
- `runtime.questNotify: Record<companionKey, { shown: Record<questId, boolean>, cooldownUntil: number }>`
- `runtime.uiSettings.questIndicators: 'off' | 'minimal' | 'normal'` (saveable)
- Use existing `runtime.questFlags` for quest lifecycle; do not duplicate.

Reveal Rules
- Transition new/turn‑in set gains → schedule a one‑time over‑head “!” for each gained questId unless already `shown[questId]`.
- If companion not visible: queue until visible; respect `cooldownUntil` to throttle.
- On dialog open for that companion: clear the one‑time pulse state; keep persistent party dot until the player starts/turns‑in.

Presentation (hooks)
- Party UI: extend `updatePartyUI` to render a small dot when `questIndicators[name].new || .turnIn` and settings allow it.
- Selector Menu: in `startCompanionSelector`, append “(New)” / “(Turn‑In)” based on `questIndicators`.
- Over‑Head “!”: add a lightweight effect entity with anchor to an actor (companion or NPC). Plays chime `playSfx('questNotify')`.
- Rotating Top Hint: extend `updateQuestHint()` to optionally rotate a short message for the highest‑priority available companion.

Priority & Colors (optional)
- If separate colors desired: New=blue, Turn‑In=green, Update=amber. Otherwise a single dot is acceptable.
- If both New and Turn‑In present, prioritize Turn‑In for the top hint; party UI can show a single dot.

Persistence
- Save / load `runtime.questIndicators` and `runtime.questNotify` (lists of keys) in `save_core`.
- Do not replay over‑head reveals for `shown[questId]` across saves; persistence avoids spam.

Accessibility & Settings
- “Quest indicators: Off / Minimal / Normal” in a simple settings node (VN or toggle in debug menu).
- Minimal: party dot + selector tag only; Normal: includes over‑head “!” and chime.
- Tie chime volume to UI SFX; respect a global “silent” toggle.

Pseudocode (high‑level)
```
function recomputeQuestIndicators() {
  const byComp = {};
  for (const comp of allCompanionsKnown()) {
    const { newIds, turnInIds } = scanDialog(comp); // uses meetsRequirement
    const prev = runtime.questIndicators[comp.key] || { newIds: new Set(), turnInIds: new Set() };
    const gainedNew = diff(newIds, prev.newIds);
    const gainedTurnIn = diff(turnInIds, prev.turnInIds);
    runtime.questIndicators[comp.key] = {
      new: newIds.size > 0,
      turnIn: turnInIds.size > 0,
      newIds,
      turnInIds,
    };
    scheduleReveals(comp, gainedNew, gainedTurnIn);
  }
}

function scheduleReveals(comp, gainedNew, gainedTurnIn) {
  if (runtime.uiSettings.questIndicators === 'off') return;
  const qn = runtime.questNotify[comp.key] ||= { shown: {}, cooldownUntil: 0 };
  const now = timeSec();
  if (now < qn.cooldownUntil) return;
  const ids = [...gainedNew, ...gainedTurnIn].filter(id => !qn.shown[id]);
  if (ids.length === 0) return;
  if (inCombat() || inVN() || cameraPanning()) { queueForVisibleLater(comp, ids); return; }
  if (!isCompanionVisible(comp)) { queueForVisibleLater(comp, ids); return; }
  playOverheadMark(comp, '!');
  playSfx('questNotify');
  ids.forEach(id => qn.shown[id] = true);
  qn.cooldownUntil = now + 2.0; // global stagger
}
```

Integration Points (no code yet)
- Dialog system: expose `meetsRequirement(req)` and a lightweight `scanDialog(compKey)` utility to find Start/Turn‑In choices.
- Levels: call `recomputeQuestIndicators()` after `loadLevelN()` finishes initial placement and `levelN_reached` is set.
- Quests: on `start_quest`, `*_cleared`, `*_done`, and counters update → call `recomputeQuestIndicators()`.
- UI: extend party UI renderers and selector; add optional top‑hint rotation; draw overhead FX in render layer.
- Save: add (de)serialization for `questIndicators` and `questNotify` maps.

Acceptance
- Any companion with a new quest or turn‑in triggers a one‑time, subtle over‑head “!” (out of combat), a soft chime, and a persistent, non‑intrusive party UI dot and selector tag.
- Indicators do not fire during combat/VN and respect a short cooldown.
- Opening the companion’s dialog clears the pulse; dot persists until you act (start/turn‑in).
- Behavior applies to all companions uniformly (not Yorna‑specific).
