# Level 2 Feud VN — Canopy vs Yorna (Script Beats)

Purpose
- Teach party strategy by forcing a meaningful choice early.
- Establish that Canopy and Yorna refuse to ride together until a later truce.
- Nudge the player to recruit Oyin or Twil as Level 2 counters.

Trigger
- First time entering Level 2 (`level2_reached`) while both Canopy and Yorna are in the party and `canopy_yorna_feud_resolved` is not set.
- VN lock: true (no cancel); the player must choose.

Cast
- Canopy (“My Lord”) — calm, protective
- Yorna (“Chief”) — direct, aggressive

Tone
- Plain, literal, short lines (see Narrative Tone Guide). No metaphors or idioms.

Scene Flow
- Pre‑cue: Quick pan to party, brief pulse; open VN.
- Setup
  - Yorna: "Chief, she slows us. We push or we bleed. Pick."
  - Canopy: "My Lord, charge blind and you lose people. I won’t help with that."
- Escalation
  - Yorna: "We press. We kill what’s in front of us."
  - Canopy: "We keep you standing so you can finish fights."
- Player Choice (2 options)
  - Keep Canopy (Healer · Regeneration · Shield)
  - Keep Yorna (Frontliner · ATK · Reach)

Branch — Keep Canopy
- Action: Dismiss Yorna (convert to nearby NPC). Set flags: `canopy_yorna_choice='canopy'`, `canopy_yorna_feud_active=true`, `canopy_yorna_feud_resolved=true`.
- Lines
  - Yorna: "Fine. Call me when you want to move."
  - Canopy: "My Lord, I’ll keep you standing."
- Close: Continue
 - Affinity: Apply negative affinity to Yorna (−1.0) — she takes it personally.

Branch — Keep Yorna
- Action: Dismiss Canopy (convert to nearby NPC). Set flags: `canopy_yorna_choice='yorna'`, `canopy_yorna_feud_active=true`, `canopy_yorna_feud_resolved=true`.
- Lines
  - Canopy: "I won’t stand behind that pace. I’ll step back."
  - Yorna: "Good. We move now."
- Close: Continue
 - Affinity: Apply negative affinity to Canopy (−0.6) — steadier reaction than Yorna.

Post‑Scene Nudge (optional banner)
- "Tip: Oyin adds +1 range and a short rally heal. Twil slows enemies to open safer hits."

Refusal Lines (attempting to recruit during feud)
- Yorna (Canopy present, no truce): "No. Not while she’s on your line. Choose first."
- Canopy (Yorna present, no truce): "My Lord, not with her in the party. Choose first."

Truce Acknowledgement (after `canopy_yorna_respect`)
- Short banter on first joint party enter:
  - Yorna: "Hold and push. I can work with that."
  - Canopy: "I’ll cover when you press. Keep it clean."

Implementation Notes
- VN lock: true; two choices only; both branches end with `vn_continue`.
- Use `dismiss_companion` action with a concrete `data` reference to the companion being removed.
- Immediately update UI and clear any pre‑intro/freeze state.
- Persist flags; avoid re‑playing the VN after resolution.

Data Sketch (VN tree)
```
const feudVN = {
  start: 'root', lock: true,
  nodes: {
    root: {
      text: "Yorna: Chief, she slows us. We push or we bleed. Pick.\nCanopy: My Lord, charge blind and you lose people. I won’t help with that.",
      choices: [
        { label: 'Keep Canopy (Healer · Regeneration · Shield)', action: 'dismiss_companion', data: yornaRef, next: 'kept_canopy' },
        { label: 'Keep Yorna (Frontliner · ATK · Reach)',      action: 'dismiss_companion', data: canopyRef, next: 'kept_yorna' }
      ],
    },
    kept_canopy: {
      text: "Yorna: Fine. Call me when you want to move.\nCanopy: My Lord, I’ll keep you standing.",
      choices: [ { label: 'Continue', action: 'vn_continue' } ],
    },
    kept_yorna: {
      text: "Canopy: I won’t stand behind that pace. I’ll step back.\nYorna: Good. We move now.",
      choices: [ { label: 'Continue', action: 'vn_continue' } ],
    },
  }
};
```

Dialog Gating Snippets (join paths)
- In Canopy tree
```
{ label: 'Yes, join me.', requires: { partyMissing: 'yorna' }, action: 'join_party' },
{ label: 'We need to settle this first.', requires: { partyHas: 'yorna', missingFlag: 'canopy_yorna_respect' }, next: 'canopy_refusal_yorna_present' },
```
- In Yorna tree
```
{ label: 'Yes, join me.', requires: { partyMissing: 'canopy' }, action: 'join_party' },
{ label: 'Not with her here.', requires: { partyHas: 'canopy', missingFlag: 'canopy_yorna_respect' }, next: 'yorna_refusal_canopy_present' },
```

Acceptance
- VN triggers once at Level 2 with both present.
- Choice dismisses the other, sets flags, and leaves one party slot open.
- Refusal lines display until a truce is earned.
- Optional banner nudges the Oyin/Twil counter.
