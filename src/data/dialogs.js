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
        { label: 'Not right now.', action: 'end' },
      ],
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
        { label: 'Not now.', action: 'end' },
      ],
    },
  },
};
