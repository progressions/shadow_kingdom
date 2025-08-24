# Claude API Migration Specification

## Overview
This document outlines the technical requirements and implementation plan for migrating Shadow Kingdom from Grok API to Claude API for AI-powered content generation.

## Current State Analysis

### Grok API Implementation
- **Location**: `src/ai/grokClient.ts`
- **HTTP Client**: Axios
- **API Endpoint**: `https://api.x.ai/v1/chat/completions`
- **Authentication**: Bearer token in Authorization header
- **Model**: `grok-3`
- **Pricing**: $3/1M input tokens, $15/1M output tokens
- **Response Format**: OpenAI-compatible chat completion format

### Key Integration Points
1. Room generation (`generateRoom`)
2. NPC generation (`generateNPC`)
3. Region generation (`generateRegion`, `generateRegionConcept`)
4. Command interpretation (`interpretCommand`)
5. Dialogue generation (`continueDialogue`, `generateSentimentBasedDialogue`)
6. Character generation (`generateCharacterWithSentiment`)

## Claude API Requirements

### Technical Specifications
- **SDK**: `@anthropic-ai/sdk` (TypeScript native)
- **Authentication**: API key via `x-api-key` header
- **Models**: 
  - `claude-3-opus-20240229` (most capable)
  - `claude-3-sonnet-20240229` (balanced)
  - `claude-3-haiku-20240307` (fastest)
- **Pricing** (Opus example): $15/1M input tokens, $75/1M output tokens
- **Max Tokens**: 4096 output tokens by default

### API Differences

#### Request Format
**Grok (Current)**:
```typescript
{
  model: "grok-3",
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "..." }
  ],
  max_tokens: 500,
  temperature: 0.8
}
```

**Claude (Target)**:
```typescript
{
  model: "claude-3-opus-20240229",
  max_tokens: 500,
  temperature: 0.8,
  system: "...",  // System prompt separate
  messages: [
    { role: "user", content: "..." }
  ]
}
```

#### Response Format
**Grok (Current)**:
```typescript
{
  choices: [{
    message: {
      content: "..."
    }
  }],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150
  }
}
```

**Claude (Target)**:
```typescript
{
  content: [{
    type: "text",
    text: "..."
  }],
  usage: {
    input_tokens: 100,
    output_tokens: 50
  }
}
```

## Implementation Plan

### Phase 1: Parallel Implementation

#### 1.1 Create Claude Client
Create `src/ai/claudeClient.ts` with identical interface to GrokClient:

```typescript
export class ClaudeClient {
  constructor(config?: Partial<ClaudeConfig>, loggerService?: LoggerService)
  
  // Maintain identical method signatures
  async generateRoom(context: RoomContext): Promise<GeneratedRoom>
  async generateNPC(context: NPCContext): Promise<GeneratedNPC>
  async generateRegion(context: RegionGenerationContext): Promise<GeneratedRegion>
  async interpretCommand(context: CommandInterpretationContext): Promise<InterpretedCommand | null>
  async continueDialogue(context: DialogueContext): Promise<DialogueResponse>
  async generateCharacterWithSentiment(prompt: string, context: CharacterWithSentimentContext): Promise<GeneratedCharacterWithSentiment>
  async generateSentimentBasedDialogue(prompt: string, context: BehavioralDialogueContext): Promise<GeneratedBehavioralDialogue>
  async generateRegionConcept(context: RegionConceptGenerationContext): Promise<RegionConcept>
  async generateRegionRoom(context: RoomGenerationContext): Promise<RegionGeneratedRoom>
  
  // Utility methods
  get isMockMode(): boolean
  getUsageStats(): object
  cleanup(): void
}
```

#### 1.2 Environment Configuration
Add to `.env`:
```bash
# Claude AI Configuration
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-3-opus-20240229  # or claude-3-sonnet-20240229
CLAUDE_MAX_TOKENS=500
CLAUDE_TEMPERATURE=0.8

# AI Provider Selection
AI_PROVIDER=claude  # 'grok' or 'claude'
```

#### 1.3 Package Dependencies
Update `package.json`:
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    // ... existing dependencies
  }
}
```

### Phase 2: Adapter Pattern

#### 2.1 Create AI Provider Interface
Create `src/ai/aiProvider.interface.ts`:
```typescript
export interface AIProvider {
  generateRoom(context: RoomContext): Promise<GeneratedRoom>;
  generateNPC(context: NPCContext): Promise<GeneratedNPC>;
  // ... all other methods
}
```

#### 2.2 Create AI Factory
Create `src/ai/aiFactory.ts`:
```typescript
export class AIFactory {
  static createProvider(provider: 'grok' | 'claude', config?: any): AIProvider {
    switch(provider) {
      case 'grok':
        return new GrokClient(config);
      case 'claude':
        return new ClaudeClient(config);
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }
}
```

#### 2.3 Update GameController
Modify initialization to use factory:
```typescript
const aiProvider = process.env.AI_PROVIDER || 'grok';
this.aiClient = AIFactory.createProvider(aiProvider, { 
  loggerService: this.loggerService 
});
```

### Phase 3: Prompt Optimization

#### 3.1 Claude-Specific Prompt Adjustments

**Key Differences**:
1. Claude better understands structured output requirements
2. No need to repeatedly emphasize JSON format
3. Can handle more complex multi-step instructions
4. Better at maintaining context consistency

**Example Room Generation Prompt (Claude-optimized)**:
```typescript
private buildClaudePrompt(context: RoomContext): string {
  return `Generate a room for the Shadow Kingdom text adventure game.

Context:
- Current location: ${context.currentRoom.name}
- Direction traveled: ${context.direction}
- Theme: ${context.theme || 'mysterious fantasy kingdom'}

Create a JSON object with these exact fields:
{
  "name": "unique room name",
  "description": "atmospheric 2-3 sentence description",
  "connections": [array of {direction, name} objects],
  "items": [array of {name, description, isFixed} objects],
  "characters": [array of {name, description, type, personality, initialDialogue} objects]
}

Ensure the room connects back ${this.getReverseDirection(context.direction)} to the previous room.`;
}
```

#### 3.2 Response Parsing
Claude returns cleaner JSON, reducing need for error handling:
```typescript
private parseClaudeResponse(response: string): any {
  // Claude typically returns valid JSON directly
  // Minimal cleanup needed
  return JSON.parse(response);
}
```

### Phase 4: Testing Strategy

#### 4.1 Unit Tests
Create `tests/ai/claudeClient.test.ts`:
- Test all generation methods
- Mock Claude SDK responses
- Verify fallback mechanisms
- Test error handling

#### 4.2 Integration Tests
Create `tests/integration/claude-integration.test.ts`:
- Test with actual Claude API (using test key)
- Verify response formats
- Test rate limiting
- Measure response times

#### 4.3 Comparison Tests
Create `tests/ai/provider-comparison.test.ts`:
- Generate same content with both providers
- Compare quality metrics
- Measure performance differences
- Track token usage and costs

### Phase 5: Migration Execution

#### 5.1 Gradual Rollout
1. **Week 1-2**: Implement ClaudeClient with feature flag
2. **Week 3**: Internal testing with Claude in development
3. **Week 4**: A/B testing with subset of game sessions
4. **Week 5-6**: Monitor metrics and fix issues
5. **Week 7**: Full migration if metrics are positive
6. **Week 8**: Deprecate Grok implementation

#### 5.2 Rollback Plan
- Keep Grok implementation for 30 days post-migration
- Environment variable to instantly switch back
- Maintain mock mode as ultimate fallback

### Phase 6: Optimization

#### 6.1 Claude-Specific Features
1. **Streaming Responses**: Implement streaming for real-time generation
2. **Conversation Memory**: Utilize Claude's better context handling
3. **Structured Output**: Use Claude's native JSON mode
4. **Safety Features**: Leverage Claude's content filtering

#### 6.2 Cost Optimization
1. **Model Selection**:
   - Use Haiku for simple tasks (command interpretation)
   - Use Sonnet for standard generation (rooms, NPCs)
   - Use Opus for complex tasks (region concepts)

2. **Caching Strategy**:
   - Cache common room descriptions
   - Reuse NPC personalities
   - Store region concepts for reuse

3. **Token Optimization**:
   - Shorter system prompts (Claude needs less instruction)
   - Compress context where possible
   - Batch similar requests

## Migration Checklist

### Pre-Migration
- [ ] Obtain Claude API key
- [ ] Set up development environment
- [ ] Create ClaudeClient implementation
- [ ] Write comprehensive tests
- [ ] Document API differences

### During Migration
- [ ] Deploy with feature flag
- [ ] Monitor error rates
- [ ] Track token usage
- [ ] Compare generation quality
- [ ] Gather user feedback

### Post-Migration
- [ ] Update documentation
- [ ] Remove Grok dependencies
- [ ] Optimize prompts for Claude
- [ ] Update cost tracking
- [ ] Archive Grok implementation

## Risk Assessment

### Technical Risks
1. **API Differences**: Response format changes may break parsing
   - *Mitigation*: Comprehensive testing and adapter pattern

2. **Rate Limiting**: Different limits may affect gameplay
   - *Mitigation*: Implement adaptive rate limiting

3. **Cost Increase**: Claude may be more expensive
   - *Mitigation*: Use model tiers appropriately

### Operational Risks
1. **Service Availability**: Claude outages affect gameplay
   - *Mitigation*: Maintain mock mode fallback

2. **Response Quality**: Different AI behavior may change game feel
   - *Mitigation*: A/B testing and prompt optimization

3. **Migration Complexity**: Parallel systems increase maintenance
   - *Mitigation*: Clear timeline and rollback plan

## Success Metrics

### Primary Metrics
- **Error Rate**: < 1% API failures
- **Response Time**: < 2s average generation time
- **Cost per Session**: Within 20% of current costs
- **Generation Quality**: User satisfaction score > 4/5

### Secondary Metrics
- **Token Efficiency**: Reduce tokens per generation by 20%
- **Context Coherence**: Improve consistency scores by 30%
- **JSON Parse Success**: > 99% valid JSON responses
- **Fallback Usage**: < 0.1% fallback activations

## Appendix

### A. Claude API Documentation
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)
- [SDK Documentation](https://github.com/anthropics/anthropic-sdk-typescript)
- [Pricing Information](https://www.anthropic.com/api-pricing)

### B. Code Examples

#### B.1 Claude Client Initialization
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const response = await anthropic.messages.create({
  model: 'claude-3-opus-20240229',
  max_tokens: 500,
  temperature: 0.8,
  system: 'You are a creative AI for a text adventure game.',
  messages: [
    { role: 'user', content: promptText }
  ]
});
```

#### B.2 Error Handling
```typescript
try {
  const response = await anthropic.messages.create(request);
  return this.parseResponse(response);
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    console.error('Claude API error:', error.status, error.message);
    return this.getFallbackContent(context);
  }
  throw error;
}
```

### C. Prompt Templates

#### C.1 Room Generation (Claude-optimized)
```typescript
const ROOM_GENERATION_TEMPLATE = `
You are generating content for Shadow Kingdom, a text adventure game.

Task: Create a new room discovered when traveling {{direction}} from "{{currentRoom}}".

Requirements:
1. Unique, evocative name (2-5 words)
2. Atmospheric description (2-3 sentences)
3. Return connection to {{reverseDirection}}
4. 2-4 total connections with thematic descriptions
5. {{itemCount}} items fitting the room's theme
6. {{characterGuidance}}

Output format: JSON with fields: name, description, connections, items, characters
`;
```

#### C.2 NPC Generation (Claude-optimized)
```typescript
const NPC_GENERATION_TEMPLATE = `
Create an NPC for Shadow Kingdom that fits naturally in "{{roomName}}".

Room context: {{roomDescription}}
Existing NPCs to avoid duplicating: {{existingNPCs}}

Generate a memorable character with:
- Distinct name and appearance
- Clear personality traits
- Natural initial dialogue
- Appropriate sentiment toward players

Output format: JSON with fields: name, description, personality, initialDialogue, sentiment
`;
```

### D. Testing Scenarios

#### D.1 Smoke Tests
1. Generate basic room
2. Generate NPC
3. Interpret simple command
4. Handle API error gracefully
5. Fall back to mock mode

#### D.2 Load Tests
1. Generate 100 rooms sequentially
2. Generate 10 rooms concurrently
3. Sustained generation for 1 hour
4. Rate limit handling
5. Token budget enforcement

#### D.3 Quality Tests
1. Room connection consistency
2. NPC dialogue coherence
3. Region theme maintenance
4. Command interpretation accuracy
5. JSON format compliance

## Conclusion

Migrating from Grok to Claude API offers potential benefits in response quality, consistency, and native TypeScript support. The migration plan minimizes risk through parallel implementation, comprehensive testing, and gradual rollout. Success depends on careful prompt optimization and maintaining backward compatibility throughout the transition.