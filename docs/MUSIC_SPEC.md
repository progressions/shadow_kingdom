# Example Output Files for Game Integration

## Theme Export Examples

### Example 1: Short Rock Theme (3.2 seconds)
**File**: `themes/rock_battle_intro.json`

```json
{
  "theme_id": "rock_battle_intro",
  "timestamp": "2025-09-15T14:30:22Z",
  "duration_seconds": 3.2,
  "parameters": {
    "genre": "rock",
    "key": "E",
    "scale": "minor",
    "time_signature": "4/4",
    "tempo": 140,
    "swing": false,
    "loop_length": 4
  },
  "channels": {
    "pulse1": [
      {"time": 0.0, "note": "E4", "duration": 0.214, "velocity": 85},
      {"time": 0.214, "note": "G4", "duration": 0.214, "velocity": 80},
      {"time": 0.429, "note": "B4", "duration": 0.429, "velocity": 90},
      {"time": 0.857, "note": "E5", "duration": 0.214, "velocity": 88},
      {"time": 1.071, "note": "D5", "duration": 0.214, "velocity": 82},
      {"time": 1.286, "note": "B4", "duration": 0.429, "velocity": 85},
      {"time": 1.714, "note": "G4", "duration": 0.214, "velocity": 78},
      {"time": 1.929, "note": "E4", "duration": 0.643, "velocity": 80},
      {"time": 2.571, "note": "G4", "duration": 0.214, "velocity": 75},
      {"time": 2.786, "note": "B4", "duration": 0.429, "velocity": 88}
    ],
    "pulse2": [
      {"time": 0.0, "note": "G3", "duration": 0.857, "velocity": 65},
      {"time": 0.857, "note": "A3", "duration": 0.429, "velocity": 62},
      {"time": 1.286, "note": "B3", "duration": 0.857, "velocity": 68},
      {"time": 2.143, "note": "G3", "duration": 1.057, "velocity": 60}
    ],
    "triangle": [
      {"time": 0.0, "note": "E2", "duration": 0.857, "velocity": 90},
      {"time": 0.857, "note": "A2", "duration": 0.429, "velocity": 85},
      {"time": 1.286, "note": "B2", "duration": 0.857, "velocity": 88},
      {"time": 2.143, "note": "E2", "duration": 1.057, "velocity": 90}
    ],
    "noise": [
      {"time": 0.0, "type": "kick", "duration": 0.107},
      {"time": 0.429, "type": "snare", "duration": 0.107},
      {"time": 0.857, "type": "kick", "duration": 0.107},
      {"time": 1.286, "type": "snare", "duration": 0.107},
      {"time": 1.714, "type": "kick", "duration": 0.107},
      {"time": 2.143, "type": "snare", "duration": 0.107},
      {"time": 2.571, "type": "kick", "duration": 0.107}
    ]
  }
}
```

### Example 2: Bossa Nova Ambient Theme (5.8 seconds)
**File**: `themes/bossa_menu_background.json`

```json
{
  "theme_id": "bossa_menu_background",
  "timestamp": "2025-09-15T15:12:45Z",
  "duration_seconds": 5.8,
  "parameters": {
    "genre": "bossa",
    "key": "F",
    "scale": "major",
    "time_signature": "4/4",
    "tempo": 95,
    "swing": true,
    "loop_length": 8
  },
  "channels": {
    "pulse1": [
      {"time": 0.0, "note": "A4", "duration": 0.316, "velocity": 70},
      {"time": 0.421, "note": "C5", "duration": 0.316, "velocity": 68},
      {"time": 0.842, "note": "F4", "duration": 0.474, "velocity": 72},
      {"time": 1.421, "note": "A4", "duration": 0.316, "velocity": 69},
      {"time": 1.842, "note": "G4", "duration": 0.632, "velocity": 71},
      {"time": 2.579, "note": "F4", "duration": 0.316, "velocity": 67},
      {"time": 3.0, "note": "E4", "duration": 0.474, "velocity": 73},
      {"time": 3.579, "note": "D4", "duration": 0.316, "velocity": 68},
      {"time": 4.0, "note": "C4", "duration": 0.632, "velocity": 70},
      {"time": 4.737, "note": "F4", "duration": 0.316, "velocity": 72},
      {"time": 5.158, "note": "A4", "duration": 0.642, "velocity": 69}
    ],
    "pulse2": [
      {"time": 0.211, "note": "F3", "duration": 0.316, "velocity": 55},
      {"time": 0.632, "note": "A3", "duration": 0.316, "velocity": 53},
      {"time": 1.158, "note": "C4", "duration": 0.474, "velocity": 57},
      {"time": 1.737, "note": "A3", "duration": 0.316, "velocity": 54},
      {"time": 2.263, "note": "F3", "duration": 0.474, "velocity": 56},
      {"time": 2.842, "note": "G3", "duration": 0.316, "velocity": 52},
      {"time": 3.263, "note": "C4", "duration": 0.632, "velocity": 58},
      {"time": 4.105, "note": "A3", "duration": 0.316, "velocity": 55},
      {"time": 4.526, "note": "F3", "duration": 0.632, "velocity": 53}
    ],
    "triangle": [
      {"time": 0.0, "note": "F2", "duration": 1.263, "velocity": 80},
      {"time": 1.421, "note": "G2", "duration": 0.842, "velocity": 78},
      {"time": 2.368, "note": "C3", "duration": 1.263, "velocity": 82},
      {"time": 3.737, "note": "A2", "duration": 0.842, "velocity": 79},
      {"time": 4.684, "note": "F2", "duration": 1.116, "velocity": 81}
    ],
    "noise": [
      {"time": 0.316, "type": "brush_snare", "duration": 0.079},
      {"time": 0.842, "type": "soft_kick", "duration": 0.105},
      {"time": 1.579, "type": "brush_snare", "duration": 0.079},
      {"time": 2.105, "type": "soft_kick", "duration": 0.105},
      {"time": 2.842, "type": "brush_snare", "duration": 0.079},
      {"time": 3.368, "type": "soft_kick", "duration": 0.105},
      {"time": 4.105, "type": "brush_snare", "duration": 0.079},
      {"time": 4.632, "type": "soft_kick", "duration": 0.105}
    ]
  }
}
```

### Example 3: Soft Ambient Theme (7.5 seconds)
**File**: `themes/soft_puzzle_thinking.json`

```json
{
  "theme_id": "soft_puzzle_thinking",
  "timestamp": "2025-09-15T16:05:12Z",
  "duration_seconds": 7.5,
  "parameters": {
    "genre": "soft",
    "key": "C",
    "scale": "major",
    "time_signature": "3/4",
    "tempo": 75,
    "swing": false,
    "loop_length": 8
  },
  "channels": {
    "pulse1": [
      {"time": 0.0, "note": "G4", "duration": 0.8, "velocity": 60},
      {"time": 1.2, "note": "E4", "duration": 0.8, "velocity": 58},
      {"time": 2.4, "note": "C4", "duration": 1.2, "velocity": 62},
      {"time": 4.0, "note": "F4", "duration": 0.8, "velocity": 59},
      {"time": 5.2, "note": "D4", "duration": 0.8, "velocity": 61},
      {"time": 6.4, "note": "G4", "duration": 1.1, "velocity": 57}
    ],
    "pulse2": [
      {"time": 0.4, "note": "C4", "duration": 1.2, "velocity": 45},
      {"time": 2.0, "note": "G3", "duration": 1.2, "velocity": 43},
      {"time": 3.6, "note": "F3", "duration": 1.2, "velocity": 47},
      {"time": 5.2, "note": "E3", "duration": 1.2, "velocity": 44},
      {"time": 6.8, "note": "C4", "duration": 0.7, "velocity": 46}
    ],
    "triangle": [
      {"time": 0.0, "note": "C3", "duration": 2.4, "velocity": 75},
      {"time": 2.4, "note": "F2", "duration": 2.4, "velocity": 73},
      {"time": 4.8, "note": "G2", "duration": 2.7, "velocity": 77}
    ],
    "noise": [
      {"time": 1.2, "type": "soft_brush", "duration": 0.2},
      {"time": 3.6, "type": "soft_brush", "duration": 0.2},
      {"time": 6.0, "type": "soft_brush", "duration": 0.2}
    ]
  }
}
```

## Loop Configuration Examples

### Example 1: Saved Loop Configuration
**File**: `loops/energetic_rock_125.json`

```json
{
  "loop_id": "energetic_rock_125",
  "name": "Energetic Rock 125 BPM",
  "timestamp": "2025-09-15T14:30:22Z",
  "loop_data": {
    "parameters": {
      "genre": "rock",
      "key": "D",
      "scale": "minor",
      "time_signature": "4/4",
      "tempo": 125,
      "swing": false,
      "loop_length": 8
    },
    "pattern_seed": 42738,
    "chord_progression": ["Dm", "Bb", "F", "C", "Dm", "Gm", "A", "Dm"],
    "rhythm_patterns": {
      "pulse1": [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0],
      "pulse2": [0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1],
      "triangle": [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      "noise": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
    }
  }
}
```

## Data Format Documentation for Game Integration

### Theme File Structure
```typescript
interface ThemeFile {
  theme_id: string;           // Unique identifier
  timestamp: string;          // ISO 8601 timestamp
  duration_seconds: number;   // Total duration (2-10 seconds typical)
  parameters: {
    genre: "soft" | "rock" | "bossa";
    key: string;              // "C", "D", "E", "F", "G", "A", "B"
    scale: "major" | "minor" | "blues";
    time_signature: "3/4" | "4/4";
    tempo: number;            // BPM (60-140 range)
    swing: boolean;           // Swing timing on/off
    loop_length: 4 | 8 | 16;  // Measures in original loop
  };
  channels: {
    pulse1: NoteEvent[];      // Lead melody
    pulse2: NoteEvent[];      // Harmony
    triangle: NoteEvent[];    // Bass
    noise: PercussionEvent[]; // Drums/percussion
  };
}

interface NoteEvent {
  time: number;               // Start time in seconds
  note: string;               // Note name (e.g., "C4", "F#3")
  duration: number;           // Note duration in seconds
  velocity: number;           // Volume/intensity (0-100)
}

interface PercussionEvent {
  time: number;               // Start time in seconds
  type: string;               // "kick", "snare", "brush_snare", etc.
  duration: number;           // Sound duration in seconds
}
```

### Usage Examples in Game Code

#### JavaScript/TypeScript Game Engine
```javascript
// Load theme file
const theme = await fetch('/themes/rock_battle_intro.json').then(r => r.json());

// Play using Web Audio API
class ChiptunePlayer {
  async playTheme(theme) {
    const audioContext = new AudioContext();
    
    // Create oscillators for each channel
    theme.channels.pulse1.forEach(note => {
      const osc = audioContext.createOscillator();
      osc.type = 'square';
      osc.frequency.value = this.noteToFreq(note.note);
      osc.connect(audioContext.destination);
      osc.start(audioContext.currentTime + note.time);
      osc.stop(audioContext.currentTime + note.time + note.duration);
    });
  }
  
  noteToFreq(note) {
    // Convert "C4" to 261.63 Hz, etc.
    const noteMap = { C: 261.63, D: 293.66, E: 329.63, /* ... */ };
    const [noteName, octave] = [note[0], parseInt(note[1])];
    return noteMap[noteName] * Math.pow(2, octave - 4);
  }
}
```

#### Unity C# Example
```csharp
[System.Serializable]
public class ThemeFile
{
    public string theme_id;
    public float duration_seconds;
    public ThemeParameters parameters;
    public ThemeChannels channels;
}

[System.Serializable]
public class NoteEvent
{
    public float time;
    public string note;
    public float duration;
    public int velocity;
}

// Usage
public class ChiptuneManager : MonoBehaviour
{
    public void LoadTheme(string themePath)
    {
        string json = File.ReadAllText(themePath);
        ThemeFile theme = JsonUtility.FromJson<ThemeFile>(json);
        
        // Play using Unity's AudioSource system
        StartCoroutine(PlayThemeCoroutine(theme));
    }
}
```

### File Size Examples
- **Short themes (2-3 seconds)**: ~1-2 KB
- **Medium themes (5-7 seconds)**: ~3-5 KB  
- **Long themes (8-10 seconds)**: ~5-8 KB
- **Loop configurations**: ~1-2 KB

### Typical Game Integration Workflow
1. **Export** themes from chiptune generator
2. **Copy** JSON files to game's `assets/music/` folder
3. **Reference** themes by filename in game code
4. **Load** and parse JSON at runtime
5. **Play** using game engine's audio system
6. **Loop** themes as needed for game states

The JSON format provides maximum flexibility for game engines while keeping file sizes small and data easily parseable.