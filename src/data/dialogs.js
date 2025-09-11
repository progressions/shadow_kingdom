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
      text: 'Hi! I\'m Canopy. Would you like me to join you?',
      choices: [
        { label: 'Yes, join me.', action: 'join_party' },
        { label: 'You can lean on me, I\'ve got you.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'canopy_intro_encourage' }, next: 'after_aff' },
        { label: 'Share a plan (Affinity 7+)', requires: { target: 'active', min: 7.0 }, next: 'bond' },
        { label: 'Not right now.', action: 'end' },
      ],
    },
    after_aff: {
      text: 'Canopy: Thank you. I\'ll do my best to keep everyone whole.',
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
    bond: {
      text: 'Canopy: A good plan is a steady breath. I\'m with you.',
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const yornaDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: 'Name\'s Yorna. The road ahead is rough. Need a hand?',
      choices: [
        { label: 'Yes, join me.', action: 'join_party' },
        { label: 'What can you do?', next: 'skills' },
        { label: 'You hit hard; I\'ll keep the lane open.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'yorna_intro_encourage' }, next: 'after_aff' },
        { label: 'Trade tactics (Affinity 7+)', requires: { target: 'active', min: 7.0 }, next: 'bond' },
        { label: 'No thanks.', action: 'end' },
      ],
    },
    skills: {
      text: 'I\'m quick on my feet and good at scouting paths.',
      choices: [
        { label: 'Sounds great — join me.', action: 'join_party' },
        { label: 'Maybe later.', action: 'end' },
      ],
    },
    after_aff: {
      text: 'Yorna: That\'s the way—clear space and we\'ll bulldoze through.',
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
    bond: {
      text: 'Yorna: I like how you think. I\'ll match your pace.',
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const holaDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: 'Hola. I can keep pace and watch your back. Shall I come?',
      choices: [
        { label: 'Yes, please join.', action: 'join_party' },
        { label: 'Tell me about yourself.', next: 'about' },
        { label: 'You\'re doing fine. Stay close and speak up if you need.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'hola_intro_encourage' }, next: 'after_aff' },
        { label: 'Practice a formation (Affinity 7+)', requires: { target: 'active', min: 7.0 }, next: 'bond' },
        { label: 'Not now.', action: 'end' },
      ],
    },
    about: {
      text: 'I\'m steady and patient. I won\'t slow you down.',
      choices: [
        { label: 'Alright, join me.', action: 'join_party' },
        { label: 'Maybe later.', action: 'end' },
      ],
    },
    after_aff: {
      text: 'Hola: Okay… I\'ll try to keep pace. Thank you.',
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
    bond: {
      text: 'Hola: That helps. If we keep it simple, I\'ll be ready.',
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const oyinDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Oyin: I—I'm not great with crowds. But I can try to help. If you want me… I can come along.",
      choices: [
        { label: 'Yes, join me.', action: 'join_party' },
        { label: 'You’re doing fine; breathe and stay with me.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'oyin_intro_encourage' }, next: 'after_aff' },
        { label: 'Not right now.', action: 'end' },
      ],
    },
    after_aff: {
      text: 'Oyin: Thanks… I can try a little longer if you lead.',
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const twilDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Twil: Tracks are fresh and you look slow. Kidding. You want me along or what?",
      choices: [
        { label: 'Yes, join me.', action: 'join_party' },
        { label: 'Your read is sharp; call the line and I’ll follow.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'twil_intro_encourage' }, next: 'after_aff' },
        { label: 'Not now.', action: 'end' },
      ],
    },
    after_aff: {
      text: 'Twil: Ha—nice. Keep up and I’ll make it easy.',
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const tinDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Tin: I can help scout the marsh. Want me on the path?",
      choices: [
        { label: 'Yes, join me.', action: 'join_party' },
        { label: 'Take point and sing out. I’ll keep space clear.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'tin_intro_encourage' }, next: 'after_aff' },
        { label: 'Maybe later.', action: 'end' },
      ],
    },
    after_aff: {
      text: 'Tin: Got it—short steps and wide eyes. Let’s move.',
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const nellisDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Nellis: You look like you could use a hand. Should I come along?",
      choices: [
        { label: 'Yes, join me.', action: 'join_party' },
        { label: 'Stay near and mirror me—we’ll be fine.', action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'nellis_intro_encourage' }, next: 'after_aff' },
        { label: 'Not right now.', action: 'end' },
      ],
    },
    after_aff: {
      text: 'Nellis: All right. I’ll match your pace.',
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const urnDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Urn: Hi! I'm Urn. The city looks rough, but we can make it shine again. Want me with you?",
      choices: [
        { label: 'Yes, join me.', action: 'join_party' },
        { label: "I like your energy—let's lift together.", action: 'affinity_add', data: { target: 'active', amount: 0.4, flag: 'urn_intro_encourage' }, next: 'after_aff' },
        { label: 'Tell me what you do.', next: 'about' },
        { label: 'Quests', next: 'quests' },
        { label: 'Not right now.', action: 'end' },
      ],
    },
    about: {
      text: "Urn: I grew up on these streets. When the city fell, I hid in the arches and waited out the worst. That's where I met Varabella—we kept each other moving. I keep eyes up and steps light, and I can mark safe paths and keep spirits up.",
      choices: [
        { label: 'Sounds perfect—join me.', action: 'join_party' },
        { label: 'Maybe later.', action: 'end' },
      ],
    },
    after_aff: {
      text: "Urn: Yes! Okay—short steps, long view. Let's go.",
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
    quests: {
      text: 'Urn: We can make the paths safer. Where do we start?',
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
      text: "Fana: The chains broke when you struck me down. I won't wear them again. If you'll have me, I'll fight beside you.",
      choices: [
        { label: 'Yes, join me.', action: 'join_party' },
        { label: 'You’re free now. Breathe, then walk with me.', action: 'affinity_add', data: { target: 'active', amount: 0.6, flag: 'fana_intro_reassure' }, next: 'after_aff' },
        { label: 'Not now.', action: 'end' },
      ],
    },
    after_aff: {
      text: "Fana: Thank you. I'll keep pace—and keep the fire pointed forward.",
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const fanaFreedDialog = {
  start: 'freed',
  nodes: {
    freed: {
      text: "Fana: The sigils are ash. My hands are my own.\nI remember Aurelion's halls—the light, the vows. If you'll have me, I'll help set them right.",
      choices: [
        { label: 'Yes, join me.', action: 'join_party' },
        { label: 'Take a breath. Walk with me when you’re ready.', action: 'affinity_add', data: { target: 'active', amount: 0.6, flag: 'fana_freed_reassure' }, next: 'after_aff' },
        { label: 'Later.', action: 'end' },
      ],
    },
    after_aff: {
      text: "Fana: Thank you. I won't look back.",
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
  },
};

export const varabellaDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Varabella: Another brave face in a dead city. Do you want competence or compliments?",
      choices: [
        { label: 'Competence. Join me.', action: 'join_party' },
        { label: "Spare the sarcasm; I value sharp eyes.", action: 'affinity_add', data: { target: 'active', amount: 0.4, flag: 'varabella_intro_respect' }, next: 'after_aff' },
        { label: 'What can you do for us?', next: 'about' },
        { label: 'Quests', next: 'quests' },
        { label: 'Pass.', action: 'end' },
      ],
    },
    about: {
      text: "Varabella: I had a window over the plaza when it cracked. I learned where to stand and when to move, because staying put gets you eaten. Urn and I found each other in the ruins and refused to die alone. Sightlines, angles, timing. I cut openings—and I don't miss the exit.",
      choices: [
        { label: 'Good. I need that—join me.', action: 'join_party' },
        { label: 'Maybe later.', action: 'end' },
      ],
    },
    after_aff: {
      text: "Varabella: Huh. You listen. Fine—I'll keep you standing.",
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
    quests: {
      text: 'Varabella: Clear sightlines, clean exits. Pick one.',
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
      text: 'Varabella: Captains set crossfire in the alleys. Break three posts and the lanes breathe.',
      choices: [
        { label: 'Start: Cut the Crossfire', action: 'start_quest', data: { id: 'varabella_crossfire' }, next: 'varabella_crossfire_started' },
        { label: 'Back', next: 'quests' },
      ],
    },
    varabella_crossfire_started: {
      text: 'Varabella: Three posts. Quick in, clean out.',
      choices: [ { label: 'Okay', action: 'end' } ],
    },
    varabella_crossfire_turnin: {
      text: 'Varabella: Better. You left them nothing to aim at.',
      choices: [
        { label: 'We cut a good lane. (Affinity +1.0)', action: 'affinity_add', data: { target: 'active', amount: 1.0, flag: 'varabella_crossfire_reward' }, next: 'varabella_crossfire_done' },
      ],
    },
    varabella_crossfire_done: {
      text: 'Varabella: Next time, we do it faster.',
      choices: [ { label: 'Back', action: 'end' }, { label: 'More quests', next: 'quests' } ],
    },
    varabella_angles6_locked: {
      text: 'Varabella: When the arches open up, we can fix their angles.',
      choices: [ { label: 'Back', next: 'quests' } ],
    },
    varabella_wires7_locked: {
      text: 'Varabella: If they string wires again, I\'ll teach them to cut their own.',
      choices: [ { label: 'Back', next: 'quests' } ],
    },
  },
};

export const cowsillDialog = {
  start: 'intro',
  nodes: {
    intro: {
      text: "Cowsill: Hey! I'm Cowsill! Want to team up? When we strike together, we hit way harder!",
      choices: [
        { label: 'Yes, join me!', action: 'join_party' },
        { label: "Let's strike as one! (Affinity +0.3)", action: 'affinity_add', data: { target: 'active', amount: 0.3, flag: 'cowsill_intro_team' }, next: 'after_aff' },
        { label: 'Tell me your technique (Affinity 7+)', requires: { target: 'active', min: 7.0 }, next: 'bond' },
        { label: 'Not right now.', action: 'end' },
      ],
    },
    after_aff: {
      text: "Cowsill: Yes! That's the spirit! Together we're unstoppable!",
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
    bond: {
      text: "Cowsill: It's all about timing—when you swing, I follow through. Double the impact, half the effort!",
      choices: [ { label: 'Join me.', action: 'join_party' }, { label: 'Later.', action: 'end' } ],
    },
  },
};
