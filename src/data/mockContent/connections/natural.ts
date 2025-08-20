import { MockConnection } from '../../../ai/mockAIEngine';

export const naturalConnections: MockConnection[] = [
  {
    id: 'forest_path',
    description: 'A winding forest path disappears between the trees',
    style: 'natural',
    themes: ['forest', 'wilderness', 'organic'],
    rarity: 0.1,
    bidirectional: true,
    reverseDescription: 'A forest path leading back'
  },
  {
    id: 'stream_crossing',
    description: 'Stepping stones cross a babbling stream',
    style: 'natural',
    themes: ['water', 'crossing', 'peaceful'],
    rarity: 0.3,
    bidirectional: true,
    reverseDescription: 'Stone steps across the stream'
  },
  {
    id: 'cave_opening',
    description: 'A dark cave opening in the rock face',
    style: 'natural',
    themes: ['cave', 'underground', 'mysterious'],
    rarity: 0.4,
    bidirectional: true,
    reverseDescription: 'The cave entrance leading out'
  },
  {
    id: 'root_bridge',
    description: 'Massive tree roots form a natural bridge',
    style: 'natural',
    themes: ['forest', 'ancient', 'organic'],
    rarity: 0.5,
    bidirectional: true,
    reverseDescription: 'The root bridge spanning back'
  },
  {
    id: 'rock_ledge',
    description: 'A narrow ledge winds around the rock face',
    style: 'natural',
    themes: ['mountain', 'precarious', 'vertical'],
    rarity: 0.6,
    bidirectional: true,
    reverseDescription: 'The ledge continuing around'
  },
  {
    id: 'meadow_trail',
    description: 'A gentle trail through wildflower meadows',
    style: 'natural',
    themes: ['meadow', 'peaceful', 'flowers'],
    rarity: 0.2,
    bidirectional: true,
    reverseDescription: 'The meadow trail winding back'
  },
  {
    id: 'fallen_log',
    description: 'A massive fallen tree trunk crosses the gap',
    style: 'natural',
    themes: ['forest', 'crossing', 'fallen'],
    rarity: 0.3,
    bidirectional: true,
    reverseDescription: 'The fallen log bridge'
  },
  {
    id: 'deer_trail',
    description: 'A narrow trail worn by passing deer',
    style: 'natural',
    themes: ['wildlife', 'subtle', 'animal'],
    rarity: 0.2,
    bidirectional: true,
    reverseDescription: 'The deer trail heading back'
  },
  {
    id: 'underground_stream',
    description: 'An underground stream flows into darkness',
    style: 'natural',
    themes: ['cave', 'water', 'underground'],
    rarity: 0.5,
    bidirectional: true,
    reverseDescription: 'The stream flowing back'
  },
  {
    id: 'crystal_tunnel',
    description: 'A tunnel lined with gleaming crystals',
    style: 'natural',
    themes: ['cave', 'crystal', 'beautiful'],
    rarity: 0.7,
    bidirectional: true,
    reverseDescription: 'The crystal-lined passage back'
  }
];