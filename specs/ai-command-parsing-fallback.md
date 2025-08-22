# AI Command Parsing Fallback System

**Status**: Implementation  
**Date**: 2025-08-22  
**Priority**: Medium  

## Overview

Implement an AI-powered command parsing fallback system that activates when standard command parsing fails. When a user's input doesn't match known commands, pass it to the AI with full room context to determine the intended command and target.

## Architecture

### Core Components

1. **AICommandFallback Service** - Main AI parsing logic
2. **CommandRouter Integration** - Fallback trigger after standard parsing fails  
3. **Context Assembly** - Room state gathering for AI prompts
4. **Response Validation** - AI response parsing and validation

### Integration Flow

```
User Input → Exact Match → Article Parser → NLP Engine → AI Fallback → Unknown Command
```

### Data Structures

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

interface AICommandResponse {
  command: string;
  target: string;
  reasoning?: string;
}
```

## Implementation Plan

### Phase 1: Core Infrastructure
- Create AICommandFallback service class
- Add AI fallback to CommandRouter processing pipeline
- Implement basic prompt generation and response parsing

### Phase 2: Context Assembly
- Gather room items, characters, and exits for context
- Build comprehensive room state for AI analysis
- Optimize context assembly for performance

### Phase 3: AI Integration
- Integrate with existing GrokClient
- Implement command parsing prompt template
- Add response validation and error handling

### Phase 4: Command Resolution
- Map AI responses to existing command handlers
- Validate resolved commands and targets
- Execute resolved commands through standard flow

## Key Features

### Natural Language Support
- Handle synonyms (hit → attack, grab → get)
- Parse sentence structures ("I want to pick up the sword")
- Remove demonstratives and prepositions
- Support conversational commands

### Error Handling
- Graceful fallback when AI parsing fails
- Maintain existing error messages for consistency
- Debug logging for AI responses

### Performance
- Only trigger AI after standard parsing fails
- Cache frequent command patterns
- Implement request throttling for API limits

## Testing Strategy

### Unit Tests
- AI prompt generation
- Response parsing and validation
- Error scenarios and fallbacks
- Context assembly logic

### Integration Tests
- Full command resolution flow
- Real game scenarios
- Performance with complex contexts
- Edge cases and ambiguous inputs

## Success Criteria

- Natural language commands resolve correctly
- No regressions in existing command parsing
- Response time < 2 seconds for AI parsing
- Graceful handling of AI service outages
- Comprehensive error logging

## Files to Modify/Create

1. `src/services/aiCommandFallback.ts` - New service
2. `src/services/commandRouter.ts` - Add AI fallback integration
3. `tests/services/aiCommandFallback.test.ts` - Unit tests
4. `tests/integration/aiCommandParsing.test.ts` - Integration tests

This system will enhance the natural language experience while maintaining robustness of existing command processing.