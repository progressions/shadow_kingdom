export const villagerDialog = {
  start: 'root',
  nodes: {
    root: {
      text: 'Hello, traveler. Lovely day in the Shadow Kingdom!',
      choices: [
        { label: 'Who are you?', next: 'about' },
        { label: 'Any tips for me?', next: 'tips' },
        { label: 'Goodbye.', action: 'end' },
      ],
    },
    about: {
      text: 'I am a villager. I watch the roads and trade stories.',
      choices: [
        { label: 'Any tips for me?', next: 'tips' },
        { label: 'Goodbye.', action: 'end' },
      ],
    },
    tips: {
      text: 'Keep an eye on your footing. Trees and rocks slow a direct path.',
      choices: [
        { label: 'Thanks!', action: 'end' },
      ],
    },
  },
};

export const canopyDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Canopy: My Lord, I'm Canopy. I'm searching these woods for my sister—Ell. Urathar's raiders took her when they burned our village. I keep you standing: slow healing, a little less damage, and a short shield if your health drops. If you lead, I'll keep you standing. Shall I come?",
      choices: [
        { label: 'Aurelion is free (L5)', requires: { hasFlag: 'temple_cleansed', missingFlag: 'post_l5_canopy' }, next: 'post_l5_canopy' },
        { label: 'Yes, join me.', requires: { missingFlag: 'level2_reached' }, action: 'join_party', hint: 'Healer · Regeneration · Safeguard' },
        { label: 'Yes, join me.', requires: { hasFlag: 'level2_reached', partyMissing: 'yorna' }, action: 'join_party', hint: 'Healer · Regeneration · Safeguard' },
        { label: 'Yes, join me.', requires: { hasFlag: 'canopy_yorna_respect' }, action: 'join_party', hint: 'Healer · Regeneration · Safeguard' },
        { label: 'Not with her here.', requires: { hasFlag: 'level2_reached', partyHas: 'yorna', missingFlag: 'canopy_yorna_respect' }, next: 'canopy_refusal_yorna_present' },
        { label: 'You can lean on me, I\'ve got you.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'canopy_intro_encourage' }, next: 'after_aff' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Share a plan (Affinity 7+)', requires: { target: 'active', min: 7.0 }, next: 'bond' },
        { label: 'Not right now.', action: 'end' },
      ],
    },
    post_l5_canopy: {
      text: "Canopy: The Hall breathes again. Ell smiles in her sleep. Thank you. Urathar is still out there, but Aurelion isn't his anymore.",
      choices: [ { label: 'We keep moving.', action: 'set_flag', data: { key: 'post_l5_canopy' }, next: 'intro' } ],
    },
    about: {
      text: "Canopy: My Lord, I keep you standing. I gently heal you over time, give quick touch‑ups, and raise a short shield that blocks a hit when things get rough. Stay near me and hard hits feel softer.",
      choices: [
        { label: 'Good. Join me.', requires: { missingFlag: 'level2_reached' }, action: 'join_party', hint: 'Healer · Regeneration · Safeguard' },
        { label: 'Good. Join me.', requires: { hasFlag: 'level2_reached', partyMissing: 'yorna' }, action: 'join_party', hint: 'Healer · Regeneration · Safeguard' },
        { label: 'Good. Join me.', requires: { hasFlag: 'canopy_yorna_respect' }, action: 'join_party', hint: 'Healer · Regeneration · Safeguard' },
        { label: 'We need to settle this first.', requires: { hasFlag: 'level2_reached', partyHas: 'yorna', missingFlag: 'canopy_yorna_respect' }, next: 'canopy_refusal_yorna_present' },
        { label: 'Later.', action: 'end' }
      ],
    },
    after_aff: {
      text: 'Canopy: My Lord, thank you. I\'ll do my best to keep everyone whole.',
      choices: [
        { label: 'Join me.', requires: { missingFlag: 'level2_reached' }, action: 'join_party', hint: 'Healer · Regeneration · Safeguard' },
        { label: 'Join me.', requires: { hasFlag: 'level2_reached', partyMissing: 'yorna' }, action: 'join_party', hint: 'Healer · Regeneration · Safeguard' },
        { label: 'Join me.', requires: { hasFlag: 'canopy_yorna_respect' }, action: 'join_party', hint: 'Healer · Regeneration · Safeguard' },
        { label: 'Not with her here.', requires: { hasFlag: 'level2_reached', partyHas: 'yorna', missingFlag: 'canopy_yorna_respect' }, next: 'canopy_refusal_yorna_present' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Later.', action: 'end' }
      ],
    },
    bond: {
      text: 'Canopy: My Lord, a good plan is simple and steady. I\'m with you.',
      choices: [
        { label: 'Join me.', requires: { missingFlag: 'level2_reached' }, action: 'join_party', hint: 'Healer · Regeneration · Safeguard' },
        { label: 'Join me.', requires: { hasFlag: 'level2_reached', partyMissing: 'yorna' }, action: 'join_party', hint: 'Healer · Regeneration · Safeguard' },
        { label: 'Join me.', requires: { hasFlag: 'canopy_yorna_respect' }, action: 'join_party', hint: 'Healer · Regeneration · Safeguard' },
        { label: 'Not with her here.', requires: { hasFlag: 'level2_reached', partyHas: 'yorna', missingFlag: 'canopy_yorna_respect' }, next: 'canopy_refusal_yorna_present' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Later.', action: 'end' }
      ],
    },
    canopy_refusal_yorna_present: {
      text: 'Canopy: My Lord, not with her in the party. Choose first.',
      choices: [ { label: 'Back', action: 'end' } ],
    },
  },
};

export const yornaDialog = {
  start: 'intro',
  nodes: {
    intro: {
      variants: [
        {
          requires: { missingFlag: 'level2_reached' },
          text: "Yorna: Name's Yorna. I hit hard and I don't quit. The castle is to the southeast. The gate's locked—Gorg, the red brute, carries a brass key outside the northeast wall. We take it, open the gate, kill Vast, and keep this valley ours. Want me along?",
        },
        {
          requires: { hasFlag: 'level2_reached' },
          text: "Yorna: Let's press forward and take the fight to Urathar. I hit hard and extend your reach. Stay close and fights get easier.",
        },
      ],
      choices: [
        { label: 'Aurelion is free (L5)', requires: { hasFlag: 'temple_cleansed', missingFlag: 'post_l5_yorna' }, next: 'post_l5_yorna' },
        { label: 'Yes, join me.', requires: { missingFlag: 'level2_reached' }, action: 'join_party', hint: 'Frontliner · Openings · Extended Reach' },
        { label: 'Yes, join me.', requires: { hasFlag: 'level2_reached', partyMissing: 'canopy' }, action: 'join_party', hint: 'Frontliner · Openings · Extended Reach' },
        { label: 'Yes, join me.', requires: { hasFlag: 'canopy_yorna_respect' }, action: 'join_party', hint: 'Frontliner · Openings · Extended Reach' },
        { label: 'Not with her here.', requires: { hasFlag: 'level2_reached', partyHas: 'canopy', missingFlag: 'canopy_yorna_respect' }, next: 'yorna_refusal_canopy_present' },
        { label: 'What can you do for us?', next: 'skills' },
        { label: 'You hit hard; I\'ll stay with you.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'yorna_intro_encourage' }, next: 'after_aff' },
        { label: 'Trade tactics (Affinity 7+)', requires: { target: 'active', min: 7.0 }, next: 'bond' },
        { label: 'No thanks.', action: 'end' },
      ],
    },
    post_l5_yorna: {
      text: "Yorna: Good cut. Clean. Temple's ours again. But Urathar plans like a siege—he'll test every seam. We'll be ready.",
      choices: [ { label: 'Stay sharp.', action: 'set_flag', data: { key: 'post_l5_yorna' }, next: 'intro' } ],
    },
    skills: {
      text: "Yorna: I take the front and keep trouble off you. I hit hard and extend your reach so you can land hits from a bit farther. Stay close and fights get easier.",
      choices: [
        { label: 'Sounds great — join me.', requires: { missingFlag: 'level2_reached' }, action: 'join_party', hint: 'Frontliner · Openings · Extended Reach' },
        { label: 'Sounds great — join me.', requires: { hasFlag: 'level2_reached', partyMissing: 'canopy' }, action: 'join_party', hint: 'Frontliner · Openings · Extended Reach' },
        { label: 'Sounds great — join me.', requires: { hasFlag: 'canopy_yorna_respect' }, action: 'join_party', hint: 'Frontliner · Openings · Extended Reach' },
        { label: 'Not with her here.', requires: { hasFlag: 'level2_reached', partyHas: 'canopy', missingFlag: 'canopy_yorna_respect' }, next: 'yorna_refusal_canopy_present' },
        { label: 'Maybe later.', action: 'end' },
      ],
    },
    after_aff: {
      text: 'Yorna: Chief, that\'s the way—clear space and we\'ll bulldoze through.',
      choices: [
        { label: 'Join me.', requires: { missingFlag: 'level2_reached' }, action: 'join_party', hint: 'Frontliner · Openings · Extended Reach' },
        { label: 'Join me.', requires: { hasFlag: 'level2_reached', partyMissing: 'canopy' }, action: 'join_party', hint: 'Frontliner · Openings · Extended Reach' },
        { label: 'Join me.', requires: { hasFlag: 'canopy_yorna_respect' }, action: 'join_party', hint: 'Frontliner · Openings · Extended Reach' },
        { label: 'Not with her here.', requires: { hasFlag: 'level2_reached', partyHas: 'canopy', missingFlag: 'canopy_yorna_respect' }, next: 'yorna_refusal_canopy_present' },
        { label: 'What can you do for us?', next: 'skills' },
        { label: 'Later.', action: 'end' }
      ],
    },
    bond: {
      text: 'Yorna: Chief, I like how you think. I\'ll match your pace.',
      choices: [
        { label: 'Join me.', requires: { missingFlag: 'level2_reached' }, action: 'join_party', hint: 'Frontliner · Openings · Extended Reach' },
        { label: 'Join me.', requires: { hasFlag: 'level2_reached', partyMissing: 'canopy' }, action: 'join_party', hint: 'Frontliner · Openings · Extended Reach' },
        { label: 'Join me.', requires: { hasFlag: 'canopy_yorna_respect' }, action: 'join_party', hint: 'Frontliner · Openings · Extended Reach' },
        { label: 'Not with her here.', requires: { hasFlag: 'level2_reached', partyHas: 'canopy', missingFlag: 'canopy_yorna_respect' }, next: 'yorna_refusal_canopy_present' },
        { label: 'What can you do for us?', next: 'skills' },
        { label: 'Later.', action: 'end' }
      ],
    },
    yorna_refusal_canopy_present: {
      text: 'Yorna: No. Not while she’s on your line. Choose first.',
      choices: [ { label: 'Back', action: 'end' } ],
    },
  },
};

export const holaDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Hola: My Lord, I'm Hola. I try to give you breathing room—slow steps, small shoves—and I'm still learning. If we head northeast to the castle, the key hangs from the red brute's belt—Gorg. Vast burned my first spell to smoke; I want to try again. I'll do better if you call the pace. Shall I come?",
      choices: [
        { label: 'Aurelion is free (L5)', requires: { hasFlag: 'temple_cleansed', missingFlag: 'post_l5_hola' }, next: 'post_l5_hola' },
        { label: 'Yes, please join.', action: 'join_party', hint: 'Control · Slow · Push (Gust)' },
        { label: 'Any leads?', requires: { level: 1, missingFlag: 'hola_find_yorna_started', partyMissing: 'yorna' }, next: 'hint_yorna' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'You\'re doing fine. Stay close and speak up if you need.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'hola_intro_encourage' }, next: 'after_aff' },
        { label: 'Practice a formation (Affinity 7+)', requires: { target: 'active', min: 7.0 }, next: 'bond' },
        { label: 'Not now.', action: 'end' },
      ],
    },
    post_l5_hola: {
      text: "Hola: The air doesn't hurt here anymore. I can think. Thank you. Urathar felt… big. He'll come again, won't he? I'll be ready to try.",
      choices: [ { label: 'We\'ll be ready.', action: 'set_flag', data: { key: 'post_l5_hola' }, next: 'intro' } ],
    },
    about: {
      text: "Hola: My Lord, I give you breathing room. I slow enemies around you and shove crowds back so you can breathe. I also soften the little bumps that chip at you.",
      choices: [
        { label: 'Alright, join me.', action: 'join_party', hint: 'Control · Slow · Push (Gust)' },
        { label: 'Any leads?', requires: { level: 1, missingFlag: 'hola_find_yorna_started', partyMissing: 'yorna' }, next: 'hint_yorna' },
        { label: 'Maybe later.', action: 'end' },
      ],
    },
    after_aff: {
      text: 'Hola: My Lord, okay… I\'ll try to keep pace. Thank you.',
      choices: [
        { label: 'Join me.', action: 'join_party', hint: 'Control · Slow · Push (Gust)' },
        { label: 'Any leads?', requires: { level: 1, missingFlag: 'hola_find_yorna_started', partyMissing: 'yorna' }, next: 'hint_yorna' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Later.', action: 'end' }
      ],
    },
    bond: {
      text: 'Hola: My Lord, that helps. If we keep it simple, I\'ll be ready.',
      choices: [
        { label: 'Join me.', action: 'join_party', hint: 'Control · Slow · Push (Gust)' },
        { label: 'Any leads?', requires: { level: 1, missingFlag: 'hola_find_yorna_started', partyMissing: 'yorna' }, next: 'hint_yorna' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Later.', action: 'end' }
      ],
    },
    hint_yorna: {
      text: 'Hola: My Lord… I think I saw a red-headed fighter to the northwest. If you want, we could… go talk to her.',
      choices: [
        { label: 'Let\'s find her.', action: 'start_quest', data: { id: 'hola_find_yorna' }, next: 'intro' },
        { label: 'Later.', action: 'end' },
      ],
    },
  },
};

export const oyinDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Oyin: My Lord, Oyin here. I keep count and keep us steady. I can rally when it hurts—heal a little and lend strength for a few breaths—and I help your timing so the sharp hits land. If you want me… I can come along.",
      choices: [
        { label: 'Aurelion is free (L5)', requires: { hasFlag: 'temple_cleansed', missingFlag: 'post_l5_oyin' }, next: 'post_l5_oyin' },
        { label: 'Yes, join me.', action: 'join_party', hint: 'Rally · Keen Timing · +Range' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'You’re doing fine; breathe and stay with me.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'oyin_intro_encourage' }, next: 'after_aff' },
        { label: 'Not right now.', action: 'end' },
      ],
    },
    post_l5_oyin: {
      text: "Oyin: It feels lighter. Like someone opened a window. Urathar's not done—but neither are we.",
      choices: [ { label: 'On we go.', action: 'set_flag', data: { key: 'post_l5_oyin' }, next: 'intro' } ],
    },
    about: {
      variants: [
        {
          requires: { level: 2, missingFlag: 'level3_reached' },
          text: "Oyin: My Lord, Nethra has long reach. I slow her and give you some protection so you can close safely. I also help your timing for cleaner hits, and when it hurts I rally—small heal and a short +1 ATK.",
        },
        {
          text: "Oyin: My Lord, I help you land cleaner hits. I slow enemies near you, give a little extra protection, and when you’re hurting I rally—heal a little and lend +1 ATK for a few breaths.",
        },
      ],
      choices: [ { label: 'Join me.', action: 'join_party', hint: 'Rally · Slow · DR' }, { label: 'Later.', action: 'end' } ],
    },
    after_aff: {
      text: 'Oyin: My Lord, thanks… I can try a little longer if you lead.',
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'What can you do for us?', next: 'about' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const twilDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Twil: Master, I'm Twil. I scout ahead, read the ground, and call the gap. I'll mark weak points—take them when I say and we move faster. You want me along or what?",
      choices: [
        { label: 'Aurelion is free (L5)', requires: { hasFlag: 'temple_cleansed', missingFlag: 'post_l5_twil' }, next: 'post_l5_twil' },
        { label: 'Yes, join me.', action: 'join_party', hint: 'Scout · Slow Aura · Weak Points' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Your read is sharp; call the line and I’ll follow.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'twil_intro_encourage' }, next: 'after_aff' },
        { label: 'Not now.', action: 'end' },
      ],
    },
    post_l5_twil: {
      text: "Twil: Heard the way the hall stopped echoing? That's what relief sounds like. Urathar's still scribbling lines. We'll cut them.",
      choices: [ { label: 'Cut them.', action: 'set_flag', data: { key: 'post_l5_twil' }, next: 'intro' } ],
    },
    about: {
      variants: [
        {
          requires: { level: 2, missingFlag: 'level3_reached' },
          text: "Twil: Master, if Nethra keeps us at the edge, I add reach. I’ll call the gap and you can hit back. I also mark weak points so your big hits land more.",
        },
        {
          text: "Twil: Master, I help you hit smarter. I mark weak points so your big hits land more, and I give you a bit more reach.",
        },
      ],
      choices: [ { label: 'Good. Join me.', action: 'join_party', hint: 'Precision · +Range · Crit' }, { label: 'Later.', action: 'end' } ],
    },
    after_aff: {
      text: 'Twil: Master, ha—nice. Keep up and I’ll make it easy.',
      choices: [
        { label: 'Join me.', action: 'join_party', hint: 'Scout · Slow Aura · Weak Points' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Later.', action: 'end' }
      ],
    },
  },
};

export const tinDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Tin: My Lord, Tin—eyes on water and wind. I flag safe paths and hype our rhythm; your hands will move quicker when I call the beat. Want me on the path?",
      choices: [
        { label: 'Aurelion is free (L5)', requires: { hasFlag: 'temple_cleansed', missingFlag: 'post_l5_tin' }, next: 'post_l5_tin' },
        { label: 'Yes, join me.', action: 'join_party', hint: 'Tempo · Attack Speed · Safe Footing' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Take point and sing out. I’ll keep space clear.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'tin_intro_encourage' }, next: 'after_aff' },
        { label: 'Maybe later.', action: 'end' },
      ],
    },
    post_l5_tin: {
      text: "Tin: The Temple's singing again! I mean, not really singing, but it feels like it. Urathar's song is still out there. We'll drown it out.",
      choices: [ { label: 'Together.', action: 'set_flag', data: { key: 'post_l5_tin' }, next: 'intro' } ],
    },
    about: {
      text: "Tin: My Lord, I speed you up. I boost your attack rhythm, nudge enemies off you in a pinch, and point out safer lines so you don’t get bogged down.",
      choices: [ { label: 'Join me.', action: 'join_party', hint: 'Tempo · Attack Speed · Safe Footing' }, { label: 'Later.', action: 'end' } ],
    },
    after_aff: {
      text: 'Tin: My Lord, got it—short steps and wide eyes. Let’s move.',
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'What can you do for us?', next: 'about' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const nellisDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Nellis: Sire, I'm Nellis. I hold a steady line, set beacons so your reach goes farther, and take the strain so our pace never falters. Should I come along?",
      choices: [
        { label: 'Aurelion is free (L5)', requires: { hasFlag: 'temple_cleansed', missingFlag: 'post_l5_nellis' }, next: 'post_l5_nellis' },
        { label: 'Yes, join me.', action: 'join_party', hint: 'Defense · Extended Reach · Steady Pace' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Stay near and mirror me—we’ll be fine.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'nellis_intro_encourage' }, next: 'after_aff' },
        { label: 'Not right now.', action: 'end' },
      ],
    },
    post_l5_nellis: {
      text: "Nellis: The quiet here is gentle now. I can hold it. Urathar won't keep it. We'll relight what he dims.",
      choices: [ { label: 'Keep the line.', action: 'set_flag', data: { key: 'post_l5_nellis' }, next: 'intro' } ],
    },
    about: {
      text: "Nellis: Sire, I steady you. I take the edge off glancing blows, make your reach a bit longer, and slow crowds when they press too close.",
      choices: [ { label: 'Good. Join me.', action: 'join_party', hint: 'Defense · Extended Reach · Steady Pace' }, { label: 'Later.', action: 'end' } ],
    },
    after_aff: {
      text: 'Nellis: Sire, all right. I’ll match your pace.',
      choices: [
        { label: 'Join me.', action: 'join_party', hint: 'Defense · Extended Reach · Steady Pace' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Later.', action: 'end' }
      ],
    },
  },
};

export const urnDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Urn: Mister, I'm Urn. I patch scrapes, keep spirits up, and point out safe steps when the street gets mean. The city looks rough, but we can make it shine again. Want me with you?",
      choices: [
        { label: 'Aurelion is free (L5)', requires: { hasFlag: 'temple_cleansed', missingFlag: 'post_l5_urn' }, next: 'post_l5_urn' },
        { label: 'Yes, join me.', action: 'join_party', hint: 'Burn · Heat Ward' },
        { label: "I like your energy—let's lift together.", action: 'affinity_add', data: { target: 'active', amount: 0.4, flag: 'urn_intro_encourage' }, next: 'after_aff' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Quests', next: 'quests' },
        { label: 'Not right now.', action: 'end' },
      ],
    },
    post_l5_urn: {
      text: "Urn: The stone feels warm again. People can breathe here. Urathar's not done breaking, but we can be louder than he is.",
      choices: [ { label: 'We will.', action: 'set_flag', data: { key: 'post_l5_urn' }, next: 'intro' } ],
    },
    about: {
      text: "Urn: Mister, I lift you up. I give small steady healing, cheer to patch you and make your hands faster for a moment, and mark safer steps so you don’t get clipped.",
      choices: [
        { label: 'Sounds perfect—join me.', action: 'join_party', hint: 'Support · Small Heals · Cheer' },
        { label: 'Maybe later.', action: 'end' },
      ],
    },
    after_aff: {
      text: "Urn: Mister, yes! Okay—short steps, long view. Let's go.",
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'What can you do for us?', next: 'about' }, { label: 'Later.', action: 'end' } ],
    },
    quests: {
      text: 'Urn: Mister, we can make the paths safer. Where do we start?',
      choices: [
        { label: 'Secure the Rooftops (Level 4)', requires: { hasFlag: 'level4_reached', missingFlag: 'urn_rooftops_started' }, next: 'urn_rooftops_intro' },
        { label: 'Turn in: Secure the Rooftops', requires: { flag: 'urn_rooftops_cleared' }, next: 'urn_rooftops_turnin' },
        // Future quest hooks
        { label: 'Rebuild the Lines (Level 6)', requires: { hasFlag: 'level6_reached', missingFlag: 'urn_lines6_started' }, next: 'urn_lines6_locked' },
        { label: 'Guide the Return (Level 7)', requires: { hasFlag: 'level7_reached', missingFlag: 'urn_return7_started' }, next: 'urn_return7_locked' },
        { label: 'Back', action: 'end' },
      ],
    },
    urn_rooftops_intro: {
      text: "Urn: Lurkers camp above the alleys. If we clear a few nests, people can move again.",
      choices: [
        { label: 'Start: Secure the Rooftops', action: 'start_quest', data: { id: 'urn_rooftops' }, next: 'urn_rooftops_started' },
        { label: 'Back', next: 'quests' },
      ],
    },
    urn_rooftops_started: {
      text: 'Urn: Rooftops first. Three nests.',
      choices: [ { label: 'Okay', action: 'end' } ],
    },
    urn_rooftops_turnin: {
      text: 'Urn: Lanes are clearer already. Thank you.',
      choices: [
        { label: 'You did great. (Affinity +0.8)', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'urn_rooftops_reward' }, next: 'urn_rooftops_done' },
      ],
    },
    urn_rooftops_done: {
      text: 'Urn: On to the next street when you are.',
      choices: [ { label: 'Back', action: 'end' }, { label: 'More quests', next: 'quests' } ],
    },
    urn_lines6_locked: {
      text: 'Urn: When the next district opens, we can map safe lines.',
      choices: [ { label: 'Back', next: 'quests' } ],
    },
    urn_return7_locked: {
      text: 'Urn: If people come back, someone should walk beside them.',
      choices: [ { label: 'Back', next: 'quests' } ],
    },
  },
};

export const fanaDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Fana: My Prince, the chains broke when you struck me down—the fire didn't. I burn what clings and shield you with heat when it counts. If you'll have me, I'll fight beside you.",
      choices: [
        { label: 'Yes, join me.', action: 'join_party' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'You’re free now. Breathe, then walk with me.', action: 'affinity_add', data: { target: 'active', amount: 0.6, flag: 'fana_intro_reassure' }, next: 'after_aff' },
        { label: 'Not now.', action: 'end' },
      ],
    },
    about: {
      text: "Fana: My Prince, I burn off what clings to you and throw a warm ward when the crush is heavy. Keep me close and the mess thins out.",
      choices: [ { label: 'Walk with me.', action: 'join_party', hint: 'Burn · Heat Ward' }, { label: 'Later.', action: 'end' } ],
    },
    after_aff: {
      text: "Fana: My Prince, thank you. I'll keep pace—and keep the fire pointed forward.",
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'What can you do for us?', next: 'about' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const fanaFreedDialog = {
  start: 'freed',
  nodes: {
    freed: {
      text: "Fana: My Prince, the sigils are ash. My hands are my own.\nI remember Aurelion's halls—the light, the vows. If you'll have me, I'll help set them right.",
      choices: [
        { label: 'Yes, join me.', action: 'join_party' },
        { label: 'Take a breath. Walk with me when you’re ready.', action: 'affinity_add', data: { target: 'active', amount: 0.6, flag: 'fana_freed_reassure' }, next: 'after_aff' },
        { label: 'Later.', action: 'end' },
      ],
    },
    after_aff: {
      text: "Fana: My Prince, thank you. I won't look back.",
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

// Rose — Queen of Aurelion (non-companion)
export const roseDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Rose: Champion of the city, you have my sovereign gratitude. Aurelion breathes again—its pulse restored, its halls unshackled. Yet rejoice with prudence: Urathar's redoubt remains occluded, and his detachments still desolate the outer demesnes.",
      choices: [
        { label: 'Your Majesty, how fares the Heart?', next: 'heart' },
        { label: 'Any word on Urathar\'s lair?', next: 'lair' },
        { label: 'We\'ll continue the work.', action: 'end' },
      ],
    },
    heart: {
      text: "Rose: The Heart resounds—soft, but true. Sanctifiers cleanse the soot; refugees bivouac in the nave. Your deeds made this possible. I shall not forget it.",
      choices: [ { label: 'And the people?', next: 'people' }, { label: 'Thank you, Your Majesty.', action: 'end' } ],
    },
    people: {
      text: "Rose: They are tired, but less afraid. When the bells toll for them again, it will be because life resumes—not because another edict fell.",
      choices: [ { label: 'We\'ll keep them safe.', action: 'end' } ],
    },
    lair: {
      text: "Rose: Our scouts report roving cadres: ash-cloaks at the threshing villages, tithers on the trade roads. But the locus—the very burrow from which Urathar plots—remains undisclosed. Find it, and we shall close his book.",
      choices: [ { label: 'We\'ll find it.', action: 'end' } ],
    },
  },
};

export const varabellaDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Varabella: Boss man, another brave face in a dead city. I work sightlines and cut angles—I'll extend your shots and keep you standing. Do you want competence or compliments?",
      choices: [
        { label: 'Aurelion is free (L5)', requires: { hasFlag: 'temple_cleansed', missingFlag: 'post_l5_vara' }, next: 'post_l5_vara' },
        { label: 'Competence. Join me.', action: 'join_party', hint: 'Angles · Extended Reach' },
        { label: "Spare the sarcasm; I value sharp eyes.", action: 'affinity_add', data: { target: 'active', amount: 0.4, flag: 'varabella_intro_respect' }, next: 'after_aff' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Quests', next: 'quests' },
        { label: 'Pass.', action: 'end' },
      ],
    },
    post_l5_vara: {
      text: "Varabella: Look at you—breaking chains in a temple. I’m happy for the kid. Don’t get soft; Urathar writes the next ambush while we smile.",
      choices: [ { label: 'Eyes up.', action: 'set_flag', data: { key: 'post_l5_vara' }, next: 'intro' } ],
    },
    about: {
      text: "Varabella: Boss man, I spot angles. I help you hit from a bit farther, raise your chance to land telling blows, and call brief windows where your swings hit harder and farther.",
      choices: [
        { label: 'Good. I need that—join me.', action: 'join_party', hint: 'Angles · Extended Reach' },
        { label: 'Maybe later.', action: 'end' },
      ],
    },
    after_aff: {
      text: "Varabella: Boss man, you listen. Fine—I'll keep you standing.",
      choices: [
        { label: 'Join me.', action: 'join_party', hint: 'Angles · Extended Reach' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Later.', action: 'end' }
      ],
    },
    quests: {
      text: 'Varabella: Boss man, clear sightlines, clean exits. Pick one.',
      choices: [
        { label: 'Cut the Crossfire (Level 4)', requires: { hasFlag: 'level4_reached', missingFlag: 'varabella_crossfire_started' }, next: 'varabella_crossfire_intro' },
        { label: 'Turn in: Cut the Crossfire', requires: { flag: 'varabella_crossfire_cleared' }, next: 'varabella_crossfire_turnin' },
        // Future quest hooks
        { label: 'Angles and Arches (Level 6)', requires: { hasFlag: 'level6_reached', missingFlag: 'varabella_angles6_started' }, next: 'varabella_angles6_locked' },
        { label: 'Watch the Wires (Level 7)', requires: { hasFlag: 'level7_reached', missingFlag: 'varabella_wires7_started' }, next: 'varabella_wires7_locked' },
        { label: 'Back', action: 'end' },
      ],
    },
    varabella_crossfire_intro: {
      text: 'Varabella: Boss man, captains set crossfire in the alleys. Break three posts and the lanes breathe.',
      choices: [
        { label: 'Start: Cut the Crossfire', action: 'start_quest', data: { id: 'varabella_crossfire' }, next: 'varabella_crossfire_started' },
        { label: 'Back', next: 'quests' },
      ],
    },
    varabella_crossfire_started: {
      text: 'Varabella: Boss man, three posts. Quick in, clean out.',
      choices: [ { label: 'Okay', action: 'end' } ],
    },
    varabella_crossfire_turnin: {
      text: 'Varabella: Boss man, better. You left them nothing to aim at.',
      choices: [
        { label: 'We cut a good lane. (Affinity +1.0)', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'varabella_crossfire_reward' }, next: 'varabella_crossfire_done' },
      ],
    },
    varabella_crossfire_done: {
      text: 'Varabella: Boss man, next time, we do it faster.',
      choices: [ { label: 'Back', action: 'end' }, { label: 'More quests', next: 'quests' } ],
    },
    varabella_angles6_locked: {
      text: 'Varabella: Boss man, when the arches open up, we can fix their angles.',
      choices: [ { label: 'Back', next: 'quests' } ],
    },
    varabella_wires7_locked: {
      text: 'Varabella: Boss man, if they string wires again, I\'ll teach them to cut their own.',
      choices: [ { label: 'Back', next: 'quests' } ],
    },
  },
};

export const cowsillDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Cowsill: My Lord, I'm Cowsill—your strike partner. When you hit, I amplify and stagger them for follow‑ups. Team with me and every swing lands harder. Want to team up?",
      choices: [
        { label: 'Aurelion is free (L5)', requires: { hasFlag: 'temple_cleansed', missingFlag: 'post_l5_cowsill' }, next: 'post_l5_cowsill' },
        { label: 'Yes, join me!', action: 'join_party', hint: 'Strike Partner · Amplify · Stagger' },
        { label: "Let's strike as one! (Affinity +0.3)", action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'cowsill_intro_team' }, next: 'after_aff' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Tell me your technique (Affinity 7+)', requires: { target: 'active', min: 7.0 }, next: 'bond' },
        { label: 'Not right now.', action: 'end' },
      ],
    },
    post_l5_cowsill: {
      text: "Cowsill: Temple's free and I am pumped! Next target? Urathar doesn't know what 'relent' means, but neither do we.",
      choices: [ { label: 'Let\'s go.', action: 'set_flag', data: { key: 'post_l5_cowsill' }, next: 'intro' } ],
    },
    about: {
      text: "Cowsill: My Lord, I hit with you. I make your strikes land heavier, sometimes add a second hit, and keep our tempo up so we plow through groups.",
      choices: [ { label: 'Join me.', action: 'join_party', hint: 'Strike Partner · Amplify · Stagger' }, { label: 'Later.', action: 'end' } ],
    },
    after_aff: {
      text: "Cowsill: My Lord, yes! That's the spirit! Together we're unstoppable!",
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'What can you do for us?', next: 'about' }, { label: 'Later.', action: 'end' } ],
    },
    bond: {
      text: "Cowsill: It's all about timing—when you swing, I follow through. Double the impact, half the effort!",
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'What can you do for us?', next: 'about' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const snakeDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Snek: My Lord… ssslither, sssafe. I curl near your heels, make foes drag their feet, and help your bite land harder. Do you want me to coil along?",
      choices: [
        { label: 'Yes, join me.', action: 'join_party', hint: 'Slow Aura · Small Bite' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Start: Clear the Den', requires: { missingFlag: 'snake_den_started' }, next: 'snake_den_intro' },
        { label: 'Turn in: Clear the Den', requires: { hasFlag: 'snake_den_cleared', missingFlag: 'snake_den_done' }, next: 'snake_den_turnin' },
        { label: 'Not now.', action: 'end' },
      ],
    },
    about: {
      text: "Snek: My Lord, I make enemies near you move ssslower and sharpen your bite a little. Stay close and fights feel sssofter.",
      choices: [ { label: 'Join me.', action: 'join_party', hint: 'Slow Aura · Small Bite' }, { label: 'Later.', action: 'end' } ],
    },
    snake_den_intro: {
      text: "Snek: Three pests, close by. We ssslip in, sssnap fast, and they sssilence.",
      choices: [
        { label: 'Coil and go.', action: 'start_quest', data: { id: 'snake_den' }, next: 'snake_den_started' },
        { label: 'Another time.', next: 'intro' },
      ],
    },
    snake_den_started: {
      text: "Snek: Their den is marked. Cull three, and I will be pleasssed.",
      choices: [ { label: 'Back', next: 'intro' } ],
    },
    snake_den_turnin: {
      text: "Snek: Yesss. Clean earth. Your bite is better already.",
      choices: [
        { label: 'Good hunt. (Affinity +0.8)', action: 'affinity_add', data: { target: 'active', amount: 0.8, flag: 'snake_den_reward' }, next: 'snake_den_done' },
      ],
    },
    snake_den_done: {
      text: "Snek: I curl closer to your heelss."
      ,
      choices: [ { label: 'Back', action: 'set_flag', data: { key: 'snake_den_done' }, next: 'intro' } ],
    },
  },
};
