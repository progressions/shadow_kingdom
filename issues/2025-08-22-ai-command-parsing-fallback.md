# AI Command Parsing Fallback Enhancement

**Date**: 2025-08-22  
**Status**: Completed  
**Priority**: Medium  
**Category**: Enhancement  

## Description

Implement an AI-powered command parsing fallback system that activates when immediate command parsing fails. When a user's input doesn't match known commands, pass it to the AI with full room context to determine the intended command and target.

## Problem Statement

Currently, when users enter commands that don't match exact command names or patterns, they receive generic "Unknown command" messages. This creates friction for players who use natural language or slightly different phrasings.

**Current Behavior:**
- `attack the goblin` → Works (after article parsing)
- `hit the goblin` → "Unknown command: hit"
- `I want to pick up the sword` → "Unknown command: I"
- `examine that mysterious orb` → "Unknown command: examine" (if "that" isn't handled)

**Desired Behavior:**
- Failed commands get AI analysis with room context
- AI determines intended command and target
- System executes the resolved command
- Graceful fallback maintains natural conversation flow

## Technical Requirements

### AI Prompt Structure
```typescript
interface AICommandPrompt {
  userInput: string;
  roomContext: {
    roomName: string;
    roomDescription: string;
    availableItems: string[];
    availableCharacters: string[];
    availableExits: string[];
  };
  availableCommands: string[];
}
```

### AI Response Format
```typescript
interface AICommandResponse {
  command: string;           // Resolved command name (e.g., "attack", "get", "talk")
  target: string;           // Resolved target (e.g., "goblin", "sword", "merchant")
  reasoning?: string;       // Optional explanation for debugging
}
```

### Integration Points
1. **CommandRouter Enhancement**: Add AI fallback after exact and NLP parsing fail
2. **Context Assembly**: Gather room state for AI prompt
3. **AI Service Integration**: Use existing GrokClient or similar AI service
4. **Command Execution**: Execute resolved command through existing handlers
5. **Error Handling**: Graceful degradation if AI parsing fails

## Implementation Strategy

### Phase 1: Core Infrastructure
```typescript
// In CommandRouter.processCommand()
if (!exactCommand && !nlpResult) {
  const aiResult = await this.aiCommandFallback.parseCommand(
    input, 
    context.gameContext
  );
  
  if (aiResult && aiResult.command && aiResult.target) {
    return await this.executeResolvedCommand(aiResult, commands);
  }
}
```

### Phase 2: Context Assembly
```typescript
class AICommandFallback {
  async parseCommand(input: string, gameContext: GameContext): Promise<AICommandResponse> {
    const roomContext = await this.assembleRoomContext(gameContext);
    const availableCommands = this.getAvailableCommands();
    
    const prompt = this.buildPrompt(input, roomContext, availableCommands);
    const aiResponse = await this.grokClient.parseCommand(prompt);
    
    return this.validateResponse(aiResponse);
  }
}
```

### Phase 3: AI Prompt Template
```typescript
const COMMAND_PARSING_PROMPT = `
You are a command parser for a text adventure game. The player said: "${userInput}"

Current room: ${roomName}
${roomDescription}

Available items: ${availableItems.join(', ')}
Available characters: ${availableCharacters.join(', ')}
Available exits: ${availableExits.join(', ')}

Available commands: ${availableCommands.join(', ')}

Please determine what command the player intended and what target they want to interact with.
Return a JSON object with: {"command": "...", "target": "..."}

Examples:
- "hit the goblin" → {"command": "attack", "target": "goblin"}
- "I want to pick up the sword" → {"command": "get", "target": "sword"}
- "examine that orb" → {"command": "examine", "target": "orb"}
- "speak with the merchant" → {"command": "talk", "target": "merchant"}
- "walk north" → {"command": "go", "target": "north"}
`;
```

## Command Mapping Strategy

### Synonym Recognition
- **Attack**: hit, strike, fight, kill, slay
- **Get**: pick up, take, grab, collect, acquire
- **Examine**: look at, inspect, check, view, study
- **Talk**: speak to, chat with, converse with, ask
- **Go**: move, walk, head, travel, exit
- **Give**: hand, offer, present, deliver
- **Drop**: put down, leave, discard, place

### Natural Language Patterns
- **Sentence Structure**: "I want to [command] [target]"
- **Demonstratives**: "examine that sword" → "examine sword"
- **Prepositions**: "talk to the merchant" → "talk merchant"
- **Articles**: Already handled by existing article parser
- **Contextual References**: "attack it" (after examining something)

## Error Handling & Fallback

### Simple Fallback Strategy
```typescript
if (!aiResult || !aiResult.command || !aiResult.target) {
  this.tui.display(
    `I'm not sure what you mean by "${input}". Type "help" for available commands.`,
    MessageType.ERROR
  );
  return false;
}

// If AI successfully parsed the command, execute it
return await this.executeResolvedCommand(aiResult, commands);
```

## Performance Considerations

### Caching Strategy
- Cache AI responses for similar inputs
- Cache room context to reduce assembly overhead
- Implement request throttling to avoid API rate limits

### Optimization
- Only trigger AI fallback after all other parsing fails
- Batch multiple failed commands for efficiency
- Use AI debug mode for development/testing only

## Integration with Existing Systems

### CommandRouter Enhancement
- Add AI fallback as final parsing step
- Maintain existing exact match and NLP processing
- Preserve debug logging and error reporting

### Article Parser Integration
- Apply article stripping before AI parsing
- Use cleaned input for better AI analysis
- Maintain consistency with existing behavior

### NLP Engine Coordination
- Try UnifiedNLPEngine before AI fallback
- Share context between systems to avoid duplication
- Use AI as enhancement, not replacement

## Testing Strategy

### Unit Tests
- Test AI prompt generation
- Test response parsing and validation
- Test confidence threshold handling
- Test error scenarios and fallbacks

### Integration Tests
- Test full command resolution flow
- Test with real game scenarios
- Test performance with complex contexts
- Test edge cases and ambiguous inputs

### AI Response Testing
```typescript
describe('AI Command Fallback', () => {
  it('should resolve synonyms correctly', async () => {
    const result = await aiCommandFallback.parseCommand(
      'hit the goblin',
      mockGameContext
    );
    expect(result.command).toBe('attack');
    expect(result.target).toBe('goblin');
  });
  
  it('should handle natural language commands', async () => {
    const result = await aiCommandFallback.parseCommand(
      'I want to pick up the sword',
      mockGameContext
    );
    expect(result.command).toBe('get');
    expect(result.target).toBe('sword');
  });
});
```

## Success Metrics

### Functionality Metrics
- Successful command resolution for common synonyms
- Natural language patterns correctly interpreted
- Response time < 2 seconds for AI parsing
- Player satisfaction with natural language support

### Technical Metrics
- No regressions in existing command parsing
- AI fallback triggers only when appropriate
- Graceful handling of AI service outages
- Comprehensive error logging for debugging

## Future Enhancements

This foundation enables advanced features:
1. **Contextual Memory**: "attack it" remembers last examined object
2. **Multi-step Commands**: "get the sword and attack the goblin"
3. **Conversational Interface**: Natural dialogue with game systems
4. **Learning System**: Improve parsing based on user patterns
5. **Voice Integration**: Support for speech-to-text commands

## Dependencies

- **AI Service**: GrokClient or similar for natural language processing
- **Context System**: Enhanced GameContext for room state
- **Command Registry**: Access to all available commands
- **Article Parser**: Integration with existing article stripping
- **Error Handling**: Enhanced error reporting and user feedback

This enhancement will significantly improve the natural language experience while maintaining the robustness and performance of the existing command system.