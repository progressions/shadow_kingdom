// Editable companion dialog trees. Keyed by lowercase companion name.
// Structure:
// {
//   <key>: {
//     start: 'root',
//     nodes: {
//       root: { text: '...', choices: [ { label, next|action } ] },
//       ...
//     }
//   }
// }

export const companionDialogs = {
  canopy: {
    start: 'root',
    nodes: {
      root: {
        text: "Canopy: I'll watch over everyone. Tell me where it hurts, okay?",
        choices: [
          { label: 'Can you watch over us?', next: 'support' },
          { label: 'How are you holding up?', next: 'mood' },
          { label: 'Bond', next: 'bond_menu' },
          { label: 'Quests', next: 'quests' },
          { label: 'Back to companions', action: 'companion_back' },
        ],
      },
      bond_menu: {
        text: 'Canopy: Breathe. Then tell me what you need.',
        choices: [
          { label: 'Open up (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Share a memory (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Promise me (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          { label: 'Back', next: 'root' },
        ],
      },
      bond6: {
        text: "Canopy: I worry about the quiet ones most. You included. If you can't rest, I'll sit with you until you can.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      bond8: {
        text: "Canopy: When I was small, I stopped a bleeding with willow bark and pressure. It wasn't the bark—it was not giving up.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      bond10: {
        text: "Canopy: If you fall, I won't leave you. That's my promise. Breathe with me. In. Out.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      quests: {
        text: 'Canopy: We can help those in need.',
        choices: [
          { label: 'Breath and Bandages', requires: { flag: 'canopy_triage_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Breath and Bandages', requires: { flag: 'canopy_triage_cleared' }, next: 'quest_turnin' },
          { label: 'Back', next: 'root' },
        ],
      },
      support: {
        text: 'Canopy: I\'ll keep an eye on scrapes and spirits. Breathe, drink water, and keep a steady pace. We\'ve got this.',
        choices: [
          { label: 'Back', action: 'companion_back' },
        ],
      },
      mood: {
        text: 'Canopy: I\'m okay. The leaves whisper good omens today. If you need to rest, say the word.',
        choices: [
          { label: 'Back', action: 'companion_back' },
        ],
      },
      quest_intro: {
        text: 'Canopy: Three cry out first. If we clear the snare, the rest may breathe easier.',
        choices: [
          { label: 'Point me to them.', action: 'start_quest', data: { id: 'canopy_triage' }, next: 'quest_started' },
          { label: 'Later.', action: 'companion_back' },
        ],
      },
      quest_started: {
        text: 'Canopy: I\'ll follow—steady pace. We\'ll keep them safe.',
        choices: [ { label: 'Back', action: 'companion_back' } ],
      },
      quest_turnin: {
        text: 'Canopy: Good. Their breathing eased. Thank you.',
        choices: [ { label: 'You did well.', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'canopy_triage_reward' }, next: 'quest_done' } ],
      },
      quest_done: {
        text: 'Canopy: We move again when you\'re ready.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'canopy_triage_done' } } ],
      },
    },
  },
  yorna: {
    start: 'root',
    nodes: {
      root: {
        text: 'Yorna: Need steel or sarcasm? I\'ve got both.',
        choices: [
          { label: 'What\'s your style?', next: 'style' },
          { label: 'Everything alright?', next: 'mood' },
          { label: 'Bond', next: 'bond_menu' },
          { label: 'Quests', next: 'quests' },
          { label: 'Back to companions', action: 'companion_back' },
        ],
      },
      bond_menu: {
        text: "Yorna: If you want my respect, earn it. You're halfway there.",
        choices: [
          { label: 'Trade tells (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Strategy talk (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Stand with me (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          { label: 'Back', next: 'root' },
        ],
      },
      bond6: {
        text: "Yorna: Watch the shoulder. Everyone telegraphs. Even me—if you look close.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      bond8: {
        text: "Yorna: I don't hit hard for fun. I hit hard because it keeps you moving. That's the whole point.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      bond10: {
        text: "Yorna: If a wall shows up, we go through it. If I slow, you push me. Deal?",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      quests: {
        text: 'Yorna: Let\'s cut the knot.',
        choices: [
          { label: 'Cut the Knot', requires: { flag: 'yorna_knot_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Cut the Knot', requires: { flag: 'yorna_knot_cleared' }, next: 'quest_turnin' },
          { label: 'Back', next: 'root' },
        ],
      },
      style: {
        text: 'Yorna: I hit first and I hit hard. Keep the lane open and I\'ll bulldoze the problem.',
        choices: [ { label: 'Back', action: 'companion_back' } ],
      },
      mood: {
        text: 'Yorna: Never better. If trouble wants a dance, I\'ll lead.',
        choices: [ { label: 'Back', action: 'companion_back' } ],
      },
      quest_intro: {
        text: 'Yorna: There\'s a pair of sneaks setting ambushes. We cut them, we cut the knot.',
        choices: [
          { label: 'Let\'s do it.', action: 'start_quest', data: { id: 'yorna_knot' }, next: 'quest_started' },
          { label: 'Another time.', action: 'companion_back' },
        ],
      },
      quest_started: {
        text: 'Yorna: Two targets. I\'ll mark the lanes—move fast.',
        choices: [ { label: 'Back', action: 'companion_back' } ],
      },
      quest_turnin: {
        text: 'Yorna: Clean cuts. Ambushes will falter for a while.',
        choices: [
          { label: 'Good work.', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'yorna_knot_reward' }, next: 'quest_done' },
        ],
      },
      quest_done: {
        text: 'Yorna: On to the next knot.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'yorna_knot_done' } } ],
      },
    },
  },
  hola: {
    start: 'root',
    nodes: {
      root: {
        text: 'Hola: I… I\'ll try my best. Please tell me what to do.',
        choices: [
          { label: 'What magic do you know?', next: 'magic' },
          { label: 'How\'s the journey?', next: 'mood' },
          { label: 'Bond', next: 'bond_menu' },
          { label: 'Quests', next: 'quests' },
          { label: 'Back to companions', action: 'companion_back' },
        ],
      },
      bond_menu: {
        text: 'Hola: I can… share. If you want.',
        choices: [
          { label: 'Small steps (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Speak up (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Stand firm (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          { label: 'Back', next: 'root' },
        ],
      },
      bond6: {
        text: "Hola: If I know where to stand, I don't shake as much. So… tell me where.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      bond8: {
        text: "Hola: I said 'no' to a sorcerer once. My voice squeaked. He listened anyway.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      bond10: {
        text: "Hola: If you walk, I'll walk. If you run, I'll try. I won't leave.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      quests: {
        text: 'Hola: I can practice… if you stay close.',
        choices: [
          { label: 'Find Her Voice', requires: { flag: 'hola_practice_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Find Her Voice', requires: { flag: 'hola_practice_cleared' }, next: 'quest_turnin' },
          { label: 'Back', next: 'root' },
        ],
      },
      magic: {
        text: 'Hola: I can kindle a small light and… nudge the wind. I\'m still learning, but I won\'t let you down.',
        choices: [ { label: 'Back', action: 'companion_back' } ],
      },
      mood: {
        text: 'Hola: Nervous… but safer with you here.',
        choices: [ { label: 'Back', action: 'companion_back' } ],
      },
      quest_intro: {
        text: 'Hola: If I… if I try, I can push them back. Maybe twice?',
        choices: [
          { label: 'Let\'s practice.', action: 'start_quest', data: { id: 'hola_practice' }, next: 'quest_started' },
          { label: 'Later.', action: 'companion_back' },
        ],
      },
      quest_started: {
        text: 'Hola: I\'ll try to keep the wind steady. Please stay close.',
        choices: [ { label: 'Back', action: 'companion_back' } ],
      },
      quest_turnin: {
        text: 'Hola: I… did it. Thank you for waiting for me.',
        choices: [ { label: 'Proud of you.', action: 'affinity_add', data: { target: 'active', amount: 0.7, flag: 'hola_practice_reward' }, next: 'quest_done' } ],
      },
      quest_done: {
        text: 'Hola: I\'ll keep trying.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'hola_practice_done' } } ],
      },
    },
  },
  oyin: {
    start: 'root',
    nodes: {
      root: {
        text: 'Oyin: I can practice… if you have time.',
        choices: [
          { label: 'Bond', next: 'bond_menu' },
          { label: 'Quests', next: 'quests' },
          { label: 'Back to companions', action: 'companion_back' },
        ],
      },
      bond_menu: {
        text: 'Oyin: I want to be braver than I am.',
        choices: [
          { label: 'A spark (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Tinder and air (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Firelight (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          { label: 'Back', next: 'root' },
        ],
      },
      bond6: {
        text: "Oyin: If I say I'm scared, will you… be patient with me?",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      bond8: {
        text: "Oyin: I practiced until my hands stopped shaking. They still do sometimes. But less.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      bond10: {
        text: "Oyin: If you keep walking, I can be brave. I can match you.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      quests: {
        text: 'Oyin: I can try the spark tactics.',
        choices: [
          { label: 'Light the Fuse', requires: { flag: 'oyin_fuse_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Light the Fuse', requires: { flag: 'oyin_fuse_cleared' }, next: 'quest_turnin' },
          { label: 'Back', next: 'root' },
        ],
      },
      quest_intro: {
        text: 'Oyin: Ignite three of them and… if I can, rally you when it matters.',
        choices: [ { label: 'Let\'s try.', action: 'start_quest', data: { id: 'oyin_fuse' }, next: 'quest_started' }, { label: 'Later.', action: 'companion_back' } ],
      },
      quest_started: {
        text: 'Oyin: I\'ll watch you and keep the tinder ready.',
        choices: [ { label: 'Back', action: 'companion_back' } ],
      },
      quest_turnin: {
        text: 'Oyin: It worked! I can do it again next time.',
        choices: [ { label: 'Well done.', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'oyin_fuse_reward' }, next: 'quest_done' } ],
      },
      quest_done: {
        text: 'Oyin: Thank you for trusting me.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'oyin_fuse_done' } } ],
      },
    },
  },
  twil: {
    start: 'root',
    nodes: {
      root: {
        text: 'Twil: Want to race trouble to the end of a footprint?',
        choices: [
          { label: 'Bond', next: 'bond_menu' },
          { label: 'Quests', next: 'quests' },
          { label: 'Back to companions', action: 'companion_back' },
        ],
      },
      bond_menu: {
        text: "Twil: You're not slow. Not today.",
        choices: [
          { label: 'Footwork (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Shortcuts (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Same stride (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          { label: 'Back', next: 'root' },
        ],
      },
      bond6: {
        text: "Twil: See that gap? That's where we cut.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      bond8: {
        text: "Twil: People look at the ground. I look at the wind.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      bond10: {
        text: "Twil: If you run, I'll run. If you stop, I'll stand.",
        choices: [ { label: 'Back', next: 'bond_menu' } ],
      },
      quests: {
        text: 'Twil: Keep up.',
        choices: [
          { label: 'Trace the Footprints', requires: { flag: 'twil_trace_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Trace the Footprints', requires: { flag: 'twil_trace_cleared' }, next: 'quest_turnin' },
          { label: 'Back', next: 'root' },
        ],
      },
      quest_intro: {
        text: 'Twil: Three shadows ahead. Catch them, and we\'ll be faster than they are.',
        choices: [ { label: 'Let\'s hunt.', action: 'start_quest', data: { id: 'twil_trace' }, next: 'quest_started' }, { label: 'Later.', action: 'companion_back' } ],
      },
      quest_started: {
        text: 'Twil: Keep up. I\'ll point the gaps.',
        choices: [ { label: 'Back', action: 'companion_back' } ],
      },
      quest_turnin: {
        text: 'Twil: See? Faster.',
        choices: [ { label: 'Nice work.', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'twil_trace_reward' }, next: 'quest_done' } ],
      },
      quest_done: {
        text: 'Twil: On to the next trace.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'twil_trace_done' } } ],
      },
    },
  },
};
