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
