# Notes for Yorna's Quest to Find Hola

This document outlines the changes needed to implement a new quest for Yorna to find Hola on level 1.

## 1. Modify `src/data/companion_dialogs.js`

Add the following to the `yorna` dialog tree in the `companionDialogs` object.

### Add to `yorna.nodes.root.choices`

Add this choice to the `choices` array in the `root` node of `yorna`'s dialog tree. This will be the entry point for the quest.

```javascript
{
  label: 'Find the nervous girl',
  requires: { partyMissing: 'hola', missingFlag: 'yorna_find_hola_started' },
  next: 'find_hola_intro'
},
```

### Add new nodes to `yorna.nodes`

Add these new nodes to the `nodes` object for `yorna`.

```javascript
      find_hola_intro: {
        text: 'Yorna: I saw a nervous-looking girl in the woods trying to cast spells, but I had to fight some bandits and lost sight of her. I want to go with you to see if the girl is okay.',
        choices: [
          { label: 'Let\'s find her.', action: 'start_quest', data: { id: 'yorna_find_hola' }, next: 'find_hola_started' },
          { label: 'Later.', action: 'companion_back' },
        ]
      },
      find_hola_started: {
        text: 'Yorna: Good. Let\'s go. I want to make sure she\'s safe.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
```

## 2. Modify `src/engine/dialog.js`

The following changes are needed to handle the quest logic.

### Add to `handleStartQuest` function

Add this `else if` block to the `handleStartQuest` function to handle the start of the `yorna_find_hola` quest. This will attach a quest marker to the Hola NPC.

```javascript
    } else if (id === 'yorna_find_hola') {
      // Level 1 Yorna quest: point to Hola's location; quest clears on recruiting Hola
      try {
        // Find Hola NPC and attach a quest marker
        for (const n of npcs) {
          const nm = String(n?.name || '').toLowerCase();
          if (nm.includes('hola')) { n.questId = 'yorna_find_hola'; break; }
        }
      } catch {}
      try { showBanner('Quest started: Find the nervous girl — Talk to her'); } catch {}
```

### Add to `selectChoice` function

Inside the `selectChoice` function, within the `join_party` and `replace_companion` action handlers, there is a block of code that handles the completion of the `hola_find_yorna` quest. A similar block should be added for `yorna_find_hola`.

When Hola is recruited, this code will check if the `yorna_find_hola_started` flag is set, and if so, it will set the `yorna_find_hola_cleared` flag and trigger the auto-turn-in mechanism.

```javascript
        if (nm.includes('hola')) {
          if (!runtime.questFlags) runtime.questFlags = {};
          if (runtime.questFlags['yorna_find_hola_started'] && !runtime.questFlags['yorna_find_hola_cleared']) {
            runtime.questFlags['yorna_find_hola_cleared'] = true;
            import('./quests.js').then(q => q.autoTurnInIfCleared && q.autoTurnInIfCleared('yorna_find_hola')).catch(()=>{});
          }
        }
```

This logic should be added alongside the existing logic for the `hola_find_yorna` quest completion.

```
