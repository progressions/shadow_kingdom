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
        { label: 'Not right now.', action: 'end' },
      ],
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
  },
};
