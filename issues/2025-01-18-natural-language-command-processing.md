# Natural Language Command Processing

**Date**: 2025-01-18  
**Status**: Open  
**Priority**: High  
**Category**: Enhancement  

## Problem

Currently, Shadow Kingdom uses a rigid command system that only accepts exact command names and directions:

1. **Limited Input Vocabulary**: Players must use exact commands like "go north" or "look" - natural variations like "climb the stairs" or "walk upstairs" are not recognized.

2. **Poor User Experience**: Text adventures should feel conversational and natural, but the current system forces players to memorize specific command syntax.

3. **Missed Immersion Opportunities**: Players want to interact naturally with the world using descriptive language that matches the atmospheric room descriptions.

4. **Context Blindness**: The system doesn't understand contextual references like "go back", "talk to him", or "use it".

## Solution

Implement a two-tier natural language processing system that handles common commands locally and falls back to AI for complex interpretations.

### Architecture Overview

**Tier 1: Local Pattern Matching**
- Fast, offline regex-based processing for common commands
- No API costs for standard interactions (90%+ of commands)
- Immediate response for familiar patterns
- Synonym handling and contextual shortcuts

**Tier 2: AI Fallback Processing**
- Handles complex, contextual, or unusual commands
- Uses current game state context for interpretation
- More expensive but handles edge cases and natural language

### Command Categories for Local Processing

#### Movement Commands
- **Patterns**: "go [direction]", "move [direction]", "walk [direction]", "[direction]"
- **Natural Variations**: 
  - "climb up/stairs/ladder" → "go up"
  - "descend/go down" → "go down"
  - "enter [room name]" → "go [matching direction]"
  - "head north/walk east" → "go north/east"

#### Examination Commands
- **Patterns**: "look", "examine [object]", "inspect [item]"
- **Natural Variations**:
  - "check the door" → "examine door"
  - "study the painting" → "examine painting"
  - "observe surroundings" → "look"

#### Interaction Commands
- **Patterns**: "take [item]", "use [item]", "talk to [npc]"
- **Natural Variations**:
  - "grab the sword" → "take sword"
  - "speak with the merchant" → "talk to merchant"
  - "pick up coins" → "take coins"

### AI Context Integration

For commands that can't be matched locally, send rich context to AI:

```typescript
interface AICommandContext {
  command: string;
  currentRoom: {
    name: string;
    description: string;
    availableExits: string[];
    visibleItems: string[];
    presentNPCs: string[];
  };
  recentHistory: string[]; // Last few actions for context
  inventory: string[];
  gameState: any; // Additional context as needed
}
```

### Expected AI Response Format

```json
{
  "action": "move|examine|take|use|talk|unknown",
  "target": "specific target or direction",
  "confidence": 0.95,
  "reasoning": "Player wants to climb upward, interpreting as 'go up'"
}
```

## Implementation Plan

### Phase 1: Foundation & Local NLP Processor (Week 1) ✅
**Objectives:** Create LocalNLPProcessor class, implement movement patterns, integrate with GameController

**Deliverables:**
- [x] Create `src/nlp/localNLPProcessor.ts` with pattern matching interfaces
- [x] Implement movement command patterns ("go/move/walk [direction]", "climb up", etc.)
- [x] Add cardinal direction shortcuts and synonyms
- [x] Integrate NLP processing before existing command lookup in GameController
- [x] Create unit tests for pattern matching
- [x] Test basic natural language variations

**Integration Points:**
- `GameController.processCommand()` - main entry point for all commands
- `GameController.move()` - leverage existing thematic name support
- Maintain backward compatibility with exact commands

### Phase 2: AI Fallback System (Week 2) ⏳
**Objectives:** Extend GrokClient, implement context-rich AI processing, add caching

**Deliverables:**
- [ ] Extend `src/ai/grokClient.ts` with `interpretCommand()` method
- [ ] Create context system (room state, history, inventory, game state)
- [ ] Implement confidence thresholds and graceful fallbacks
- [ ] Add caching system for AI interpretations
- [ ] Cost control and rate limiting
- [ ] Handle AI failures gracefully with suggestions

**Context Integration:**
- Current room (name, description, exits, items, NPCs)
- Recent command history for contextual references
- Inventory and game state context
- Player location and movement history

### Phase 3: Advanced Context Resolution (Week 3) ⏳
**Objectives:** Implement pronoun/spatial resolution, compound commands, performance optimization

**Deliverables:**
- [ ] Implement pronoun resolution ("talk to him", "use it", "examine that")
- [ ] Add spatial context ("go back", "the other door", "return")
- [ ] Handle relative references using game history
- [ ] Support compound commands ("take sword and examine it")
- [ ] Extended pattern matching for examination/interaction commands
- [ ] Performance optimization with compiled regex patterns
- [ ] Enhanced AI prompts and context awareness

**Advanced Features:**
- Object reference tracking (last mentioned items/NPCs)
- Relative directions based on movement history
- Pattern prioritization based on usage frequency
- Memory optimization for pattern storage

### Phase 4: Learning & Optimization (Week 4) ⏳
**Objectives:** Learning system, user feedback, monitoring, production optimization

**Deliverables:**
- [ ] Convert successful AI interpretations to local patterns
- [ ] Implement command frequency tracking for pattern prioritization
- [ ] Add user feedback loop for improving accuracy
- [ ] Performance monitoring and cost optimization
- [ ] Machine learning for pattern recognition improvement
- [ ] Comprehensive testing and validation
- [ ] Production-ready features and error handling

**Success Metrics:**
- Local Pattern Match Rate: >90% of commands handled without AI
- Response Time: <50ms local, <2s AI fallback
- Accuracy: >95% correct command interpretation
- Cost Control: <10% increase in AI API usage
- User Experience: >80% reduction in "Unknown command" errors

## Technical Implementation

### Local Processing Flow

```typescript
class LocalNLPProcessor {
  private patterns: CommandPattern[] = [
    {
      pattern: /^(?:go|move|walk|head|travel)\s+(north|south|east|west|up|down)/i,
      action: 'move',
      extractParams: (match) => [match[1]]
    },
    {
      pattern: /^(?:climb|ascend)\s+(?:up|stairs|ladder)/i,
      action: 'move',
      extractParams: () => ['up']
    }
    // ... more patterns
  ];

  processCommand(input: string): CommandResult | null {
    // Try patterns in priority order
    // Return null if no match found
  }
}
```

### Integration Points

1. **GameController.processCommand()**: Add NLP processing before current command lookup
2. **GrokClient**: New method for command interpretation with context
3. **Command History**: Track recent actions for context resolution
4. **Error Handling**: Graceful fallbacks and user-friendly suggestions

## Expected Benefits

1. **Enhanced User Experience**: Players can interact naturally without memorizing command syntax
2. **Increased Immersion**: Natural language matches the atmospheric game descriptions
3. **Broader Accessibility**: Easier for new players to start playing immediately
4. **Cost Efficiency**: Local processing handles 90%+ of commands without API calls
5. **Contextual Intelligence**: AI understands room context and game state for complex commands

## Performance Considerations

### Local Processing Optimization
- Compile regex patterns once at startup
- Priority-order patterns by frequency of use
- Cache successful pattern matches
- Use efficient string processing algorithms

### AI Usage Optimization
- Only call AI for unmatched commands
- Cache AI responses for identical context+command pairs
- Use confidence thresholds to avoid unnecessary AI calls
- Batch multiple uncertain commands when possible

## Risk Assessment

**Medium Risk**: Requires careful balance between local pattern complexity and AI usage costs.

**Mitigations**:
- Start with conservative local patterns and expand based on usage
- Implement usage monitoring and cost controls
- Provide fallback to current exact command system
- Comprehensive testing of pattern matching accuracy

## Testing Strategy

1. **Pattern Coverage**: Test common natural language variations for each command type
2. **Context Resolution**: Verify pronoun and spatial reference handling
3. **AI Fallback**: Test edge cases and unusual command interpretations
4. **Performance**: Measure local processing speed and AI call frequency
5. **Cost Analysis**: Monitor AI usage patterns and optimize thresholds

## Success Metrics

- **Pattern Match Rate**: >90% of commands handled locally
- **User Satisfaction**: Reduced "Unknown command" messages
- **API Cost Control**: <10% increase in AI API usage
- **Response Time**: <50ms for local processing, <2s for AI fallback
- **Accuracy**: >95% correct interpretation of natural language commands

## Future Enhancements

- **Multi-language Support**: Extend patterns for other languages
- **Voice Input**: Integrate with speech recognition
- **Conversation Mode**: Natural dialogue with NPCs
- **Macro Commands**: Support for complex multi-step actions
- **Personalization**: Learn individual player's preferred command styles

## Related Issues

- Builds on existing AI integration infrastructure
- Enhances user experience from thematic connections feature
- May integrate with future NPC dialogue system
- Could support advanced inventory and item interaction features