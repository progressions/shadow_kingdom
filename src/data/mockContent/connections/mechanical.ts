import { MockConnection } from '../../../ai/mockAIEngine';

export const mechanicalConnections: MockConnection[] = [
  {
    id: 'rotating_bookcase',
    description: 'A bookcase that rotates to reveal a hidden passage',
    style: 'mechanical',
    themes: ['hidden', 'books', 'secret'],
    rarity: 0.7,
    bidirectional: true,
    reverseDescription: 'The bookcase rotating back into place'
  },
  {
    id: 'stone_pressure_plate',
    description: 'A stone pressure plate activates hidden mechanisms',
    style: 'mechanical',
    themes: ['ancient', 'pressure', 'trap'],
    rarity: 0.6,
    bidirectional: true,
    reverseDescription: 'The pressure plate mechanism'
  },
  {
    id: 'gear_door',
    description: 'A circular door operated by visible gears and clockwork',
    style: 'mechanical',
    themes: ['clockwork', 'gears', 'industrial'],
    rarity: 0.8,
    bidirectional: true,
    reverseDescription: 'The gear-operated door'
  },
  {
    id: 'pulley_lift',
    description: 'A rope and pulley system provides vertical access',
    style: 'mechanical',
    themes: ['vertical', 'rope', 'manual'],
    rarity: 0.5,
    bidirectional: true,
    reverseDescription: 'The pulley system leading down'
  },
  {
    id: 'drawbridge',
    description: 'A wooden drawbridge operated by chains and counterweights',
    style: 'mechanical',
    themes: ['bridge', 'chains', 'medieval'],
    rarity: 0.6,
    bidirectional: true,
    reverseDescription: 'The drawbridge spanning back'
  },
  {
    id: 'water_lock',
    description: 'A chamber that fills with water to raise or lower passage',
    style: 'mechanical',
    themes: ['water', 'engineering', 'lock'],
    rarity: 0.8,
    bidirectional: true,
    reverseDescription: 'The water lock chamber'
  },
  {
    id: 'weighted_lever',
    description: 'A heavy lever requiring significant force to operate',
    style: 'mechanical',
    themes: ['lever', 'strength', 'manual'],
    rarity: 0.4,
    bidirectional: true,
    reverseDescription: 'The weighted lever mechanism'
  },
  {
    id: 'sliding_panel',
    description: 'A wall panel that slides aside on hidden tracks',
    style: 'mechanical',
    themes: ['hidden', 'sliding', 'tracks'],
    rarity: 0.6,
    bidirectional: true,
    reverseDescription: 'The sliding panel in the wall'
  },
  {
    id: 'counterweight_door',
    description: 'A massive door balanced by intricate counterweights',
    style: 'mechanical',
    themes: ['counterweight', 'balance', 'heavy'],
    rarity: 0.7,
    bidirectional: true,
    reverseDescription: 'The counterweighted door'
  },
  {
    id: 'mine_cart_track',
    description: 'Old mine cart tracks leading into darkness',
    style: 'mechanical',
    themes: ['mining', 'rails', 'industrial'],
    rarity: 0.5,
    bidirectional: true,
    reverseDescription: 'The mine cart rails heading back'
  }
];