# Companion Dialogue Revisions

Here is a summary of all the approved dialogue changes, formatted for review.

---

## Canopy (Sweet & Devoted)

### Introduction (`root`)
**Before:**
```javascript
text: "Canopy: I'll watch over everyone. Tell me where it hurts, okay?",
```
**After:**
```javascript
text: "Canopy: My Lord, please be careful out there. I'll be right behind you... watching over you. Tell me if you get even the smallest scratch, okay?",
```

### Support Dialogue (`support`)
**Before:**
```javascript
text: 'Canopy: My Lord, I\'ll keep an eye on scrapes and spirits. Breathe, drink water, and keep a steady pace. We\'ve got this.',
```
**After:**
```javascript
text: "Canopy: Don't you worry about getting hurt, My Lord. I'll be right here to patch you up. Just... try not to be too reckless, okay? I couldn't bear it if something happened to you.",
```

### Mood Dialogue (`mood`)
**Before:**
```javascript
text: 'Canopy: My Lord, I\'m okay. The leaves whisper good omens today. If you need to rest, say the word.',
```
**After:**
```javascript
text: "Canopy: I'm... I'm doing really well, My Lord. As long as I'm with you, I feel safe. And the path ahead feels a little brighter.",
```

### Sister Dialogue (`sister_chat_more`)
**Before:**
```javascript
text: "Canopy: A reed-stitched ribbon at her wrist, and a laugh that doesn't apologize. If you see either… call me. Please.",
```
**After:**
```javascript
text: "Canopy: She has a reed-stitched ribbon... and a laugh that fills the whole forest. Finding her is everything to me. Thank you for helping me look, My Lord. It... it means more than I can say.",
```

### High Affinity Bonding (`bond6c`)
**Before:**
```javascript
text: "Canopy: If you walk beside me, I'll stop mistaking shadows for her. And if you hold still a moment longer, I might mistake you for a reason to smile.",
```
**After:**
```javascript
text: "Canopy: When you walk beside me, the shadows don't seem so frightening. It's... nice. It feels like I have more than one reason to keep fighting. Thank you for being my reason to smile, My Lord.",
```

### Max Affinity Bonding (`bond10`)
**Before:**
```javascript
text: "Canopy: If you fall, I won't leave you. That's my promise. Breathe with me. In. Out.",
```
**After:**
```javascript
text: "Canopy: If you fall, I won't leave your side. Ever. That's my promise to you, My Lord. My heart... it breathes with yours. In... and out.",
```

---

## Yorna (Aggressive Suitor)

### Combat Style (`style`)
**Before:**
```javascript
text: "Yorna: Chief, my strategy is to hit first and hit hard. If you clear a path for me, I'll take down any enemy in the way.",
```
**After:**
```javascript
text: "Yorna: My style? I hit hard and fast so you don't have to. Keep your eyes on me, Chief. You won't be disappointed.",
```

### High Affinity Bonding (`bond10`)
**Before:**
```javascript
text: "Yorna: If a wall shows up, we go through it. If I slow, you push me. Deal?",
```
**After:**
```javascript
text: "Yorna: If you're with me, no wall is too thick. If I ever hesitate... it's because I'm worried about you, not the enemy. So push me. I need it. Deal?",
```

### New Rivalry Dialogue
*(This adds a new choice to Yorna's `bond_menu` and a new dialogue node).*
**In `bond_menu` choices, add:**
```javascript
{ label: 'My Vanguard', requires: { partyHas: ['canopy', 'hola'] }, next: 'rivalry' },
```
**New node to add:**
```javascript
rivalry: {
  text: 'Yorna: Don\'t worry about them, Chief. The others can hang back and... \'support\'. I\'m the only vanguard you\'ll need.',
  choices: [ { label: 'Back', next: 'bond_menu' } ],
},
```

---

## Hola (Shy Admirer)

### Introduction (`root`)
**Before:**
```javascript
text: 'Hola: My Lord, I… I\'ll try my best. Please tell me what to do.',
```
**After:**
```javascript
text: 'Hola: Oh! My Lord! I... I\'ll do my best. As long as I\'m near you, I feel... a little braver.',
```

### Magic Explanation (`magic`)
**Before:**
```javascript
text: 'Hola: My Lord, I can create a small light, and... gently push the air with my magic. I\'m still learning, but I\'ll do my best not to let you down.',
```
**After:**
```javascript
text: 'Hola: I can... I can make a light. To light your way! And I can... push the air... to keep enemies away from you. I\'ll make sure I get it right for you, My Lord!',
```

### Mid Affinity Bonding (`bond6`)
**Before:**
```javascript
text: "Hola: If I know where to stand, I don't shake as much. So… tell me where.",
```
**After:**
```javascript
text: "Hola: Just... tell me to stand close to you, My Lord. When I'm near you, my hands don't shake so much. It's... calming.",
```

### High Affinity Bonding (`bond10`)
*(This replaces the existing `bond10` node with a more romantic one).*
**Before:**
```javascript
text: "Hola: If you walk, I'll walk. If you run, I'll try. I won't leave.",
```
**After:**
```javascript
text: "Hola: My Lord... before I met you, I was always running. But when I'm with you, I feel like I can stand my ground against anything. You make me brave.",
```

### New Insecurity Dialogue
*(This adds a new choice to Hola's `bond_menu` and a new dialogue node).*
**In `bond_menu` choices, add:**
```javascript
{ label: 'Am I useful?', requires: { partyHas: ['yorna', 'twil'] }, next: 'insecurity' },
```
**New node to add:**
```javascript
insecurity: {
  text: 'Hola: (In a small voice) Yorna is so strong... and Twil is so fast. I hope... I hope I\'m still useful to you, My Lord.',
  choices: [ { label: 'You are.', action: 'affinity_add', data: { target: 'active', amount: 0.3 }, next: 'bond_menu' } ],
},
```

---
## Urn & Varabella (Found Sisterhood)

*(This adds two new companion dialogue objects to the main `companionDialogs` export).*

```javascript
  urn: {
    start: 'root',
    nodes: {
      root: {
        text: 'It looks bleak, I know, but every light we kindle makes the shadows smaller. We can do this, Mister.',
        choices: [
          { label: 'About Varabella', next: 'on_vara', requires: { partyHas: ['varabella'] } },
          { label: 'That\'s a nice thought.', next: 'root' },
        ],
      },
      on_vara: {
        text: 'Don\'t let Vara\'s sharp edges fool you. She\'s the reason we\'ve both made it this far, Mister. She\'s my sister, in all the ways that count.',
        choices: [ { label: 'Back', next: 'root' } ],
      },
    },
  },
  varabella: {
    start: 'root',
    nodes: {
      root: {
        text: 'The objective is to survive and advance. Everything else is a distraction, Boss man. You lead, I\'ll watch the angles.',
        choices: [
          { label: 'About Urn', next: 'on_urn', requires: { partyHas: ['urn'] } },
          { label: 'Banter', next: 'banter_urn', requires: { partyHas: ['urn'] } },
          { label: 'Got it.', next: 'root' },
        ],
      },
      on_urn: {
        text: 'Urn keeps our spirits up. That\'s a tactical advantage, and it\'s my job to make sure she has something to be optimistic about. Keep her safe, Boss man.',
        choices: [ { label: 'Back', next: 'root' } ],
      },
      banter_urn: {
        text: 'We make a good team, don\'t we, Vara? You find the path...', 
        portrait: 'assets/portraits/level04/UrnVarabella/Urn Varabella.mp4',
        choices: [ { label: '...', next: 'banter_vara' } ],
      },
      banter_vara: {
        text: '...and you make sure we don\'t lose our way on it. Now focus up. Hostiles, 40 meters.',
        portrait: 'assets/portraits/level04/UrnVarabella/Urn Varabella.mp4',
        choices: [ { label: 'Back', next: 'root' } ],
      },
    },
  },
```
