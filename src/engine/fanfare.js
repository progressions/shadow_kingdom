// Fantasy Game Chiptune Fanfare
// A heroic 8-bit style intro theme

class ChiptuneFanfare {
  constructor() {
    this.audioContext = null;
    this.isPlaying = false;
  }

  // Initialize audio context
  init() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Create an oscillator with ADSR envelope
  createOscillator(frequency, startTime, duration, type = 'square', gain = 0.15) {
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    
    // ADSR Envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01); // Attack
    gainNode.gain.linearRampToValueAtTime(gain * 0.8, startTime + 0.05); // Decay
    gainNode.gain.setValueAtTime(gain * 0.8, startTime + duration - 0.05); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // Release
    
    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
    
    return osc;
  }

  // Note frequency helper
  note(noteName) {
    const notes = {
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
      'C6': 1046.50
    };
    return notes[noteName] || 440;
  }

  // Play the fanfare
  play() {
    if (!this.audioContext) {
      this.init();
    }

    if (this.isPlaying) return;
    this.isPlaying = true;

    const startTime = this.audioContext.currentTime;
    const tempo = 140; // BPM
    const beat = 60 / tempo;

    // Main melody (lead square wave)
    const melody = [
      // Opening fanfare
      { note: 'C5', time: 0, dur: 0.2 },
      { note: 'E5', time: 0.2, dur: 0.2 },
      { note: 'G5', time: 0.4, dur: 0.2 },
      { note: 'C6', time: 0.6, dur: 0.6 },
      
      // Heroic phrase
      { note: 'A5', time: 1.4, dur: 0.3 },
      { note: 'G5', time: 1.7, dur: 0.3 },
      { note: 'E5', time: 2.0, dur: 0.3 },
      { note: 'F5', time: 2.3, dur: 0.5 },
      
      // Resolution
      { note: 'D5', time: 2.9, dur: 0.3 },
      { note: 'E5', time: 3.2, dur: 0.3 },
      { note: 'C5', time: 3.5, dur: 0.8 },
    ];

    // Harmony (triangle wave for softer sound)
    const harmony = [
      { note: 'E4', time: 0, dur: 0.6 },
      { note: 'G4', time: 0.6, dur: 0.6 },
      
      { note: 'F4', time: 1.4, dur: 0.9 },
      { note: 'A4', time: 2.3, dur: 0.5 },
      
      { note: 'G4', time: 2.9, dur: 0.6 },
      { note: 'E4', time: 3.5, dur: 0.8 },
    ];

    // Bass line (triangle wave)
    const bass = [
      { note: 'C3', time: 0, dur: 0.6 },
      { note: 'C3', time: 0.6, dur: 0.6 },
      
      { note: 'F3', time: 1.4, dur: 0.9 },
      { note: 'D3', time: 2.3, dur: 0.5 },
      
      { note: 'G3', time: 2.9, dur: 0.6 },
      { note: 'C3', time: 3.5, dur: 0.8 },
    ];

    // Arpeggio decoration (sawtooth for bright texture)
    const arpeggio = [
      { note: 'C5', time: 1.2, dur: 0.1 },
      { note: 'E5', time: 1.3, dur: 0.1 },
      
      { note: 'F5', time: 2.8, dur: 0.05 },
      { note: 'A5', time: 2.85, dur: 0.05 },
    ];

    // Play all parts
    melody.forEach(n => {
      // Lower lead gain for gentler intro
      this.createOscillator(this.note(n.note), startTime + n.time * beat, n.dur * beat, 'square', 0.08);
    });

    harmony.forEach(n => {
      this.createOscillator(this.note(n.note), startTime + n.time * beat, n.dur * beat, 'triangle', 0.06);
    });

    bass.forEach(n => {
      this.createOscillator(this.note(n.note), startTime + n.time * beat, n.dur * beat, 'triangle', 0.10);
    });

    arpeggio.forEach(n => {
      this.createOscillator(this.note(n.note), startTime + n.time * beat, n.dur * beat, 'sawtooth', 0.04);
    });

    // Reset playing flag after fanfare completes
    setTimeout(() => {
      this.isPlaying = false;
    }, 4300 * beat);
  }
}

// Usage example:
const fanfare = new ChiptuneFanfare();

// To play the fanfare:
// fanfare.play();

// You can also integrate this into your game like:
/*
// On game start or level complete:
document.getElementById('playButton').addEventListener('click', () => {
  fanfare.play();
});

// Or automatically on page load (note: user interaction required for audio):
window.addEventListener('load', () => {
  document.addEventListener('click', () => {
    fanfare.play();
  }, { once: true });
});
*/

// Export for use in modules
export default ChiptuneFanfare;
