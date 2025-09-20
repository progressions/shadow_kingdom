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
        text: "Canopy: My Lord, please be careful out there. I'll be right behind you... watching over you. Tell me if you get even the smallest scratch, okay?",
        choices: [
          { label: 'Can you watch over us?', next: 'support' },
          { label: 'How are you holding up?', next: 'mood' },
          { label: 'Tell me about your sister.', requires: { missingFlag: 'canopy_sister_promise_done' }, next: 'sister_promise_intro' },
          // Bond entries (show only when available)
          { label: 'Open up', requires: { target: 'active', min: 6.0 }, next: 'bond6a' },
          { label: 'Share a memory (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Promise me (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          // Quest entries (appear inline)
          { label: 'Breath and Bandages', requires: { flag: 'canopy_triage_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Breath and Bandages', requires: { flag: 'canopy_triage_cleared', missingFlag: 'canopy_triage_done' }, next: 'quest_turnin' },
          // Level 2 storyline
          { label: 'Ribbon in the Dust (L2)', requires: { level: 2, flag: 'canopy_sister2_started', not: true }, next: 'sister_l2_intro' },
          { label: 'Turn in: Ribbon in the Dust', requires: { flag: 'canopy_sister2_cleared', missingFlag: 'canopy_sister2_done' }, next: 'sister_l2_turnin' },
          // Level 3 storyline
          { label: 'Reeds and Echoes (L3)', requires: { level: 3, flag: 'canopy_sister3_started', not: true }, next: 'sister_l3_intro' },
          { label: 'Turn in: Reeds and Echoes', requires: { flag: 'canopy_sister3_cleared', missingFlag: 'canopy_sister3_done' }, next: 'sister_l3_turnin' },
          // Fetch/Deliver example (Level 2): Return the Ribbon
          { label: 'Return the Ribbon (L2)', requires: { level: 2, flag: 'canopy_fetch_ribbon_started', not: true }, next: 'fetch_ribbon_intro' },
          { label: 'Turn in: Return the Ribbon', requires: { flag: 'canopy_fetch_ribbon_cleared', missingFlag: 'canopy_fetch_ribbon_done' }, next: 'fetch_ribbon_turnin' },
          // Level 4: Ruined City quest
          { label: 'Stitch the Streets (L4)', requires: { level: 4, flag: 'canopy_streets4_started', not: true }, next: 'streets_l4_intro' },
          { label: 'Turn in: Stitch the Streets', requires: { flag: 'canopy_streets4_cleared', missingFlag: 'canopy_streets4_done' }, next: 'streets_l4_turnin' },
          { label: 'Back to companions', action: 'companion_back' },
        ]
      },
      bond_menu: {
        text: 'Canopy: My Lord, breathe. Then tell me what you need.',
        choices: [
          { label: 'Open up', requires: { target: 'active', min: 6.0 }, next: 'bond6a' },
          { label: 'Share a memory (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Promise me (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          { label: 'Mediate: Hold and Push', requires: { partyHas: 'yorna', missingFlag: 'canopy_yorna_respect' }, next: 'mediate_yorna_intro' },
          { label: 'After hold and push', requires: { partyHas: 'yorna', hasFlag: 'canopy_yorna_respect' }, next: 'ack_yorna_c' },
          { label: 'Back', next: 'root' },
        ]
      },
      bond6a: {
        text: "Canopy: I keep to the woods when I can. Quieter there. I follow scraps—frayed ribbon ends, a boot-heel trace—anything that might be my sister. I can find the clues, but… keeping at it alone is hard.",
        choices: [ { label: 'Continue', next: 'bond6b' } ]
      },
      bond6b: {
        text: "Canopy: Ell is stubborn. She learned to stitch reeds so they wouldn't split, and she taught me to stay calm when things get overwhelming. If I see that stitch again, I won't hesitate. Not this time.",
        choices: [ { label: 'Continue', next: 'bond6c' } ]
      },
      bond6c: {
        text: "Canopy: When you walk beside me, the shadows don't seem so frightening. It's... nice. It feels like I have more than one reason to keep fighting. Thank you for being my reason to smile, My Lord.",
        choices: [ { label: 'Thanks', action: 'affinity_add', data: { target: 'active', amount: 0.2, flag: 'canopy_bond6c_reward' }, next: 'bond_menu' } ]
      },
      bond8: {
        text: "Canopy: When I was small, I stopped a bleeding with willow bark and pressure. It wasn't the bark—it was not giving up.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      bond10: {
        text: "Canopy: If you fall, I won\'t leave your side. Ever. That\'s my promise to you, My Lord. My heart... it breathes with yours. In... and out.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      quests: {
        text: 'Canopy: My Lord, we can help those in need.',
        choices: [
          { label: 'Breath and Bandages', requires: { flag: 'canopy_triage_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Breath and Bandages', requires: { flag: 'canopy_triage_cleared', missingFlag: 'canopy_triage_done' }, next: 'quest_turnin' },
          { label: 'Back', next: 'root' },
        ]
      },
      support: {
        text: "Canopy: Don't you worry about getting hurt, My Lord. I'll be right here to patch you up. Just... try not to be too reckless, okay? I couldn't bear it if something happened to you.",
        choices: [
          { label: 'Back', action: 'companion_back' },
        ]
      },
      mood: {
        text: "Canopy: I'm... I'm doing really well, My Lord. As long as I'm with you, I feel safe. And the path ahead feels a little brighter.",
        choices: [
          { label: 'Back', action: 'companion_back' },
        ]
      },
      sister_promise_intro: {
        text: "Canopy: Ell is still out there. I keep seeing her ribbon in the crowds. Every time it isn’t her, it feels like slipping on the same stone twice.",
        choices: [
          { label: 'We\'ll take the search slow.', action: 'start_quest', data: { id: 'canopy_sister_promise' }, next: 'sister_promise_steps' },
          { label: 'If you lead, I\'ll follow.', action: 'start_quest', data: { id: 'canopy_sister_promise' }, next: 'sister_promise_follow' },
          { label: 'Maybe later.', action: 'companion_back' },
        ]
      },
      sister_promise_steps: {
        text: "Canopy: Slow… I can do slow. I just need to keep breathing. Five counts in, five counts out. Ell used to tap my shoulder when I rushed.",
        choices: [
          { label: 'Tell me more about her.', next: 'sister_promise_more' },
        ]
      },
      sister_promise_follow: {
        text: "Canopy: I will. I won\'t lose the thread this time. If you stay at my side, the shadows feel thinner.",
        choices: [
          { label: 'Keep talking to me.', next: 'sister_promise_more' },
        ]
      },
      sister_promise_more: {
        text: "Canopy: She stitched reeds so they wouldn\'t split. Taught me to look for the quiet signs—the nicks in bark, the missing moss. If I find those again… she has to be close.",
        choices: [
          { label: 'We\'ll find her together.', action: 'affinity_add', data: { target: 'active', amount: 0.6, flag: 'canopy_aff_sister_promise', questFlag: 'canopy_sister_promise_done' }, next: 'sister_promise_close' },
          { label: 'We owe her calm steps.', action: 'affinity_add', data: { target: 'active', amount: 0.4, flag: 'canopy_aff_sister_calm', questFlag: 'canopy_sister_promise_done' }, next: 'sister_promise_close' },
        ]
      },
      sister_promise_close: {
        text: "Canopy: Thank you, My Lord. Breathing feels easier when you say it out loud. I\'ll hold to that promise.",
        choices: [ { label: 'Stay close.', next: 'root' } ]
      },
      quest_intro: {
        text: 'Canopy: My Lord, there are three hostiles nearby. If we deal with them, it will be safer for everyone.',
        choices: [
          { label: 'Point me to them.', action: 'start_quest', data: { id: 'canopy_triage' }, next: 'quest_started' },
          { label: 'Later.', action: 'companion_back' },
        ]
      },
      quest_started: {
        text: 'Canopy: My Lord, I\'ll follow—steady pace. We\'ll keep them safe.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      quest_turnin: {
        text: 'Canopy: My Lord, good. Their breathing eased. Thank you.',
        choices: [ { label: 'You did well.', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'canopy_triage_reward' }, next: 'quest_done' } ]
      },
      quest_done: {
        text: 'Canopy: My Lord, we move again when you\'re ready.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'canopy_triage_done' }, next: 'root' } ]
      },

      // Level 2: Sister clue — defeat scouts
      sister_l2_intro: {
        text: "Canopy: The scouts here use reed-stitched cords—that's how Ell used to stitch. We need to defeat three of their patrols and look for a ribbon.",
        choices: [
          { label: 'Let\'s hunt them down.', action: 'start_quest', data: { id: 'canopy_sister2' }, next: 'sister_l2_started' },
          { label: 'Later.', next: 'root' },
        ]
      },
      sister_l2_started: {
        text: "Canopy: Three patrols. If you see the ribbon first, shout. I won't miss it this time.",
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      sister_l2_turnin: {
        text: "Canopy: This… it's her stitch. Not hers, but her hands taught it. We're closer.",
        choices: [ { label: 'We\'ll follow it.', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'canopy_sister2_reward' }, next: 'sister_l2_done' } ]
      },
      sister_l2_done: {
        text: 'Canopy: My Lord, thank you. I can breathe again. For a while.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'canopy_sister2_done' }, next: 'root' } ]
      },

      // Level 3: Marsh whisperers — defeat to orient the trail
      sister_l3_intro: {
        text: "Canopy: The Marsh Whisperers in this area are disorienting. If we defeat three of them, it should be easier to get our bearings.",
        choices: [
          { label: 'Silence three whispers.', action: 'start_quest', data: { id: 'canopy_sister3' }, next: 'sister_l3_started' },
          { label: 'Later.', next: 'root' },
        ]
      },
      sister_l3_started: {
        text: "Canopy: Stay near. If the wind says Ell, I don't want to miss it.",
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      sister_l3_turnin: {
        text: "Canopy: After we defeated them, I noticed the reeds were all bent towards the east. If Urathar's forces took her, they must have gone that way.",
        choices: [ { label: 'We go together.', action: 'affinity_add', data: { target: 'active', amount: 1.2, flag: 'canopy_sister3_reward' }, next: 'sister_l3_done' } ]
      },
      sister_l3_done: {
        text: 'Canopy: My Lord, whatever is under Urathar\'s command, I won\'t let it harm her. Or you.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'canopy_sister3_done' }, next: 'root' } ]
      },

      // Level 4: Stitch the Streets — defeat three street bleeders
      streets_l4_intro: {
        text: 'Canopy: My Lord, these streets are dangerous. There are three areas controlled by hostiles. If we clear them out, people can pass.',
        choices: [
          { label: 'Let\'s clear the streets.', action: 'start_quest', data: { id: 'canopy_streets4' }, next: 'streets_l4_started' },
          { label: 'Later.', next: 'root' },
        ]
      },
      streets_l4_started: {
        text: 'Canopy: My Lord, I\'ll keep pressure. You make space.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      streets_l4_turnin: {
        text: 'Canopy: My Lord, it\'s quieter. Breathe. We did good.',
        choices: [ { label: 'We did.', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'canopy_streets4_reward' }, next: 'streets_l4_done' } ]
      },
      streets_l4_done: {
        text: "Canopy: My Lord, I'll keep doing what I can to help the people here.",
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'canopy_streets4_done' }, next: 'root' } ]
      },

      // Fetch/Deliver: Return the Ribbon (find item, deliver to pedestal)
      fetch_ribbon_intro: {
        text: "Canopy: There was a ribbon she wore when the reeds bent right. If we find it, place it on the old pedestal in the ruins.",
        choices: [
          { label: 'We\'ll return it.', action: 'start_quest', data: { id: 'canopy_fetch_ribbon' }, next: 'fetch_ribbon_started' },
          { label: 'Later.', next: 'root' },
        ]
      },
      fetch_ribbon_started: {
        text: "Canopy: If you pick it up, I'll show you where to set it.",
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      fetch_ribbon_turnin: {
        text: "Canopy: You placed it. The stitch is right. Thank you.",
        choices: [ { label: 'Breathe easy.', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'canopy_fetch_ribbon_reward' }, next: 'fetch_ribbon_done' } ]
      },
      fetch_ribbon_done: {
        text: 'Canopy: My Lord, we\'re not done looking. But this helps.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'canopy_fetch_ribbon_done' }, next: 'root' } ]
      },

      // Mediate: Canopy and Yorna (hold and push)
      mediate_yorna_intro: {
        text: '(You name the tension: Canopy needs space to heal; Yorna wants to drive. You set a simple rule so both can work.)\nCanopy: I need a moment to prepare. Give me five counts. On the sixth, you can attack. I\'ll be ready to support you.',
        choices: [ { label: 'Continue', next: 'mediate_yorna_b' } ]
      },
      mediate_yorna_b: {
        text: 'Yorna: Chief, on six. I won\'t waste it.',
        choices: [ { label: 'Continue', next: 'mediate_yorna_c' } ]
      },
      mediate_yorna_c: {
        text: 'Canopy: My Lord, in. Out. One. Two. Three. Four. Five.',
        choices: [ { label: 'Deal', action: 'affinity_add', data: { target: 'active', amount: 0.2, flag: 'canopy_yorna_respect_reward_canopy' }, next: 'mediate_yorna_apply_yorna' } ]
      },
      mediate_yorna_apply_yorna: {
        text: 'Yorna: Chief, six.',
        choices: [ { label: 'Thanks', action: 'affinity_add', data: { target: 'yorna', amount: 0.2, flag: 'canopy_yorna_respect_reward_yorna' }, next: 'mediate_yorna_done' } ]
      },
      mediate_yorna_done: {
        text: 'Canopy: My Lord, then we understand each other.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'canopy_yorna_respect' }, next: 'bond_menu' } ]
      },
      // Post-truce acknowledgement (Canopy ↔ Yorna)
      ack_yorna_c: {
        text: 'Canopy: My Lord, five breaths for me. Six for her. We can work with that.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
    },
  },
  yorna: {
    start: 'root',
    nodes: {
      root: {
        text: 'Yorna: Chief, need steel or sarcasm? I\'ve got both.',
        choices: [
          { label: 'What\'s your style?', next: 'style' },
          { label: 'Everything alright?', next: 'mood' },
          { label: 'Kill Vast (L1)', requires: { flag: 'yorna_vast_started', not: true }, next: 'vast_intro' },
          { label: 'Turn in: Kill Vast', requires: { flag: 'yorna_vast_cleared', missingFlag: 'yorna_vast_done' }, next: 'vast_turnin' },
          { label: 'Find the nervous girl', requires: { partyMissing: 'hola', missingFlag: 'yorna_find_hola_started' }, next: 'find_hola_intro' },
          // Bond entries
          { label: 'Open space', requires: { target: 'active', min: 6.0 }, next: 'bond6a' },
          { label: 'Strategy talk (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Stand with me (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          // Quest entries
          { label: 'Cut the Knot', requires: { flag: 'yorna_knot_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Cut the Knot', requires: { flag: 'yorna_knot_cleared', missingFlag: 'yorna_knot_done' }, next: 'quest_turnin' },
          { label: 'Shatter the Ring (L2)', requires: { level: 2, flag: 'yorna_ring_started', not: true }, next: 'ring_intro' },
          { label: 'Turn in: Shatter the Ring', requires: { flag: 'yorna_ring_cleared', missingFlag: 'yorna_ring_done' }, next: 'ring_turnin' },
          { label: 'Hold the Causeway (L3)', requires: { level: 3, flag: 'yorna_causeway_started', not: true }, next: 'causeway_intro' },
          { label: 'Turn in: Hold the Causeway', requires: { flag: 'yorna_causeway_cleared', missingFlag: 'yorna_causeway_done' }, next: 'causeway_turnin' },
          { label: 'Back to companions', action: 'companion_back' },
        ]
      },
      vast_intro: {
        text: "Yorna: First job: kill Vast in the castle to the southeast. The gate's locked; Gorg has the brass key outside the northeast wall.",
        choices: [
          { label: 'Let\'s go kill her.', action: 'start_quest', data: { id: 'yorna_vast' }, next: 'vast_started' },
          { label: 'Later.', next: 'root' },
        ]
      },
      vast_started: {
        text: "Yorna: Stay with me, Chief. We get the key from Gorg, open the gate, and then we kill Vast.",
        choices: [ { label: 'Back', next: 'root' } ]
      },
      vast_turnin: {
        text: 'Yorna: Vast is dead. Good. One less problem for the valley. What\'s next, Chief?',
        choices: [ { label: 'Good work.', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'yorna_vast_reward' }, next: 'vast_done' } ]
      },
      vast_done: {
        text: 'Yorna: Onward, Chief.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'yorna_vast_done' }, next: 'root' } ]
      },
      // L1: Find Hola (auto-turn-in on recruiting Hola)
      find_hola_intro: {
        text: 'Yorna: I saw a nervous-looking girl in the woods trying to cast spells, but I had to fight some bandits and lost sight of her. I want to go with you to see if the girl is okay.',
        choices: [
          { label: "Let's find her.", action: 'start_quest', data: { id: 'yorna_find_hola' }, next: 'find_hola_started' },
          { label: 'Later.', action: 'companion_back' },
        ]
      },
      find_hola_started: {
        text: 'Yorna: Good. Let\'s go. I want to make sure she\'s safe.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      bond_menu: {
        text: "Yorna: If you want my respect, earn it. You're halfway there.",
        choices: [
          { label: 'Open space', requires: { target: 'active', min: 6.0 }, next: 'bond6a' },
          { label: 'Strategy talk (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Stand with me (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          { label: 'My Vanguard', requires: { partyHas: ['canopy', 'hola'] }, next: 'rivalry' },
          { label: 'About Oyin…', requires: { partyHas: 'oyin', missingFlag: 'yorna_oyin_truce' }, next: 'hint_oyin_y' },
          { label: 'About Canopy…', requires: { partyHas: 'canopy', missingFlag: 'canopy_yorna_respect' }, next: 'hint_canopy_y' },
          { label: 'On three.', requires: { partyHas: 'oyin', hasFlag: 'yorna_oyin_truce' }, next: 'ack_oyin_y' },
          { label: 'Five and six.', requires: { partyHas: 'canopy', hasFlag: 'canopy_yorna_respect' }, next: 'ack_canopy_y' },
          { label: 'Twil reads the wind', requires: { partyHas: 'twil' }, next: 'xc_twil' },
          { label: 'Canopy keeps them standing', requires: { partyHas: 'canopy' }, next: 'xc_canopy' },
          { label: 'Hola sets her pace', requires: { partyHas: 'hola' }, next: 'xc_hola' },
          { label: 'Oyin echoes my strike', requires: { partyHas: 'oyin' }, next: 'xc_oyin' },
          { label: 'Back', next: 'root' },
        ]
      },
      rivalry: {
        text: 'Yorna: Don\'t worry about them, Chief. The others can hang back and... \'support\'. I\'m the only vanguard you\'ll need.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      bond6a: {
        text: "Yorna: I don't like to stop moving. If I do, it's to pick a better position to attack from.",
        choices: [ { label: 'Continue', next: 'bond6b' } ]
      },
      bond6b: {
        text: "Yorna: People flinch. I don't mind. I'd rather you tell me where you're going.",
        choices: [ { label: 'Continue', next: 'bond6c' } ]
      },
      bond6c: {
        text: "Yorna: If you walk ahead, I'll hit harder. If you walk beside me… I can focus on the fight instead of watching my back.",
        choices: [ { label: 'Thanks', action: 'affinity_add', data: { target: 'active', amount: 0.2, flag: 'yorna_bond6c_reward' }, next: 'bond_menu' } ]
      },
      bond8: {
        text: "Yorna: I don't hit hard for fun. I hit hard because it keeps you moving. That's the whole point.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      bond10: {
        text: "Yorna: If you're with me, no wall is too thick. If I ever hesitate... it's because I'm worried about you, not the enemy. So push me. I need it. Deal?",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      quests: {
        text: 'Yorna: Chief, let\'s cut the knot.',
        choices: [
          { label: 'Cut the Knot', requires: { flag: 'yorna_knot_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Cut the Knot', requires: { flag: 'yorna_knot_cleared', missingFlag: 'yorna_knot_done' }, next: 'quest_turnin' },
          { label: 'Shatter the Ring (L2)', requires: { hasFlag: 'level2_reached', flag: 'yorna_ring_started', not: true }, next: 'ring_intro' },
          { label: 'Turn in: Shatter the Ring', requires: { flag: 'yorna_ring_cleared', missingFlag: 'yorna_ring_done' }, next: 'ring_turnin' },
          { label: 'Hold the Causeway (L3)', requires: { level: 3, flag: 'yorna_causeway_started', not: true }, next: 'causeway_intro' },
          { label: 'Turn in: Hold the Causeway', requires: { flag: 'yorna_causeway_cleared', missingFlag: 'yorna_causeway_done' }, next: 'causeway_turnin' },
          { label: 'Back', next: 'root' },
        ]
      },
      style: {
        text: "Yorna: My style? I hit hard and fast so you don't have to. Keep your eyes on me, Chief. You won't be disappointed.",
        choices: [ { label: "Back", action: "companion_back" } ]
      },
      mood: {
        text: 'Yorna: Chief, never better. If there\'s trouble, I\'ll handle it.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      quest_intro: {
        text: 'Yorna: Chief, there\'s a pair of scouts setting ambushes. If we take them out, we clear the path.',
        choices: [
          { label: 'Let\'s do it.', action: 'start_quest', data: { id: 'yorna_knot' }, next: 'quest_started' },
          { label: 'Another time.', action: 'companion_back' },
        ]
      },
      quest_started: {
        text: 'Yorna: Chief, there are two targets. I\'ll show you where they are. Let\'s move fast.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      quest_turnin: {
        text: 'Yorna: Chief, they\'re dead. That should stop the ambushes for a while.',
        choices: [
          { label: 'Good work.', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'yorna_knot_reward' }, next: 'quest_done' },
        ]
      },
      quest_done: {
        text: 'Yorna: Chief, on to the next problem.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'yorna_knot_done' }, next: 'root' } ]
      },

      // L2: Shatter the Ring
      ring_intro: {
        text: "Yorna: Three captains are holding these ruins. If we take them out, the road will be clear.",
        choices: [
          { label: "Let's do it.", action: 'start_quest', data: { id: 'yorna_ring' }, next: 'ring_started' },
          { label: 'Later.', action: 'companion_back' },
        ]
      },
      ring_started: {
        text: 'Yorna: Chief, I\'ll point them out. You take down anyone who gets in our way.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      ring_turnin: {
        text: "Yorna: The captains are dead. The road is clear.",
        choices: [ { label: 'Good work.', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'yorna_ring_reward' }, next: 'ring_done' } ]
      },
      ring_done: {
        text: 'Yorna: Chief, next group, same plan.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'yorna_ring_done' }, next: 'root' } ]
      },

      // L3: Hold the Causeway
      causeway_intro: {
        text: 'Yorna: Chief, three wardens are blocking the causeway. Let\'s kill them and open it up.',
        choices: [
          { label: 'Let\'s take it.', action: 'start_quest', data: { id: 'yorna_causeway' }, next: 'causeway_started' },
          { label: 'Later.', action: 'companion_back' },
        ]
      },
      causeway_started: {
        text: "Yorna: Clear some space. When I push forward, you follow.",
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      causeway_turnin: {
        text: 'Yorna: Chief, the causeway is clear now.',
        choices: [ { label: 'Nice.', action: 'affinity_add', data: { target: 'active', amount: 1.2, flag: 'yorna_causeway_reward' }, next: 'causeway_done' } ]
      },
      causeway_done: {
        text: 'Yorna: Chief, keep moving.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'yorna_causeway_done' }, next: 'root' } ]
      },

      // Cross-companion touches
      xc_twil: {
        text: "Yorna: Twil finds the openings. I take them. We don't waste time.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      xc_canopy: {
        text: "Yorna: Canopy keeps them alive. I keep enemies off you. That's a good trade.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      xc_hola: {
        text: 'Yorna: Chief, let\'s keep it simple. I\'ll handle the fighting. You just focus on what you need to do.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      xc_oyin: {
        text: 'Yorna: Chief, Oyin follows up on my attacks. I break their formation. She finishes off the stragglers.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      // Tension hints from Yorna
      hint_oyin_y: {
        text: 'Yorna: Chief, Oyin has a good count. If she calls it, I\'ll hit on three.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      hint_canopy_y: {
        text: 'Yorna: Chief, Canopy wants five breaths. I can use six. That\'s fine.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      // Post-truce acknowledgement (Yorna side)
      ack_oyin_y: {
        text: "Yorna: You call, I hit. Works.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      ack_canopy_y: {
        text: 'Yorna: Chief, five, then six. We move.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      rivalry: {
        text: 'Yorna: Don\'t worry about them, Chief. The others can hang back and... \'support\'. I\'m the only vanguard you\'ll need.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
    },
  },
  hola: {
    start: 'root',
    nodes: {
      root: {
        text: 'Hola: Oh! My Lord! I... I\'ll do my best. As long as I\'m near you, I feel... a little braver.',
        choices: [
          { label: 'What magic do you know?', next: 'magic' },
          { label: 'How\'s the journey?', next: 'mood' },
          { label: 'Castle and key', requires: { missingFlag: 'hola_castle_focus_done' }, next: 'castle_focus_intro' },
          // Bond entries
          { label: 'Small steps (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Speak up (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Stand firm (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          // Quest entries
          { label: 'Find Yorna', requires: { partyMissing: 'yorna', missingFlag: 'hola_find_yorna_started' }, next: 'find_yorna_intro' },
          { label: 'Find Her Voice', requires: { flag: 'hola_practice_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Find Her Voice', requires: { flag: 'hola_practice_cleared', missingFlag: 'hola_practice_done' }, next: 'quest_turnin' },
          { label: 'Break the Silence (L2)', requires: { level: 2, flag: 'hola_silence_started', not: true }, next: 'silence_intro' },
          { label: 'Turn in: Break the Silence', requires: { flag: 'hola_silence_cleared', missingFlag: 'hola_silence_done' }, next: 'silence_turnin' },
          { label: 'Breath Over Bog (L3)', requires: { level: 3, flag: 'hola_breath_bog_started', not: true }, next: 'bog_intro' },
          { label: 'Turn in: Breath Over Bog', requires: { flag: 'hola_breath_bog_cleared', missingFlag: 'hola_breath_bog_done' }, next: 'bog_turnin' },
          { label: 'Back to companions', action: 'companion_back' },
        ]
      },
      bond_menu: {
        text: 'Hola: My Lord, I can… share. If you want.',
        choices: [
          { label: 'Small steps (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Speak up (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Stand firm (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          { label: 'Am I useful?', requires: { partyHas: ['yorna', 'twil'] }, next: 'insecurity' },
          { label: 'About Twil…', requires: { partyHas: 'twil', missingFlag: 'hola_twil_truce' }, next: 'hint_twil' },
          { label: 'Mediate: Set the cadence', requires: { partyHas: 'twil', missingFlag: 'hola_twil_truce' }, next: 'mediate_twil_intro' },
          { label: 'After the cadence', requires: { partyHas: 'twil', hasFlag: 'hola_twil_truce' }, next: 'ack_twil_h' },
          { label: 'Breathe with Canopy', requires: { partyHas: 'canopy' }, next: 'xc_canopy' },
          { label: "Twil's shortcut", requires: { partyHas: 'twil' }, next: 'xc_twil' },
          { label: 'Between them', requires: { partyHas: ['canopy','twil'] }, next: 'xc_both' },
          { label: 'Back', next: 'root' },
        ]
      },
      insecurity: {
        text: 'Hola: (In a small voice) Yorna is so strong... and Twil is so fast. I hope... I hope I\'m still useful to you, My Lord.',
        choices: [ { label: 'You are.', action: 'affinity_add', data: { target: 'active', amount: 0.3 }, next: 'bond_menu' } ]
      },
      bond6: {
        text: "Hola: Just... tell me to stand close to you, My Lord. When I'm near you, my hands don't shake so much. It's... calming.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      bond8: {
        text: "Hola: I said 'no' to a sorcerer once. My voice squeaked. He listened anyway.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      bond10: {
        text: "Hola: My Lord... before I met you, I was always running. But when I'm with you, I feel like I can stand my ground against anything. You make me brave.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      castle_focus_intro: {
        text: "Hola: The castle gate—Gorg keeps the brass key. When I think about going back there my hands shake, but if you walk with me I can remember the path.",
        choices: [
          { label: 'Let\'s map it out.', action: 'start_quest', data: { id: 'hola_castle_focus' }, next: 'castle_focus_map' },
          { label: 'Breathe first.', action: 'start_quest', data: { id: 'hola_castle_focus' }, next: 'castle_focus_breathe' },
          { label: 'Not right now.', action: 'companion_back' },
        ]
      },
      castle_focus_map: {
        text: "Hola: Outside the wall there\'s a split oak. If we circle left, we can see the patrols before they see us. Gorg leans on the parapet when he\'s bored.",
        choices: [ { label: 'Keep going.', next: 'castle_focus_plan' } ]
      },
      castle_focus_breathe: {
        text: "Hola: Okay. In… and out. Again. Thank you. When you say my name like that I can hear over the thunder in my ears.",
        choices: [ { label: 'Now show me the route.', next: 'castle_focus_plan' } ]
      },
      castle_focus_plan: {
        text: "Hola: We sneak under the broken lantern, take the narrow stairs, and wait until he yawns. That\'s when he drops the key to roll his shoulders.",
        choices: [
          { label: 'We\'ll take it together.', action: 'affinity_add', data: { target: 'active', amount: 0.5, flag: 'hola_aff_castle_plan', questFlag: 'hola_castle_focus_done' }, next: 'castle_focus_close' },
          { label: 'You\'ll call the timing.', action: 'affinity_add', data: { target: 'active', amount: 0.7, flag: 'hola_aff_castle_timing', questFlag: 'hola_castle_focus_done' }, next: 'castle_focus_close' },
        ]
      },
      castle_focus_close: {
        text: "Hola: I can do this. With you beside me, I won\'t freeze. Thank you, My Lord. I\'ll keep the route clear in my head.",
        choices: [ { label: 'We move when you\'re ready.', next: 'root' } ]
      },
      quests: {
        text: 'Hola: My Lord, I can practice… if you stay close.',
        choices: [
          { label: 'Find Yorna', requires: { partyMissing: 'yorna', missingFlag: 'hola_find_yorna_started' }, next: 'find_yorna_intro' },
          { label: 'Find Her Voice', requires: { flag: 'hola_practice_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Find Her Voice', requires: { flag: 'hola_practice_cleared', missingFlag: 'hola_practice_done' }, next: 'quest_turnin' },
          { label: 'Break the Silence (L2)', requires: { level: 2, flag: 'hola_silence_started', not: true }, next: 'silence_intro' },
          { label: 'Turn in: Break the Silence', requires: { flag: 'hola_silence_cleared', missingFlag: 'hola_silence_done' }, next: 'silence_turnin' },
          { label: 'Breath Over Bog (L3)', requires: { level: 3, flag: 'hola_breath_bog_started', not: true }, next: 'bog_intro' },
          { label: 'Turn in: Breath Over Bog', requires: { flag: 'hola_breath_bog_cleared', missingFlag: 'hola_breath_bog_done' }, next: 'bog_turnin' },
          { label: 'Back', next: 'root' },
        ]
      },
      // L1: Find Yorna (lead to northwest; auto-turn-in on recruiting Yorna)
      find_yorna_intro: {
        text: 'Hola: My Lord, I saw a red-headed fighter in the woods to the northwest. She moved like she knew what she was doing. Maybe she could help us.',
        choices: [
          { label: "Let's find her.", action: 'start_quest', data: { id: 'hola_find_yorna' }, next: 'find_yorna_started' },
          { label: 'Later.', next: 'root' },
        ]
      },
      find_yorna_started: {
        text: 'Hola: My Lord… northwest—red hair. I\'ll stay close.',
        choices: [ { label: 'Back', action: 'companion_talk', data: { target: 'active' } } ]
      },
      magic: {
        text: 'Hola: I can... I can make a light. To light your way! And I can... push the air... to keep enemies away from you. I\'ll make sure I get it right for you, My Lord!',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      mood: {
        text: 'Hola: My Lord, nervous… but safer with you here.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      quest_intro: {
        text: 'Hola: My Lord, if I… if I try, I can push them back. Maybe twice?',
        choices: [
          { label: 'Let\'s practice.', action: 'start_quest', data: { id: 'hola_practice' }, next: 'quest_started' },
          { label: 'Later.', next: 'root' },
        ]
      },
      quest_started: {
        text: "Hola: My Lord, I'll try to keep my magic focused. Please stay close.",
        choices: [ { label: 'Back', next: 'root' } ]
      },
      quest_turnin: {
        text: 'Hola: My Lord, I… did it. Thank you for waiting for me.',
        choices: [ { label: 'Proud of you.', action: 'affinity_add', data: { target: 'active', amount: 0.7, flag: 'hola_practice_reward' }, next: 'quest_done' } ]
      },
      quest_done: {
        text: 'Hola: My Lord, I\'ll keep trying.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'hola_practice_done' }, next: 'root' } ]
      },

      // Tension hint with Twil
      hint_twil: {
        text: "Hola: I know she moves fast. If she says it out loud, I can match it. I just… don't want to slow you down.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },

      // Mediate: Hola and Twil (set a cadence)
      mediate_twil_intro: {
        text: '(You step in as tension between Hola and Twil keeps bubbling about pace. You propose setting a cadence you can all follow.)\nHola: If you call the pace, I can match it. If you… call it out loud.',
        choices: [ { label: 'Continue', next: 'mediate_twil_b' } ]
      },
      mediate_twil_b: {
        text: 'Twil: Master, fine. I\'ll count. You keep your feet where I say.',
        choices: [ { label: 'Continue', next: 'mediate_twil_c' } ]
      },
      mediate_twil_c: {
        text: 'Hola: My Lord, okay. One… two… three.',
        choices: [ { label: 'Deal', action: 'affinity_add', data: { target: 'active', amount: 0.2, flag: 'hola_twil_truce_reward_hola' }, next: 'mediate_twil_apply_twil' } ]
      },
      mediate_twil_apply_twil: {
        text: 'Twil: Master, see? Faster already.',
        choices: [ { label: 'Thanks', action: 'affinity_add', data: { target: 'twil', amount: 0.2, flag: 'hola_twil_truce_reward_twil' }, next: 'mediate_twil_done' } ]
      },
      mediate_twil_done: {
        text: 'Hola: My Lord, I\'ll keep your count.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'hola_twil_truce' }, next: 'bond_menu' } ]
      },
      // Post-truce acknowledgement (Hola ↔ Twil)
      ack_twil_h: {
        text: 'Hola: My Lord, if you call it, I won\'t run. Thank you.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },

      // Cross-companion touches
      xc_canopy: {
        text: 'Hola: When Canopy counts her breaths, I can match them. It helps me speak more clearly if someone else sets the pace.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      xc_twil: {
        text: "Hola: Twil is so fast with her words. I'm trying to be more direct so I don't slow everyone down.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      xc_both: {
        text: 'Hola: Canopy helps me stay calm, and Twil helps me keep up. With them... I feel a little braver.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },

      // L2: Break the Silence (defeat Silencers)
      silence_intro: {
        text: "Hola: My Lord, when those 'Silencers' are near, it's hard to think. If we defeat three of them, I think I'll be able to focus better.",
        choices: [
          { label: "Let's break them.", action: 'start_quest', data: { id: 'hola_silence' }, next: 'silence_started' },
          { label: 'Later.', action: 'companion_back' },
        ]
      },
      silence_started: {
        text: "Hola: I'll stay behind you. If I shake, just… keep walking. I'll match you.",
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      silence_turnin: {
        text: "Hola: It's… quieter in my head. Thank you for not rushing me.",
        choices: [ { label: 'You did great.', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'hola_silence_reward' }, next: 'silence_done' } ]
      },
      silence_done: {
        text: 'Hola: My Lord, I can talk a little louder now.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'hola_silence_done' }, next: 'root' } ]
      },

      // L3: Breath Over Bog (defeat Marsh Whisperers)
      bog_intro: {
        text: 'Hola: My Lord, the air in this marsh is heavy. It makes it hard to think. If we defeat three of those whisperers, it might clear my head.',
        choices: [
          { label: "Let's try.", action: 'start_quest', data: { id: 'hola_breath_bog' }, next: 'bog_started' },
          { label: 'Later.', action: 'companion_back' },
        ]
      },
      bog_started: {
        text: "Hola: I’ll stay close. If I start to run, just say my name.",
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      bog_turnin: {
        text: 'Hola: My Lord, it feels safer here now. Maybe my mentor could find his way. Maybe I can find mine.',
        choices: [ { label: 'Proud of you.', action: 'affinity_add', data: { target: 'active', amount: 1.2, flag: 'hola_breath_bog_reward' }, next: 'bog_done' } ]
      },
      bog_done: {
        text: "Hola: If you walk, I won't run.",
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'hola_breath_bog_done' }, next: 'root' } ]
      },
    },
  },
  oyin: {
    start: 'root',
    nodes: {
      root: {
        text: 'Oyin: My Lord, I can practice… if you have time.',
        choices: [
          // Bond entries
          { label: 'Steady hands (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Count to three (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Brave voice (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          // Quest entries (movement/control now)
          { label: 'Trace the Footprints', requires: { flag: 'twil_trace_started', not: true }, next: 'twil_trace_intro_oyin' },
          { label: 'Turn in: Trace the Footprints', requires: { flag: 'twil_trace_cleared', missingFlag: 'twil_trace_done' }, next: 'twil_trace_turnin_oyin' },
          { label: 'Cut the Wake (L3)', requires: { level: 3, flag: 'twil_wake_started', not: true }, next: 'twil_wake_intro_oyin' },
          { label: 'Turn in: Cut the Wake', requires: { flag: 'twil_wake_cleared', missingFlag: 'twil_wake_done' }, next: 'twil_wake_turnin_oyin' },
          { label: 'Back to companions', action: 'companion_back' },
        ]
      },
      bond_menu: {
        text: 'Oyin: My Lord, I want to be braver than I am.',
        choices: [
          { label: 'Steady hands (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Count to three (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Brave voice (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          { label: 'About Yorna…', requires: { partyHas: 'yorna', missingFlag: 'yorna_oyin_truce' }, next: 'hint_yorna' },
          { label: 'Mediate: Call and Echo', requires: { partyHas: 'yorna', missingFlag: 'yorna_oyin_truce' }, next: 'mediate_yorna_intro' },
          { label: 'After call and echo', requires: { partyHas: 'yorna', hasFlag: 'yorna_oyin_truce' }, next: 'ack_yorna_o' },
          { label: 'Back', next: 'root' },
        ]
      },
      bond6: {
        text: "Oyin: If I say I'm scared, will you… be patient with me?",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      bond8: {
        text: "Oyin: I practiced until my hands stopped shaking. They still do sometimes. But less.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      bond10: {
        text: "Oyin: If you keep walking, I can be brave. I can match you.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },

      // Mediate: Oyin and Yorna (call and echo)
      mediate_yorna_intro: {
        text: '(You step between Yorna\'s push and Oyin\'s hesitation. You suggest a simple call-and-echo so they can move together.)\nOyin: If you… count, I can match you. Three is good.',
        choices: [ { label: 'Continue', next: 'mediate_yorna_b' } ]
      },
      mediate_yorna_b: {
        text: "Yorna: Chief, I'll call out the target. You confirm. We both strike on the count of three.",
        choices: [ { label: 'Continue', next: 'mediate_yorna_c' } ]
      },
      mediate_yorna_c: {
        text: 'Oyin: My Lord, one. Two. Three.',
        choices: [ { label: 'Deal', action: 'affinity_add', data: { target: 'active', amount: 0.2, flag: 'yorna_oyin_truce_reward_oyin' }, next: 'mediate_yorna_apply_yorna' } ]
      },
      mediate_yorna_apply_yorna: {
        text: 'Yorna: Chief, good count.',
        choices: [ { label: 'Thanks', action: 'affinity_add', data: { target: 'yorna', amount: 0.2, flag: 'yorna_oyin_truce_reward_yorna' }, next: 'mediate_yorna_done' } ]
      },
      mediate_yorna_done: {
        text: 'Oyin: My Lord, I\'ll be ready to attack on the count of three.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'yorna_oyin_truce' }, next: 'bond_menu' } ]
      },
      // Tension hint with Yorna
      hint_yorna: {
        text: 'Oyin: My Lord, when Yorna pushes, my hands shake. If we… counted first, I could move on three.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      // Post-truce acknowledgement (Oyin ↔ Yorna)
      ack_yorna_o: {
        text: 'Oyin: My Lord, I understand the plan. She calls the target, I confirm, and we attack together. I can do that.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      // Oyin offering movement quests (shares flags with Twil's movement chain)
      twil_trace_intro_oyin: {
        text: 'Oyin: If we follow carefully, we can catch three. I’ll stay with your pace.',
        choices: [ { label: 'Let\'s follow.', action: 'start_quest', data: { id: 'twil_trace' }, next: 'twil_trace_started_oyin' }, { label: 'Later.', action: 'companion_back' } ]
      },
      twil_trace_started_oyin: {
        text: 'Oyin: I’ll count, you call. We’ll meet on three.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      twil_trace_turnin_oyin: {
        text: 'Oyin: We matched. I can do that again.',
        choices: [ { label: 'Well done.', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'twil_trace_reward' }, next: 'twil_trace_done_oyin' } ]
      },
      twil_trace_done_oyin: {
        text: 'Oyin: I\'ll keep pace.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'twil_trace_done' }, next: 'root' } ]
      },
      twil_wake_intro_oyin: {
        text: 'Oyin: The Skimmers in the water are too fast. If we defeat three of them, I can keep up with you.',
        choices: [ { label: 'Let\'s do it.', action: 'start_quest', data: { id: 'twil_wake' }, next: 'twil_wake_started_oyin' }, { label: 'Later.', action: 'companion_back' } ]
      },
      twil_wake_started_oyin: {
        text: 'Oyin: I’ll watch your step. Call the count.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      twil_wake_turnin_oyin: {
        text: 'Oyin: Path’s clean enough now. I can match you.',
        choices: [ { label: 'Good.', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'twil_wake_reward' }, next: 'twil_wake_done_oyin' } ]
      },
      twil_wake_done_oyin: {
        text: 'Oyin: Count and go. I\'m with you.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'twil_wake_done' }, next: 'root' } ]
      },
    },
  },
  twil: {
    start: 'root',
    nodes: {
      root: {
        text: 'Twil: Master, I can see the trouble ahead before it sees us. Want me to point the way?',
        choices: [
          // Bond entries
          { label: 'Footwork (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Shortcuts (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Same stride (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          // Quest entries
          { label: 'Trace the Footprints', requires: { flag: 'twil_trace_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Trace the Footprints', requires: { flag: 'twil_trace_cleared', missingFlag: 'twil_trace_done' }, next: 'quest_turnin' },
          { label: 'Cut the Wake (L3)', requires: { hasFlag: 'level3_reached', flag: 'twil_wake_started', not: true }, next: 'wake_intro' },
          { label: 'Turn in: Cut the Wake', requires: { flag: 'twil_wake_cleared', missingFlag: 'twil_wake_done' }, next: 'wake_turnin' },
          { label: 'Back to companions', action: 'companion_back' },
        ]
      },
      bond_menu: {
        text: "Twil: You're not slow. Not today.",
        choices: [
          { label: 'Footwork (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Shortcuts (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Same stride (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          { label: 'About Hola…', requires: { partyHas: 'hola', missingFlag: 'hola_twil_truce' }, next: 'hint_hola_t' },
          { label: 'Count\'s set.', requires: { partyHas: 'hola', hasFlag: 'hola_twil_truce' }, next: 'ack_hola_t' },
          { label: 'Back', next: 'root' },
        ]
      },
      bond6: {
        text: "Twil: See that opening? That's where we go through.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      bond8: {
        text: "Twil: People focus on what's directly in front of them. I look for the fastest path.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      bond10: {
        text: "Twil: If you run, I'll run. If you stop, I'll stand.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      // Tension hint from Twil
      hint_hola_t: {
        text: "Twil: Hola can match pace if I call it. I don't always remember to call it.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      // Post-truce acknowledgement (Twil ↔ Hola)
      ack_hola_t: {
        text: "Twil: Count's set. We move.",
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      quests: {
        text: 'Twil: Master, keep up.',
        choices: [
          { label: 'Trace the Footprints', requires: { flag: 'twil_trace_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Trace the Footprints', requires: { flag: 'twil_trace_cleared', missingFlag: 'twil_trace_done' }, next: 'quest_turnin' },
          { label: 'Cut the Wake (L3)', requires: { hasFlag: 'level3_reached', flag: 'twil_wake_started', not: true }, next: 'wake_intro' },
          { label: 'Turn in: Cut the Wake', requires: { flag: 'twil_wake_cleared', missingFlag: 'twil_wake_done' }, next: 'wake_turnin' },
          { label: 'Light the Fuse', requires: { flag: 'twil_fuse_started', not: true }, next: 'fuse_intro' },
          { label: 'Turn in: Light the Fuse', requires: { flag: 'twil_fuse_cleared', missingFlag: 'twil_fuse_done' }, next: 'fuse_turnin' },
          { label: 'Carry the Ember (L3)', requires: { hasFlag: 'level3_reached', flag: 'twil_ember_started', not: true }, next: 'ember_intro' },
          { label: 'Turn in: Carry the Ember', requires: { flag: 'twil_ember_cleared', missingFlag: 'twil_ember_done' }, next: 'ember_turnin' },
          { label: 'Back', next: 'root' },
        ]
      },
      fuse_intro: {
        text: 'Twil: Master, if we light these three fuses, we can move faster than the enemy can react.',
        choices: [ { label: 'Let\'s light it.', action: 'start_quest', data: { id: 'twil_fuse' }, next: 'fuse_started' }, { label: 'Later.', action: 'companion_back' } ]
      },
      fuse_started: {
        text: 'Twil: Watch the wind. I\'ll show you where to go and when to strike.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      fuse_turnin: {
        text: 'Twil: Lit and gone. Faster now.',
        choices: [ { label: 'Nice work.', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'twil_fuse_reward' }, next: 'fuse_done' } ]
      },
      fuse_done: {
        text: 'Twil: Master, we can do that again.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'twil_fuse_done' }, next: 'root' } ]
      },
      // L3: Carry the Ember (defeat Lantern Bearers) — Twil flavor
      ember_intro: {
        text: "Twil: Master, there are three enemies called 'Lantern Bearers' in the marsh. Let's take them out.",
        choices: [ { label: 'Carry it.', action: 'start_quest', data: { id: 'twil_ember' }, next: 'ember_started' }, { label: 'Later.', action: 'companion_back' } ]
      },
      wake_started: {
        text: 'Twil: Master, keep up. I\'ll call the gap, you take it.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      ember_turnin: {
        text: 'Twil: Fire’s alive. We made it.',
        choices: [ { label: 'Nice work.', action: 'affinity_add', data: { target: 'active', amount: 1.2, flag: 'twil_ember_reward' }, next: 'ember_done' } ]
      },
      ember_done: {
        text: 'Twil: Next light, next run.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'twil_ember_done' }, next: 'root' } ]
      },
      quest_intro: {
        text: 'Twil: Master, three shadows ahead. Catch them, and we\'ll be faster than they are.',
        choices: [ { label: 'Let\'s hunt.', action: 'start_quest', data: { id: 'twil_trace' }, next: 'quest_started' }, { label: 'Later.', action: 'companion_back' } ]
      },
      quest_started: {
        text: 'Twil: Master, keep up. I\'ll point the gaps.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      quest_turnin: {
        text: 'Twil: Master, see? Faster.',
        choices: [ { label: 'Nice work.', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'twil_trace_reward' }, next: 'quest_done' } ]
      },
      quest_done: {
        text: 'Twil: Master, on to the next trace.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'twil_trace_done' }, next: 'root' } ]
      },

      // L3: Cut the Wake (defeat Skimmers)
      wake_intro: {
        text: 'Twil: Master, there are three \'skimmers\' making this path dangerous. Let\'s get rid of them.',
        choices: [ { label: 'Cut it.', action: 'start_quest', data: { id: 'twil_wake' }, next: 'wake_started' }, { label: 'Later.', action: 'companion_back' } ]
      },
      wake_started: {
        text: 'Twil: Master, keep up. I\'ll call the gap, you take it.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      wake_turnin: {
        text: 'Twil: Master, the path is clear. We can move faster now.',
        choices: [ { label: 'Nice work.', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'twil_wake_reward' }, next: 'wake_done' } ]
      },
      wake_done: {
        text: 'Twil: Master, next wake, same cut.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'twil_wake_done' }, next: 'root' } ]
      },
    },
  },
  tin: {
    start: 'root',
    nodes: {
      root: {
        text: 'Tin: My Lord, I can help scout the marsh. Want to set a path?',
        choices: [
          // Bond entries
          { label: 'Footing (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Wind over water (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Take you home (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          // Quest entries
          { label: 'Mark the Shallows (L3)', requires: { hasFlag: 'level3_reached', flag: 'tin_shallows_started', not: true }, next: 'shallows_intro' },
          { label: 'Turn in: Mark the Shallows', requires: { flag: 'tin_shallows_cleared', missingFlag: 'tin_shallows_done' }, next: 'shallows_turnin' },
          // Level 4 quest
          { label: 'Flag the Gaps (L4)', requires: { hasFlag: 'level4_reached', flag: 'tin_gaps4_started', not: true }, next: 'gaps_l4_intro' },
          { label: 'Turn in: Flag the Gaps', requires: { flag: 'tin_gaps4_cleared', missingFlag: 'tin_gaps4_done' }, next: 'gaps_l4_turnin' },
          { label: 'Back to companions', action: 'companion_back' },
        ]
      },
      bond_menu: {
        text: 'Tin: My Lord, watch your footing; I\'ll watch the wind.',
        choices: [
          { label: 'Footing (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Wind over water (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Take you home (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          { label: 'Back', next: 'root' },
        ]
      },
      bond6: {
        text: "Don't trust the still water. If you watch where the ripples are, you can see the safe path, My Lord.",
        choices: [ { label: 'Thanks', action: 'affinity_add', data: { target: 'active', amount: 0.2, flag: 'tin_bond6_reward' }, next: 'bond_menu' } ]
      },
      bond8: {
        text: 'Tin: My Lord, if you watch the wind and the water, you can see the fastest path. You won\'t get stuck if you look.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      bond10: {
        text: 'Tin: My Lord, if you take point, I\'ll take you home. That\'s a promise.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      // L3: Mark the Shallows (defeat Marsh Stalkers)
      shallows_intro: {
        text: 'Tin: My Lord, three stretches look shallow. Stalkers hold them. We mark them so people don\'t drown.',
        choices: [ { label: 'Mark them.', action: 'start_quest', data: { id: 'tin_shallows' }, next: 'shallows_started' }, { label: 'Later.', action: 'companion_back' } ]
      },
      shallows_started: {
        text: 'Tin: My Lord, I\'ll show you where it\'s safe to step. You take care of the enemies that appear.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      shallows_turnin: {
        text: 'Tin: My Lord, marked. Safer than it was.',
        choices: [ { label: 'Good work.', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'tin_shallows_reward' }, next: 'shallows_done' } ]
      },
      shallows_done: {
        text: 'Tin: My Lord, I\'ll keep marking where we pass.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'tin_shallows_done' }, next: 'root' } ]
      },

      // Level 4: Flag the Gaps — defeat three Gap Runners
      gaps_l4_intro: {
        text: 'Tin: My Lord, there are runners cutting through the alleys, making them dangerous. If we stop three of them, people can pass through safely.',
        choices: [ { label: 'Flag them.', action: 'start_quest', data: { id: 'tin_gaps4' }, next: 'gaps_l4_started' }, { label: 'Later.', action: 'companion_back' } ]
      },
      gaps_l4_started: {
        text: 'Tin: My Lord, I\'ll show you where they are; you take them down.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      gaps_l4_turnin: {
        text: 'Tin: My Lord, lines hold. Better than it was.',
        choices: [ { label: 'Good work.', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'tin_gaps4_reward' }, next: 'gaps_l4_done' } ]
      },
      gaps_l4_done: {
        text: 'Tin: My Lord, we\'ll keep flags where they matter.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'tin_gaps4_done' }, next: 'root' } ]
      },
    },
  },
  nellis: {
    start: 'root',
    nodes: {
      root: {
        text: 'Nellis: Sire, you lead; I\'ll match your pace. Want me to light the way?',
        choices: [
          // Bond entries
          { label: 'Match your pace (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Hold a line (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Stop or run (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          // Quest entries
          { label: 'Raise the Beacon (L3)', requires: { hasFlag: 'level3_reached', flag: 'nellis_beacon_started', not: true }, next: 'beacon_intro' },
          { label: 'Turn in: Raise the Beacon', requires: { flag: 'nellis_beacon_cleared', missingFlag: 'nellis_beacon_done' }, next: 'beacon_turnin' },
          // Level 4 quest
          { label: 'Light the Crossroads (L4)', requires: { hasFlag: 'level4_reached', flag: 'nellis_crossroads4_started', not: true }, next: 'crossroads_l4_intro' },
          { label: 'Turn in: Light the Crossroads', requires: { flag: 'nellis_crossroads4_cleared', missingFlag: 'nellis_crossroads4_done' }, next: 'crossroads_l4_turnin' },
          { label: 'Back to companions', action: 'companion_back' },
        ]
      },
      bond_menu: {
        text: 'Nellis: Sire, I\'ll mirror your step until you ask me not to.',
        choices: [
          { label: 'Match your pace (Affinity 6+)', requires: { target: 'active', min: 6.0 }, next: 'bond6' },
          { label: 'Hold a line (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Stop or run (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          { label: 'Back', next: 'root' },
        ]
      },
      bond6: {
        text: 'Nellis: Sire, if you keep a steady pace, I won\'t slow you down.',
        choices: [ { label: 'Thanks', action: 'affinity_add', data: { target: 'active', amount: 0.2, flag: 'nellis_bond6_reward' }, next: 'bond_menu' } ]
      },
      bond8: {
        text: "Nellis: Sire, I can maintain our position so others don't wander off.",
        choices: [ { label: "Back", next: "bond_menu" } ]
      },
      bond10: {
        text: 'Nellis: Sire, if you stop, I stop. If you run, I\'ll try.',
        choices: [ { label: 'Back', next: 'bond_menu' } ]
      },
      // L3: Raise the Beacon (defeat Lantern Bearers)
      beacon_intro: {
        text: "Nellis: Sire, there are three enemies known as 'Lantern Bearers' blocking the paths. If we defeat them, people will be able to find each other again.",
        choices: [ { label: 'Light them.', action: 'start_quest', data: { id: 'nellis_beacon' }, next: 'beacon_started' }, { label: 'Later.', action: 'companion_back' } ]
      },
      beacon_started: {
        text: 'Nellis: Sire, I\'ll show you where they are. You defeat them.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      beacon_turnin: {
        text: 'Nellis: Sire, the paths are clear now. The marsh is safer to travel through.',
        choices: [ { label: 'Good work.', action: 'affinity_add', data: { target: 'active', amount: 1.2, flag: 'nellis_beacon_reward' }, next: 'beacon_done' } ]
      },
      beacon_done: {
        text: 'Nellis: Sire, I\'ll keep watch while you lead.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'nellis_beacon_done' }, next: 'root' } ]
      },

      // Level 4: Light the Crossroads — defeat three Signal Thieves
      crossroads_l4_intro: {
        text: "Nellis: Sire, there are 'Signal Thieves' making the roads unsafe. If we defeat three of them, people will be able to find each other at the crossroads again.",
        choices: [ { label: 'Light them.', action: 'start_quest', data: { id: 'nellis_crossroads4' }, next: 'crossroads_l4_started' }, { label: 'Later.', action: 'companion_back' } ]
      },
      crossroads_l4_started: {
        text: 'Nellis: Sire, I\'ll set signs. You make space around them.',
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      crossroads_l4_turnin: {
        text: 'Nellis: Sire, the crossroads glow again.',
        choices: [ { label: 'Good work.', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'nellis_crossroads4_reward' }, next: 'crossroads_l4_done' } ]
      },
      crossroads_l4_done: {
        text: 'Nellis: Sire, you keep leading the way. I\'ll make sure our path stays safe.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'nellis_crossroads4_done' }, next: 'root' } ]
      },
    },
  },
  urn: {
    start: 'root',
    nodes: {
      root: {
        text: 'It looks bleak, I know, but every light we kindle makes the shadows smaller. We can do this, Mister.',
        choices: [
          { label: 'About Varabella', next: 'on_vara', requires: { partyHas: ['varabella'] } },
          { label: 'That\'s a nice thought.', next: 'root' },
        ]
      },
      on_vara: {
        text: "Don't let Vara's sharp edges fool you. She's the reason we've both made it this far, Mister. She's my sister, in all the ways that count.",
        choices: [ { label: 'Back', next: 'root' } ]
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
        ]
      },
      on_urn: {
        text: 'Urn keeps our spirits up. That\'s a tactical advantage, and it\'s my job to make sure she has something to be optimistic about. Keep her safe, Boss man.',
        choices: [ { label: 'Back', next: 'root' } ]
      },
      banter_urn: {
        text: 'We make a good team, don\'t we, Vara? You find the path...', 
        portrait: 'assets/portraits/level04/UrnVarabella/Urn Varabella.mp4',
        choices: [ { label: '...', next: 'banter_vara' } ]
      },
      banter_vara: {
        text: '...and you make sure we don\'t lose our way on it. Now focus up. Hostiles, 40 meters.',
        portrait: 'assets/portraits/level04/UrnVarabella/Urn Varabella.mp4',
        choices: [ { label: 'Back', next: 'root' } ]
      },
    },
  },
  cowsill: {
    start: 'root',
    nodes: {
      root: {
        text: "Cowsill: My Lord, ready to show them what real teamwork looks like? Every strike we land together hits twice as hard!",
        choices: [
          { label: 'How can we strike harder?', next: 'tactics' },
          { label: 'How are you feeling?', next: 'mood' },
          { label: 'Tell me about your training.', next: 'training_chat' },
          // Bond entries
          { label: 'Share techniques', requires: { target: 'active', min: 6.0 }, next: 'bond6a' },
          { label: 'Perfect our timing (Affinity 8+)', requires: { target: 'active', min: 8.0 }, next: 'bond8' },
          { label: 'Ultimate combination (Affinity 9.5+)', requires: { target: 'active', min: 9.5 }, next: 'bond10' },
          // Quest entries
          { label: 'Temple Strike Team', requires: { hasFlag: 'level5_reached', flag: 'cowsill_strike_started', not: true }, next: 'quest_intro' },
          { label: 'Turn in: Temple Strike Team', requires: { flag: 'cowsill_strike_cleared', missingFlag: 'cowsill_strike_done' }, next: 'quest_turnin' },
          // Level 6 storyline
          { label: 'Cleanse the Corruption (L6)', requires: { hasFlag: 'level6_reached', flag: 'cowsill_cleanse_started', not: true }, next: 'cleanse_l6_intro' },
          { label: 'Turn in: Cleanse the Corruption', requires: { flag: 'cowsill_cleanse_cleared', missingFlag: 'cowsill_cleanse_done' }, next: 'cleanse_l6_turnin' },
          { label: 'Back to companions', action: 'companion_back' },
        ]
      },
      tactics: {
        text: "Cowsill: My Lord, it's all about rhythm! When you swing, I follow through immediately. The enemies won't know what hit them—literally twice!",
        choices: [
          { label: 'Back', action: 'companion_back' },
        ]
      },
      mood: {
        text: "Cowsill: My Lord, I'm pumped! Every battle we fight together makes us stronger. Can't wait for the next one!",
        choices: [
          { label: 'Back', action: 'companion_back' },
        ]
      },
      training_chat: {
        text: "Cowsill: My Lord, I trained with the temple guards before... everything fell apart. They taught me that strength isn't just power—it's timing, teamwork, trust.",
        choices: [
          { label: 'We\'ll rebuild that trust.', action: 'affinity_add', data: { target: 'active', amount: 0.5, flag: 'cowsill_aff_trust' }, next: 'training_more' },
          { label: 'Show me what you learned.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'cowsill_aff_show' }, next: 'training_more' },
          { label: 'Back', next: 'root' },
        ]
      },
      training_more: {
        text: "Cowsill: My Lord, watch my blade when you attack—I'll mirror your rhythm and amplify it. Together, we're unstoppable!",
        choices: [ { label: 'Let\'s do this.', next: 'root' } ]
      },
      bond6a: {
        text: "Cowsill: My Lord, here's the secret—it's not about hitting at the same time. It's about creating a cascade. You break their guard, I exploit the opening.",
        choices: [ { label: 'Continue', next: 'bond6b' } ]
      },
      bond6b: {
        text: "Cowsill: My Lord, every enemy has a pattern. Once we learn it and interrupt it, they can't recover. That's when we strike hardest.",
        choices: [ { label: 'Continue', next: 'bond6c' } ]
      },
      bond6c: {
        text: "Cowsill: My Lord, practice with me sometime? I promise you'll see the difference. Our combined attacks will be devastating.",
        choices: [ { label: 'I\'d like that', action: 'affinity_add', data: { target: 'active', amount: 0.2, flag: 'cowsill_bond6c_reward' }, next: 'root' } ]
      },
      bond8: {
        text: "Cowsill: My Lord, when we're perfectly synchronized, our movements flow together. It's how we win. Ready to practice?",
        choices: [ { label: 'Back', next: 'root' } ]
      },
      bond10: {
        text: "Cowsill: My Lord, you and me? We're more than just two fighters. When we work together, nothing can stand against our combined strength!",
        choices: [ { label: 'Back', next: 'root' } ]
      },
      quest_intro: {
        text: "Cowsill: My Lord, there are corrupted temple guards blocking key passages. If we strike them down together, we can clear the way for others.",
        choices: [
          { label: 'Let\'s clear them out.', action: 'start_quest', data: { id: 'cowsill_strike' }, next: 'quest_started' },
          { label: 'Later.', action: 'companion_back' },
        ]
      },
      quest_started: {
        text: "Cowsill: My Lord, yes! Let's show them what synchronized strikes can do!",
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      quest_turnin: {
        text: "Cowsill: My Lord, did you see that? Every hit landed perfectly! We make an amazing team!",
        choices: [ { label: 'We really do.', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'cowsill_strike_reward' }, next: 'quest_done' } ]
      },
      quest_done: {
        text: "Cowsill: My Lord, ready for the next challenge whenever you are!",
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'cowsill_strike_done' }, next: 'root' } ]
      },
      cleanse_l6_intro: {
        text: "Cowsill: My Lord, the temple's inner sanctum still has shadow remnants. Together we can strike them down and purify the sacred spaces.",
        choices: [
          { label: 'Let\'s cleanse it.', action: 'start_quest', data: { id: 'cowsill_cleanse' }, next: 'cleanse_started' },
          { label: 'Later.', next: 'root' },
        ]
      },
      cleanse_started: {
        text: "Cowsill: My Lord, strike fast, strike together. The shadows won't know what hit them!",
        choices: [ { label: 'Back', action: 'companion_back' } ]
      },
      cleanse_l6_turnin: {
        text: "Cowsill: My Lord, the temple feels lighter already! Our combined strength really does make a difference!",
        choices: [ { label: 'It does.', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'cowsill_cleanse_reward' }, next: 'cleanse_done' } ]
      },
      cleanse_done: {
        text: "Cowsill: My Lord, the temple is cleaner. Our strikes echo with purpose!",
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'cowsill_cleanse_done' }, next: 'root' } ]
      },
    },
  },
  snek: {
    start: 'root',
    nodes: {
      root: {
        text: 'Snek: My Lord… I coil close. Say the word and I ssslither where you point.',
        choices: [
          { label: 'Start: Clear the Den', requires: { missingFlag: 'snake_den_started' }, next: 'snake_den_intro' },
          { label: 'Turn in: Clear the Den', requires: { hasFlag: 'snake_den_cleared', missingFlag: 'snake_den_done' }, next: 'snake_den_turnin' },
          { label: 'Back to companions', action: 'companion_back' },
        ]
      },
      snake_den_intro: {
        text: 'Snek: Three pestsss are nearby. We sssneak in and kill them.',
        choices: [
          { label: 'Coil and go.', action: 'start_quest', data: { id: 'snake_den' }, next: 'snake_den_started' },
          { label: 'Another time.', next: 'root' },
        ]
      },
      snake_den_started: {
        text: 'Snek: Cull three. Then we breathe easssy.',
        choices: [ { label: 'Back', next: 'root' } ]
      },
      snake_den_turnin: {
        text: 'Snek: The den isss clean. You fight well.',
        choices: [ { label: 'Good hunt. (Affinity +0.8)', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'snake_den_reward' }, next: 'snake_den_done' } ]
      },
      snake_den_done: {
        text: 'Snek: I will sstay closer to you now.',
        choices: [ { label: 'Back', action: 'set_flag', data: { key: 'snake_den_done' }, next: 'root' } ]
      }
    }
  }
};
