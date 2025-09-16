# Music Theme Manifest

The chip-music ambient system now looks for procedural theme data in
`assets/data/music/themes.json`. Your external generator can overwrite this file or
create a new one with the same shape. The loader runs in the browser, so keep the
manifest as plain JSON (no comments).

## Top-level structure

```json
{
  "schemaVersion": 1,
  "themes": [ ... theme entries ... ]
}
```

- `schemaVersion`: Reserve for future changes. Currently only version `1` is used.
- `themes`: Array of theme entries. Later entries with the same priority do not override
  earlier ones, but higher priority values do.

## Theme entry fields

Each entry decides when it should be used, and which variants (normal/low/high menace)
are available.

```json
{
  "id": "temple_heart",
  "priority": 10,
  "locations": ["temple_heart"],
  "levels": [6],
  "default": false,
  "variants": { ... }
}
```

- `id`: Human-readable identifier (string). Used only for debugging.
- `priority` (number, optional, default `0`): Higher values win when multiple entries
  match the same location or level.
- `locations` (string or array of strings, optional): Match against
  `runtime.musicLocation`. If any value is `"*"` or `"default"`, the entry becomes the
  fallback theme.
- `levels` (number or array of numbers, optional): Match against `runtime.currentLevel`
  when no explicit location is set.
- `default` (boolean, optional): If true, treat the entry as fallback even when
  `locations`/`levels` are provided.
- `variants`: Object keyed by menace mode. Use `"normal"`, `"low"`, `"high"`.
  Optionally include `"default"` or `"*"` as fallbacks when a menace-specific variant
  is missing.

## Variant schema

Each variant must include the data the synthesizer consumes. Omitted optional arrays are
ignored. All arrays should contain plain numbers (integers for steps/scale degrees,
floating point for gains), in the order listed.

| Field | Type / Length | Notes |
| ----- | -------------- | ----- |
| `intensity` | int (0-2) | Selects the index into the gain arrays. |
| `bpm` | number | Tempo. |
| `barsPerSection` | int > 0 | Logical bars for A and B sections. |
| `chordProgA`, `chordProgB` | int[] | Root offsets in semitones per bar (length >= 1). |
| `scaleA`, `scaleB` | int[] | Scale degree offsets used by melodies. |
| `melodyA1`, `melodyA2`, `melodyB1`, `melodyB2` | int[8] | Step patterns in scale degrees. |
| `melodyA3`, `melodyB3` | int[8], optional | Extra patterns for extra bars. |
| `melodyA_intense`, `melodyB_intense` | int[8], optional | Overrides when menace mode is high and `useIntense` is true. |
| `bassPattern` | int[8] | Bass steps (use `7` to indicate the 5th). |
| `filterBaseA`, `filterBaseB`, `filterRange` | number | Filter base cutoffs and sweep range. |
| `hatEvery` | int >= 1 | Step spacing for hi-hats. |
| `hatGain`, `kickGain`, `snareGain`, `bassGain`, `leadGain` | number[3] | Gains for menace intensities (indexes 0=normal, 1=low, 2=high). |
| `hatDecay`, `kickDecay`, `snareDecay`, `bassDecay`, `leadAttack`, `leadDecay` | number | Envelope timings (seconds). |
| `kickSteps`, `snareSteps` | int[], optional | Step indexes (0-7) to trigger percussion. |
| `restSteps` | int[], optional | Step indexes to rest the lead. |
| `bassType` | string | One of `"sine"`, `"triangle"`, `"square"`. |
| `leadType` | string[2] | Waveforms for section A and B. |
| `useIntense` | boolean, optional | When true, menace-high uses the `_intense` melody sets. |

If any required value is missing or malformed, the loader logs a warning once (prefixed
with `[music-theme]`) and skips that variant or entry.

## Example

The snippet below mirrors the existing Heart of the Temple theme. Use it as a template
for your generator output. Only a normal-mode variant is shown for brevity; include `low`
and `high` as needed.

```json
{
  "schemaVersion": 1,
  "themes": [
    {
      "id": "temple_heart",
      "priority": 5,
      "locations": ["temple_heart"],
      "variants": {
        "normal": {
          "intensity": 0,
          "bpm": 96,
          "barsPerSection": 32,
          "chordProgA": [0, 4, 6, 8, 10, 8, 6, 4],
          "chordProgB": [2, 6, 8, 10, 8, 6, 4, 2],
          "scaleA": [0, 2, 4, 6, 8, 10],
          "scaleB": [0, 3, 5, 7, 10],
          "melodyA1": [0, 2, 4, 6, 4, 2, 0, 2],
          "melodyA2": [4, 6, 8, 10, 8, 6, 4, 2],
          "melodyB1": [0, 3, 5, 7, 5, 3, 0, 3],
          "melodyB2": [7, 10, 7, 5, 3, 5, 7, 10],
          "melodyA3": [2, 4, 6, 8, 6, 4, 2, 0],
          "melodyB3": [5, 7, 10, 7, 5, 3, 2, 0],
          "bassPattern": [0, 0, 7, 0, 0, 0, 7, 0],
          "filterBaseA": 1600,
          "filterBaseB": 1800,
          "filterRange": 700,
          "hatEvery": 4,
          "hatGain": [0.02, 0.03, 0.04],
          "hatDecay": 0.02,
          "kickGain": [0, 0, 0],
          "kickDecay": 0,
          "kickSteps": [],
          "snareGain": [0, 0, 0],
          "snareDecay": 0,
          "snareSteps": [],
          "bassType": "sine",
          "bassGain": [0.04, 0.05, 0.06],
          "bassDecay": 0.14,
          "leadType": ["sine", "triangle"],
          "leadGain": [0.05, 0.065, 0.08],
          "leadAttack": 0.008,
          "leadDecay": 0.18,
          "useIntense": false,
          "restSteps": [4]
        }
      }
    }
  ]
}
```

When the file is present in `assets/data/music/themes.json`, the engine attempts to load
it on startup. While the fetch is in flight the default hard-coded themes are used; the
next time music restarts after the manifest is parsed, the custom variants will be used.
For quick iteration, open DevTools and run
`await import('./src/data/music/theme_loader.js').then(m => m.reloadMusicThemes());`
to force a refresh after editing the manifest.

## Producing the Manifest from `docs/MUSIC_SPEC.md`

If your generator already emits per-theme JSON files that match the `ThemeFile` schema
documented in `docs/MUSIC_SPEC.md`, translate them into the manifest fields above as the
final export step:

- Use the `parameters` block to populate shared values:
  - `tempo` → `bpm`
  - `loop_length` and `time_signature` determine `barsPerSection` (e.g., a loop length of
    8 in 4/4 covers eight bars; split evenly between the A/B sections you want the game to
    cycle through).
- Derive `chordProg*` and `scale*` by analysing the note material from the `pulse` and
  `triangle` channels. When your tool already knows the generated chord/scale choices,
  emit them directly as semitone offsets (root relative to the key signature) to avoid a
  lossy reverse-engineer step.
- Quantise the `pulse1` and `pulse2` note events onto eight steps per bar (eighth notes in
  4/4) to form the melody patterns (`melodyA*`, `melodyB*`). For empty steps, insert a
  degree that points to a sustained note or substitute repeats as needed.
- Translate the `triangle` channel rhythm into `bassPattern`, using `0` for root, `7` for
  fifth, and other scale degrees for colour tones.
- Map the `noise` channel to `kickSteps`, `snareSteps`, and hat behaviour. You can expose
  more detail in your generator by flagging each percussion event type; e.g., send all
  kick markers to `kickSteps` and use a lightweight probabilistic fill to populate
  `hatEvery`/`hatGain`.
- Estimate gains by normalising the `velocity` fields (0–100) into 0.0–0.2 ranges that fit
  the synth’s envelope. A simple approach is `velocity / 100 * baseGain`, where
  `baseGain` is a tuning constant per channel.
- Decide which menace mode variant each exported theme should feed: write separate
  manifests for `normal`, `low`, and `high`, or reuse the same data across them by setting
  only the `normal` key.

Because your generator already tracks the musical intent, it is usually easier to emit the
manifest-friendly arrays directly (instead of exporting raw note events and inferring them
later). If you must transform existing `ThemeFile` JSON, add a small build step that reads
each file, snaps the note times to the intended subdivision, and writes the derived arrays
into `assets/data/music/themes.json`.
