# Balanced Room Fantasy Levels Specification

## Overview

This specification defines the implementation of a balanced fantasy level distribution system for AI room generation in Shadow Kingdom. The goal is to create a more immersive experience where fantastical elements feel special and impactful by contrasting them with more mundane, grounded environments.

## Problem Statement

Currently, all AI-generated rooms tend to be highly fantastical and magical, creating an overwhelmingly mystical world where truly special areas lose their impact due to lack of contrast.

## Solution

Implement a fantasy level distribution system that guides AI generation to create:
- **70% mundane/normal rooms**: Ordinary castle rooms, hallways, storage areas, basic chambers
- **30% fantastical/magical rooms**: Unique, mysterious, or magical areas that stand out

## Technical Implementation

### 1. Fantasy Level Enum

Create a fantasy level system to categorize room types:

```typescript
enum FantasyLevel {
  MUNDANE = 'mundane',    // 70% probability
  FANTASTICAL = 'fantastical'  // 30% probability
}
```

### 2. Room Generation Service Updates

#### 2.1 Fantasy Level Selection
- Add logic to `RoomGenerationService` to determine fantasy level before generation
- Use weighted random selection: 70% mundane, 30% fantastical
- Consider region-specific modifiers (some regions might have different distributions)

#### 2.2 AI Prompt Enhancement
Update AI prompts to include fantasy level guidance:

**For Mundane Rooms (70%):**
```
Generate a practical, realistic room that serves a clear purpose in a medieval fantasy castle. Focus on:
- Standard architectural features
- Functional spaces (guard rooms, storage, hallways, chambers)
- Basic furnishings and practical items
- Minimal magical elements
- Grounded, believable descriptions
```

**For Fantastical Rooms (30%):**
```
Generate a magical, mysterious, or uniquely fantastical room that stands out. Include:
- Magical elements, enchantments, or mystical features
- Unusual architectural details
- Mysterious artifacts or phenomena
- Memorable and atmospheric descriptions
- Elements that inspire wonder or intrigue
```

### 3. Database Schema Updates

#### 3.1 Rooms Table Enhancement
Add fantasy level tracking to rooms:

```sql
ALTER TABLE rooms ADD COLUMN fantasy_level TEXT DEFAULT 'mundane';
```

#### 3.2 Migration Logic
- Add migration to update existing rooms with appropriate fantasy levels
- Analyze current room descriptions to categorize existing content

### 4. Service Integration Points

#### 4.1 Background Generation Service
- Integrate fantasy level selection into background generation
- Ensure distribution maintains across all generation triggers

#### 4.2 Region Service Integration
- Allow regions to influence fantasy level distribution
- Some regions (e.g., "Ancient Library") might have higher fantastical percentages
- Maintain overall game balance across all regions

#### 4.3 Grok Client Updates
- Update prompt templates to include fantasy level context
- Ensure fallback responses respect fantasy level guidelines
- Add fantasy level to generation context

### 5. Quality Assurance

#### 5.1 Distribution Tracking
- Add logging to track fantasy level distribution
- Implement analytics to verify 70/30 split is maintained
- Alert if distribution deviates significantly

#### 5.2 Content Quality Metrics
- Monitor generated content for adherence to fantasy level guidelines
- Implement feedback system to improve prompt effectiveness

## Implementation Steps

### Phase 1: Core Infrastructure
1. Add fantasy level enum and types
2. Update database schema with migration
3. Implement fantasy level selection logic

### Phase 2: AI Integration
4. Update Grok client with enhanced prompts
5. Integrate fantasy level into room generation service
6. Update background generation service

### Phase 3: Quality & Testing
7. Add distribution tracking and logging
8. Implement comprehensive testing
9. Validate fantasy level adherence in generated content

### Phase 4: Region Integration
10. Add region-specific fantasy level modifiers
11. Update region service integration
12. Fine-tune distribution based on region themes

## Testing Strategy

### Unit Tests
- Fantasy level selection logic
- Prompt generation with different fantasy levels
- Database operations for fantasy level tracking

### Integration Tests
- End-to-end room generation with fantasy levels
- Distribution verification over multiple generations
- Region-specific fantasy level behavior

### Content Quality Tests
- Verify mundane rooms lack excessive magical elements
- Verify fantastical rooms include appropriate magical content
- Test prompt effectiveness with AI generation

## Acceptance Criteria

- [ ] Fantasy level enum and selection system implemented
- [ ] Database schema updated with fantasy level tracking
- [ ] AI prompts include fantasy level guidance
- [ ] 70/30 distribution maintained across generations
- [ ] Mundane rooms feel grounded and practical
- [ ] Fantastical rooms feel special and memorable
- [ ] Region-specific modifiers work correctly
- [ ] Comprehensive test coverage implemented
- [ ] Distribution tracking and analytics functional

## Files to Modify

### Core Services
- `src/services/roomGenerationService.ts` - Add fantasy level logic
- `src/services/backgroundGenerationService.ts` - Integrate fantasy level selection
- `src/ai/grokClient.ts` - Update prompts and generation context

### Database
- `src/utils/initDb.ts` - Add schema migration
- Database migration scripts

### Types
- `src/types/` - Add fantasy level types and interfaces

### Tests
- `tests/services/roomGenerationService.test.ts` - Fantasy level testing
- `tests/ai/grokClient.test.ts` - Prompt testing
- New integration tests for distribution verification

## Success Metrics

- 70/30 distribution maintained within ±5% tolerance
- Player feedback indicates improved world immersion
- Fantastical areas feel more impactful and memorable
- No regression in overall generation quality
- System maintains performance with additional logic