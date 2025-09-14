# Companion Temperament Data Structures — Outline

Status: design outline for data; implementation uses this shape.

## Files
- `src/data/companion_meta.js` — central metadata for companion personalities and VN intro triads.

## Exports
```
export const companionTemperaments = {
  canopy: 'nurturing', yorna: 'exacting', hola: 'nurturing', oyin: 'steady',
  twil: 'playful', tin: 'playful', nellis: 'steady', urn: 'nurturing',
  varabella: 'practical', cowsill: 'playful', fana: 'exacting', snek: 'nurturing', snake: 'nurturing',
};

export const temperamentProfiles = {
  nurturing: { introMatch: 0.3, introClash: 0.0, defer: 0, gateShift: -0.3 },
  steady:    { introMatch: 0.3, introClash: -0.05, defer: 0, gateShift: 0 },
  playful:   { introMatch: 0.3, introClash: -0.10, defer: 0, gateShift: 0 },
  practical: { introMatch: 0.25, introClash: -0.10, defer: 0, gateShift: 0.2 },
  exacting:  { introMatch: 0.3, introClash: -0.15, defer: 0, gateShift: 0.5 },
};

// VN intro three-choice definitions with per-companion overrides
export const introTriads = {
  canopy: {
    match: { label: "Let’s find your sister—walk with me.", delta: 0.3, flag: 'canopy_intro_encourage' },
    clash: { label: "I could use another pair of fighting hands—join up.", delta: 0 },
    defer: { label: "We’ll talk later, Canopy." },
  },
  yorna: {
    match: { label: "Let’s get the key and kill Vast. Keep up.", delta: 0.2, flag: 'yorna_intro_encourage' },
    clash: { label: "Hang back and patch me up, alright?", delta: -0.15 },
    defer: { label: "Not now, Yorna." },
  },
  hola: {
    match: { label: "Stay close; call the breeze—we’ll get the key.", delta: 0.3, flag: 'hola_intro_encourage' },
    clash: { label: "Frontline with me—we need a brawler.", delta: 0 },
    defer: { label: "Another time, Hola." },
  },
  oyin: {
    match: { label: "Walk with me—learn as we go.", delta: 0.3, flag: 'oyin_intro_encourage' },
    clash: { label: "I need a seasoned striker right now.", delta: -0.05 },
    defer: { label: "Let’s talk later, Oyin." },
  },
  twil: {
    match: { label: "Read the ground and call the lanes—join me.", delta: 0.3, flag: 'twil_intro_encourage' },
    clash: { label: "Skip the scouting—we just need brute force.", delta: -0.1 },
    defer: { label: "Not now, Twil." },
  },
  tin: {
    match: { label: "Set the beat—keep our hands moving.", delta: 0.3, flag: 'tin_intro_encourage' },
    clash: { label: "We need slow and steady, not fast.", delta: -0.1 },
    defer: { label: "Later, Tin." },
  },
  nellis: {
    match: { label: "Keep the line; I’ll lead—you hold.", delta: 0.3, flag: 'nellis_intro_encourage' },
    clash: { label: "I’m chasing speed and chaos today.", delta: -0.1 },
    defer: { label: "Hold that thought, Nellis." },
  },
  urn: {
    match: { label: "Let’s lift the streets—walk with me.", delta: 0.4, flag: 'urn_intro_encourage' },
    clash: { label: "I need a hard hitter, not a cheer.", delta: 0 },
    defer: { label: "We’ll come back to this, Urn." },
  },
  varabella: {
    match: { label: "I want sharp eyes—call angles and cover.", delta: 0.4, flag: 'varabella_intro_respect' },
    clash: { label: "Save the angles; just swing hard.", delta: -0.15 },
    defer: { label: "Later, Varabella." },
  },
  cowsill: {
    match: { label: "Be my strike partner—let’s double every hit.", delta: 0.3, flag: 'cowsill_intro_team' },
    clash: { label: "We actually need a healer more than damage.", delta: -0.05 },
    defer: { label: "Another time, Cowsill." },
  },
  fana: {
    match: { label: "You’re free—burn what clings. Walk with me.", delta: 0.6, flag: 'fana_intro_reassure' },
    clash: { label: "We need cold precision, not heat.", delta: -0.1 },
    defer: { label: "Rest first, Fana." },
  },
  snek: {
    match: { label: "Coil close and slow our foes.", delta: 0.2, flag: 'snake_intro_encourage' },
    clash: { label: "I was hoping for… thumbs.", delta: 0 },
    defer: { label: "Curl up for now, Snek." },
  },
  snake: {
    match: { label: "Coil close and slow our foes.", delta: 0.2, flag: 'snake_intro_encourage' },
    clash: { label: "I was hoping for… thumbs.", delta: 0 },
    defer: { label: "Curl up for now, Snek." },
  },
};
```

### Notes
- Names are matched in lowercase against `actor.name`.
- `delta` values override temperament defaults for VN intros.
- `flag` is used with `affinity_add` to prevent double‑granting via talk intros.
- Defer option is tracked via a suggested `<name>_intro_deferred` flag if needed; VN seen is already persisted via `runtime.vnSeen`.

Feud/Truce Reference (integration with temperament)
- During the Level 2 feud (Canopy ↔ Yorna), join actions should be gated by party composition until `canopy_yorna_respect` is earned.
- While together without respect, a soft cap on positive affinity may apply between the two (see engine chemistry dampeners) — the truce flag lifts this cap.
