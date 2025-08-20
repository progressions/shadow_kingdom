import { MockConnection } from '../../../ai/mockAIEngine';

export const architecturalConnections: MockConnection[] = [
  {
    id: 'ornate_doorway',
    description: 'An ornate doorway carved with intricate patterns',
    style: 'architectural',
    themes: ['formal', 'decorative', 'mansion'],
    rarity: 0.3,
    bidirectional: true,
    reverseDescription: 'A beautifully carved doorway leading back'
  },
  {
    id: 'marble_archway',
    description: 'A grand marble archway with classical columns',
    style: 'architectural',
    themes: ['luxurious', 'formal', 'grand'],
    rarity: 0.4,
    bidirectional: true,
    reverseDescription: 'An impressive marble arch'
  },
  {
    id: 'stone_stairs',
    description: 'Worn stone steps leading down',
    style: 'architectural',
    themes: ['ancient', 'stone', 'vertical'],
    rarity: 0.2,
    bidirectional: true,
    reverseDescription: 'Stone steps leading up'
  },
  {
    id: 'wooden_door',
    description: 'A simple wooden door',
    style: 'architectural',
    themes: ['rustic', 'simple', 'common'],
    rarity: 0.1,
    bidirectional: true,
    reverseDescription: 'A wooden door'
  },
  {
    id: 'iron_gate',
    description: 'A heavy iron gate with intricate metalwork',
    style: 'architectural',
    themes: ['secure', 'metal', 'barrier'],
    rarity: 0.5,
    bidirectional: true,
    reverseDescription: 'An iron gate leading back'
  },
  {
    id: 'spiral_staircase',
    description: 'A narrow spiral staircase winding upward',
    style: 'architectural',
    themes: ['tower', 'vertical', 'narrow'],
    rarity: 0.6,
    bidirectional: true,
    reverseDescription: 'A spiral staircase descending'
  },
  {
    id: 'corridor',
    description: 'A long corridor stretching ahead',
    style: 'architectural',
    themes: ['passage', 'connecting', 'linear'],
    rarity: 0.1,
    bidirectional: true,
    reverseDescription: 'A corridor leading back'
  },
  {
    id: 'balcony_door',
    description: 'French doors opening onto a balcony',
    style: 'architectural',
    themes: ['outdoor', 'elegant', 'light'],
    rarity: 0.4,
    bidirectional: true,
    reverseDescription: 'Doors leading back inside'
  },
  {
    id: 'cellar_entrance',
    description: 'A sturdy door leading to the cellar',
    style: 'architectural',
    themes: ['underground', 'storage', 'descent'],
    rarity: 0.3,
    bidirectional: true,
    reverseDescription: 'Stairs leading up from the cellar'
  },
  {
    id: 'service_door',
    description: 'A plain service door for staff use',
    style: 'architectural',
    themes: ['functional', 'servants', 'practical'],
    rarity: 0.2,
    bidirectional: true,
    reverseDescription: 'A service door'
  }
];