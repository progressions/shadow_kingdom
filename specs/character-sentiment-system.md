# Character Sentiment System Specification

## Overview
Replace the binary `is_hostile` system with a comprehensive sentiment-based system that allows for nuanced character interactions and dynamic relationship changes. Implementation follows **Test-Driven Development (TDD)** methodology with AI integration for intelligent character behavior.

## System Goals
- Replace boolean `is_hostile` with 5-level sentiment system
- Enable dynamic relationship changes based on player actions
- Integrate AI-driven sentiment selection during character creation
- Create contextually appropriate character behaviors
- Maintain backward compatibility during transition

## Sentiment Levels
```typescript
enum CharacterSentiment {
  HOSTILE = 'hostile',      // -2: Actively aggressive, attacks on sight
  AGGRESSIVE = 'aggressive', // -1: Will fight if provoked, blocks passage
  INDIFFERENT = 'indifferent', // 0: Neutral, allows passage
  FRIENDLY = 'friendly',    // +1: Helpful responses, assists player
  ALLIED = 'allied'         // +2: Actively supports and protects player
}
```

## Behavioral Matrix

| Sentiment | Movement Blocking | Combat Response | Dialogue Tone | Give Response |
|-----------|------------------|-----------------|---------------|---------------|
| HOSTILE | Yes | Attacks immediately | Aggressive threats | Rejects/attacks |
| AGGRESSIVE | Yes | Fights when attacked | Unfriendly warnings | Reluctant |
| INDIFFERENT | No | Defends when attacked | Neutral responses | Transactional |
| FRIENDLY | No | Avoids combat | Helpful/warm | Appreciative |
| ALLIED | No | Assists player | Supportive/loyal | Grateful |

## TDD Development Process
Each phase follows the Red-Green-Refactor-Commit cycle:
1. **Red**: Write failing tests for new functionality
2. **Green**: Write minimal code to make tests pass
3. **Refactor**: Clean up code while maintaining green tests
4. **Verify**: Run full test suite to ensure no regressions
5. **Commit**: Atomic commit with descriptive message

---

## Phase 1: Database Schema Update

**Goal**: Add sentiment column with backward compatibility

**Database Changes**:
```sql
ALTER TABLE characters ADD COLUMN sentiment TEXT DEFAULT 'indifferent';
-- Keep is_hostile during transition
```

**Tests**: `tests/database/sentiment-schema.test.ts`
- Verify sentiment column exists with default value
- Ensure backward compatibility with is_hostile
- Test migration on existing data

**Deliverable**: Database supports sentiment storage

---

## Phase 2: TypeScript Type Definitions

**Goal**: Define sentiment enums and interfaces

**Code Changes**: `src/types/character.ts`
```typescript
export enum CharacterSentiment {
  HOSTILE = 'hostile',
  AGGRESSIVE = 'aggressive',
  INDIFFERENT = 'indifferent',
  FRIENDLY = 'friendly',
  ALLIED = 'allied'
}

export interface Character {
  sentiment: CharacterSentiment;
  is_hostile: boolean; // @deprecated
}
```

**Tests**: `tests/types/character-sentiment.test.ts`
- Validate enum values
- Test interface compatibility
- Verify type safety

**Deliverable**: Type-safe sentiment system

---

## Phase 3: Sentiment Helper Functions

**Goal**: Core sentiment manipulation functions

**Code Changes**: `src/services/characterService.ts`
```typescript
async getSentiment(characterId: number): Promise<CharacterSentiment>
async setSentiment(characterId: number, sentiment: CharacterSentiment): Promise<void>
async changeSentiment(characterId: number, delta: number): Promise<CharacterSentiment>
isHostileToPlayer(sentiment: CharacterSentiment): boolean
```

**Tests**: `tests/services/character-sentiment.test.ts`
- Test CRUD operations for sentiment
- Verify sentiment delta changes
- Test hostility determination logic

**Deliverable**: Robust sentiment management API

---

## Phase 4: Character Generation Integration

**Goal**: Set appropriate default sentiments

**Code Changes**: `src/services/characterGenerationService.ts`
- Enemy types → `aggressive` default
- NPC types → `indifferent` default
- Include sentiment in generation context

**Tests**: `tests/services/character-generation-sentiment.test.ts`
- Verify type-based sentiment assignment
- Test fallback logic

**Deliverable**: New characters have contextually appropriate sentiments

---

## Phase 5: Attack Command Sentiment Update

**Goal**: Attacking changes target sentiment to hostile

**Code Changes**: `src/gameController.ts`
```typescript
// After successful attack
await this.characterService.setSentiment(character.id, CharacterSentiment.HOSTILE);
```

**Tests**: `tests/commands/attack-sentiment.test.ts`
- Verify sentiment change after attack
- Test dead character edge cases
- Ensure combat state transitions

**Deliverable**: Combat creates meaningful relationship changes

---

## Phase 6: Movement Blocking with Sentiment

**Goal**: Replace is_hostile with sentiment-based blocking

**Code Changes**: 
- `src/gameController.ts`: Movement command updates
- `src/services/gameStateManager.ts`: Blocking logic

**Tests**: `tests/movement/sentiment-blocking.test.ts`
- Test HOSTILE/AGGRESSIVE blocking
- Verify INDIFFERENT+ allows passage
- Edge case testing

**Deliverable**: Movement system uses sentiment logic

---

## Phase 7: Talk Command Sentiment Integration

**Goal**: Character responses reflect sentiment

**Code Changes**: `src/gameController.ts`
- Include sentiment in AI dialogue prompts
- Sentiment-based fallback responses

**Tests**: `tests/commands/talk-sentiment.test.ts`
- Verify sentiment-appropriate dialogue
- Test AI prompt inclusion
- Fallback response validation

**Deliverable**: Conversations reflect relationship state

---

## Phase 8: Character Display Updates

**Goal**: Visual sentiment indicators

**Code Changes**: `src/services/roomDisplayService.ts`
```typescript
// Sentiment icons
⚔️ Name ⚔️ (hostile)
🗡️ Name (aggressive)  
👤 Name (indifferent)
😊 Name (friendly)
🤝 Name (allied)
```

**Tests**: `tests/display/sentiment-indicators.test.ts`
- Test icon assignment
- Verify display formatting
- Accessibility considerations

**Deliverable**: Players can see character sentiments at a glance

---

## Phase 9: Migration from is_hostile

**Goal**: Convert existing data to sentiment system

**Code Changes**: `src/utils/initDb.ts`
```sql
-- Migration logic
UPDATE characters 
SET sentiment = CASE 
  WHEN is_hostile = 1 THEN 'aggressive'
  ELSE 'indifferent' 
END;
```

**Tests**: `tests/migration/sentiment-migration.test.ts`
- Test data conversion accuracy
- Verify no data loss
- Edge case handling

**Deliverable**: Existing characters properly migrated

---

## Phase 10: Remove is_hostile Column

**Goal**: Clean up deprecated column

**Code Changes**: Multiple files
- Remove is_hostile from schema
- Delete all is_hostile references
- Update interfaces

**Tests**: `tests/cleanup/is-hostile-removal.test.ts`
- Verify complete removal
- Test system functionality
- No regression validation

**Deliverable**: Clean sentiment-only system

---

## Phase 11: Give Command Sentiment Improvement

**Goal**: Gifts improve relationships

**Code Changes**: `src/gameController.ts`
```typescript
// In handleGiveCommand
const sentimentImprovement = calculateItemSentimentValue(item);
await this.characterService.changeSentiment(character.id, sentimentImprovement);
```

**Tests**: `tests/commands/give-sentiment.test.ts`
- Test sentiment improvement mechanics
- Verify item value calculations
- Boundary testing (max sentiment)

**Deliverable**: Players can improve relationships through generosity

---

## Phase 12: Comprehensive Testing

**Goal**: Full system test coverage

**Tests**: `tests/integration/sentiment-system.test.ts`
- End-to-end sentiment workflows
- Cross-system integration tests
- Performance testing
- Edge case coverage

**Deliverable**: Robust, well-tested sentiment system

---

## Phase 13: AI Room Generation Sentiment Awareness

**Goal**: Room atmosphere reflects character sentiments

**Code Changes**: 
- `src/services/roomGenerationService.ts`: Include sentiment context
- `src/ai/grokClient.ts`: Enhanced prompts

**AI Prompt Enhancement**:
```typescript
const roomContext = `
Room characters and their sentiments:
${characters.map(c => `- ${c.name}: ${c.sentiment}`).join('\n')}

Generate room atmosphere considering character emotional states:
- Hostile characters create tense, dangerous atmosphere
- Friendly characters create welcoming environment
- Mixed sentiments create complex social dynamics
`;
```

**Tests**: `tests/ai/room-generation-sentiment.test.ts`
- Verify sentiment context inclusion
- Test atmosphere generation
- Mixed sentiment handling

**Deliverable**: Room descriptions reflect inhabitant relationships

---

## Phase 14: AI Character Creation with Sentiment Selection

**Goal**: AI selects appropriate initial sentiments

**Code Changes**: `src/services/characterGenerationService.ts`

**Enhanced AI Prompt**:
```typescript
const characterCreationPrompt = `
Create characters for this room. For each character, select their initial sentiment toward the player:

SENTIMENT OPTIONS:
- hostile: Actively aggressive, attacks on sight
- aggressive: Will fight if provoked, blocks passage  
- indifferent: Neutral, neither helpful nor hostile
- friendly: Helpful and welcoming to player
- allied: Actively assists and supports player

Consider:
- Character role and backstory
- Room context and atmosphere  
- Narrative coherence
- Gameplay balance

Return JSON format:
{
  "characters": [{
    "name": "Character Name",
    "type": "npc|enemy", 
    "sentiment": "hostile|aggressive|indifferent|friendly|allied",
    "description": "Physical description",
    "reasoning": "Why this sentiment fits the character"
  }]
}
`;
```

**Tests**: `tests/ai/character-creation-sentiment.test.ts`
- Verify AI sentiment selection
- Test fallback mechanisms
- Validate sentiment appropriateness

**Deliverable**: AI creates characters with contextually appropriate sentiments

---

## Phase 15: AI Character Behavioral Prompts

**Goal**: Character AI behavior matches sentiment

**Code Changes**: `src/gameController.ts`

**Dialogue Prompt Enhancement**:
```typescript
const dialoguePrompt = `
Character: ${character.name}
Current Sentiment: ${character.sentiment}
Description: ${character.description}

Generate dialogue response considering sentiment:
- hostile: Aggressive, threatening, ready to fight
- aggressive: Unfriendly, warning, confrontational
- indifferent: Neutral, brief, matter-of-fact
- friendly: Helpful, warm, conversational  
- allied: Supportive, loyal, protective

Player said: "${playerInput}"
Respond as this character would based on their current sentiment.
`;
```

**Tests**: `tests/ai/character-behavior-sentiment.test.ts`
- Verify sentiment-consistent responses
- Test AI prompt effectiveness
- Behavior consistency validation

**Deliverable**: Character behavior consistently reflects their emotional state

---

## Implementation Guidelines

### Code Quality Standards
- All functions must have comprehensive unit tests
- Integration tests for cross-system interactions  
- E2E tests for user workflows
- 90%+ test coverage requirement
- TypeScript strict mode compliance

### Performance Requirements
- Sentiment queries < 10ms average
- Sentiment updates atomic and consistent
- No N+1 query issues in sentiment lookups
- Memory efficient sentiment change tracking

### Backward Compatibility
- is_hostile maintained until Phase 9
- Gradual migration with fallback support
- No breaking changes to public APIs
- Database migration handles all edge cases

### AI Integration Standards
- All AI prompts include sentiment context
- Fallback logic for AI failures
- Sentiment validation on AI responses
- Debug logging for AI sentiment decisions

## Success Criteria
- ✅ All phases have comprehensive test coverage
- ✅ Full test suite passes after each phase
- ✅ No regressions introduced during development
- ✅ Clean, atomic commits for each phase
- ✅ Backward compatibility maintained until migration
- ✅ AI creates contextually appropriate character sentiments
- ✅ Character behavior remains consistent with sentiment values
- ✅ Performance requirements met
- ✅ User experience improved over binary hostile system

## Dependencies
- Existing character and room systems
- AI/Grok integration for character generation
- Database migration capabilities
- Comprehensive testing infrastructure

## Estimated Timeline
- **Phases 1-3**: 1 week (Core infrastructure)
- **Phases 4-8**: 2 weeks (System integration)  
- **Phases 9-10**: 1 week (Migration)
- **Phases 11-12**: 1 week (Enhancement/testing)
- **Phases 13-15**: 1 week (AI integration)
- **Total**: ~5 weeks with testing and refinement

This specification provides a complete roadmap for implementing a sophisticated character sentiment system that enhances player interaction and creates more engaging, dynamic character relationships.