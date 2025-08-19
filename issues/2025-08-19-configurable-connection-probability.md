# Configurable Connection Probability for Room Generation

**Date**: 2025-08-19  
**Priority**: Medium  
**Status**: Open  
**Type**: Enhancement  

## Problem Statement

Currently, the AI room generation system uses a fixed prompt requesting "2-4 total connections with thematic names". This creates predictable room layouts with limited variety in connectivity. Players experience mostly linear progression rather than rich exploration networks.

**Current Limitations:**
- Fixed connection count range (2-4) creates monotonous room layouts
- No dead-end rooms for atmospheric variety (treasure vaults, private chambers)
- No hub rooms with many connections (town squares, grand halls)
- Limited exploration complexity and branching paths

## Proposed Solution

Replace the fixed connection count with configurable probability-based generation using simple dice mechanics that AI can understand and implement naturally.

### Core Changes

**Replace current AI prompt instruction:**
```
- Generate 2-4 total connections with thematic names
```

**With configurable probability-based instruction:**
```
- CONNECTION COUNT: ${process.env.DEAD_END_CHANCE || '5'}% chance the room has only one connection back where you came from. Otherwise, roll ${process.env.CONNECTION_DICE || '2d4'} for total number of connections (including the return path).
- DIRECTIONS: Choose cardinal directions (north, south, east, west, up, down) or thematic connections (bookshelf, tapestry, hidden door, etc.)
```

### Environment Variables

Add new configuration options:

```bash
# Connection generation probabilities
DEAD_END_CHANCE=5           # Percentage chance for dead-end rooms
CONNECTION_DICE=2d4         # Dice roll for connection count
```

### Expected Probability Distribution

With default `2d4` dice roll:
- 2 connections: ~6% chance (minimal rooms)
- 3 connections: ~12% chance  
- 4 connections: ~19% chance
- 5 connections: ~25% chance (peak)
- 6 connections: ~19% chance
- 7 connections: ~12% chance
- 8 connections: ~6% chance (hub rooms)

Plus 5% chance for true dead-end rooms (1 connection back).

## Implementation Details

### Files to Modify

1. **`src/ai/grokClient.ts`** (lines ~220)
   - Update room generation prompt with configurable connection logic
   - Replace fixed "2-4 total connections" text

### Configuration Examples

```bash
# More dead-ends for atmospheric variety
DEAD_END_CHANCE=10
CONNECTION_DICE=2d4

# Tighter connection range (4-7 connections)
DEAD_END_CHANCE=5
CONNECTION_DICE=1d4+3

# Flat distribution (3-8 connections)
DEAD_END_CHANCE=5
CONNECTION_DICE=1d6+2

# More hub rooms (3-9 connections, higher average)
DEAD_END_CHANCE=3
CONNECTION_DICE=3d3
```

## Benefits

1. **Rich Exploration Networks**: Variable connection counts create complex, interesting world layouts
2. **Atmospheric Variety**: Dead-end rooms provide tension and reward discovery
3. **Hub Locations**: Rooms with many connections create natural gathering points
4. **Easy Tuning**: Environment variables allow quick adjustment without code changes
5. **AI-Friendly**: Dice mechanics are intuitive for AI to understand and implement

## Testing Strategy

1. **Generate 100 rooms** with default settings and verify connection distribution
2. **Test environment variable changes** affect generation as expected
3. **Verify backward compatibility** with existing games
4. **Validate AI understanding** of dice mechanics in prompts

## Success Metrics

- Connection count distribution matches expected dice probabilities
- Increased variety in room layouts and exploration paths
- No regression in room generation quality or coherence
- Environment variables successfully control generation behavior

## Risks

- **AI Misunderstanding**: AI might not properly implement dice mechanics
  - **Mitigation**: Test thoroughly and provide clear examples
- **World Balance**: Too many dead-ends could frustrate players
  - **Mitigation**: Conservative defaults with easy tuning

This enhancement will significantly improve world generation variety while maintaining the existing connection-based generation architecture.