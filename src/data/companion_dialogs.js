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
          { label: 'Back to companions', action: 'companion_back' },
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
          { label: 'Back to companions', action: 'companion_back' },
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
          { label: 'Back to companions', action: 'companion_back' },
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
    },
  },
};
