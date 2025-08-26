# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-26-item-pickup-command/spec.md

## Technical Requirements

### Target Disambiguation Service
- Create new service class `TargetDisambiguationService` in `src/services/`
- Implement context-aware target resolution based on command verb
- Support "all" keyword interpretation based on command context:
  - take/pickup/get → items in room
  - attack/fight → enemies in room (future)
  - talk/speak → NPCs in room (future)
- Handle partial name matching with fuzzy search algorithm
- Return disambiguation prompts when multiple matches found
- Integrate with existing CommandRouter for seamless command processing
- **Design for AI Integration**: Structure service to be AI-ready:
  - Maintain clear context object with room state (items, characters, connections)
  - Standardize command interpretation interface that AI can target
  - Separate target resolution from command execution for clean AI injection point
  - Return structured responses that AI can generate (command type, target list, confidence)

### Command Implementation
- Extend CommandRouter with new command handlers:
  - Register "take", "pickup", "get" as game commands with shared handler
  - Support command aliases: "t" for take, "p" for pickup, "g" for get
- Parse command arguments to extract target specification
- Support syntax variations:
  - "take sword"
  - "take all"
  - "pickup ancient sword"
  - "get all items"
- Validate item existence in current room before pickup attempt

### Failed Parse Handling for AI Handoff
Implement a structured approach for handling unparseable commands:

```typescript
interface ParseResult {
  success: boolean;
  command?: ParsedCommand;
  failureContext?: {
    rawInput: string;
    attemptedParsers: string[];  // ["movement", "take", "look", etc.]
    partialMatches: Array<{
      parser: string;
      confidence: number;
      issue: string;  // "no target found", "ambiguous verb", etc.
    }>;
    roomContext: {
      items: Array<{id: number; name: string}>;
      characters: Array<{id: number; name: string}>;
      exits: string[];
    };
    suggestedInterpretations?: string[];  // For near-misses
  };
}
```

**Parse Failure Flow**:
1. CommandRouter attempts parse with all registered parsers
2. Each parser returns confidence score (0.0 - 1.0)
3. If all parsers score < 0.5, create failureContext
4. Return ParseResult with complete context for AI
5. (Future) AI resolver receives failureContext directly
6. (Future) AI returns ParsedCommand that feeds into normal flow

### Inventory System Integration
- Add inventory array to GameSession interface in GameStateManager
- Implement `addToInventory(itemId: number)` method in GameStateManager
- Implement `removeFromRoom(roomId: number, itemId: number)` method
- Add inventory capacity check (initial limit: 10 items)
- Update session persistence to include inventory state
- Ensure inventory survives game save/load cycles

### Database Operations
- Query items in current room: `prisma.item.findMany({ where: { roomId } })`
- Update item location when picked up: `prisma.item.update({ where: { id }, data: { roomId: null, characterId: playerId } })`
- Support batch operations for "take all" efficiency
- Add transaction support for atomic multi-item pickups
- Include proper error handling for database failures

### User Feedback System
- Success messages:
  - Single item: "You pick up the [item name]."
  - Multiple items: "You pick up: [item1], [item2], [item3]."
  - All items: "You pick up everything in the room: [list]."
- Failure messages:
  - Item not found: "There is no [item] here."
  - Inventory full: "You can't carry any more items."
  - Item locked: "The [item] cannot be picked up."
  - No items: "There are no items here to pick up."
- Disambiguation prompts:
  - Multiple matches: "Which did you mean? [option1] or [option2]?"
  - Partial match suggestion: "Did you mean [item name]?"

### Performance Optimization
- Cache current room items during room entry
- Use single database query for "all" operations
- Implement lazy loading for inventory display
- Batch database updates for multiple item pickups
- Add index on item.roomId for faster queries

### Testing Requirements
- Unit tests for TargetDisambiguationService
- Integration tests for pickup commands
- Test "all" functionality with 0, 1, and multiple items
- Test partial name matching and ambiguity resolution
- Test inventory capacity limits
- Test database transaction rollback on errors
- Mock Prisma client for isolated testing

### AI Integration Preparation

The TargetDisambiguationService is designed with future AI integration in mind:

**Command Processing Pipeline**:
```typescript
// Current Implementation
async parseCommand(input: string): Promise<ParseResult> {
  const context = await this.buildRoomContext();
  
  // Try each parser
  const parseAttempts = [];
  for (const parser of this.parsers) {
    const result = await parser.parse(input, context);
    parseAttempts.push({
      parser: parser.name,
      confidence: result.confidence,
      issue: result.issue
    });
    
    if (result.confidence >= 0.8) {
      return { success: true, command: result.command };
    }
  }
  
  // All parsers failed - prepare for AI
  return {
    success: false,
    failureContext: {
      rawInput: input,
      attemptedParsers: parseAttempts.map(p => p.parser),
      partialMatches: parseAttempts.filter(p => p.confidence > 0.2),
      roomContext: context,
      suggestedInterpretations: this.getSuggestions(input, parseAttempts)
    }
  };
}

// Future AI Integration Point
async handleCommand(input: string): Promise<CommandResult> {
  const parseResult = await this.parseCommand(input);
  
  if (!parseResult.success && this.aiResolver) {
    // AI returns canonical command string
    const canonicalCommand = await this.aiResolver.interpret(
      parseResult.failureContext,
      input
    );
    
    if (canonicalCommand) {
      // Re-parse the AI's canonical command - guaranteed to work
      const aiParseResult = await this.parseCommand(canonicalCommand);
      if (aiParseResult.success) {
        return await this.executeCommand(aiParseResult.command);
      }
    }
  }
  
  if (parseResult.success) {
    return await this.executeCommand(parseResult.command);
  }
  
  return this.handleUnrecognizedCommand(parseResult.failureContext);
}
```

**Parser Confidence Scoring**:
- **1.0**: Perfect match (exact command + valid target)
- **0.8-0.9**: Strong match (recognized command + fuzzy target match)
- **0.5-0.7**: Partial match (recognized command but unclear target)
- **0.2-0.4**: Weak match (possible command but major issues)
- **0.0-0.2**: No match (unrecognized input)

**AI Resolver Interface (Two Options)**:

**Option A: Canonical Command String**
```typescript
// AI returns exact command string to re-parse
async interpretAsString(context: FailureContext, input: string): Promise<string | null> {
  const prompt = `
    The player typed: "${input}"
    Room contains: items: [${context.roomState.items.map(i => i.name).join(', ')}]
    
    Respond with ONLY the canonical command, like: "take golden sword"
  `;
  
  const aiResponse = await this.callAI(prompt);
  return aiResponse === "unknown" ? null : aiResponse;
}

// Usage: "grab the shiny thing" → "take golden sword"
```

**Option B: Structured YAML Response (Recommended)**
```typescript
interface AICommand {
  verb: string;
  target?: string;
  targets?: string[];  // For "all" commands
}

async interpretAsYAML(context: FailureContext, input: string): Promise<string | null> {
  const prompt = `
    The player typed: "${input}"
    
    They are in a room with:
    - Items: ${context.roomState.items.map(i => i.name).join(', ')}
    - Characters: ${context.roomState.characters.map(c => c.name).join(', ')}
    - Exits: ${context.roomState.exits.join(', ')}
    
    Interpret their command and respond in YAML format:
    verb: [take|get|pickup|look|go|attack|talk]
    target: [specific target or "all"]
    
    Examples:
    Input: "grab the shiny thing"
    verb: take
    target: golden sword
    
    Input: "pick up everything"
    verb: take
    target: all
    
    Input: "head north"
    verb: go
    target: north
    
    If unclear, respond with:
    verb: unknown
  `;
  
  const aiResponse = await this.callAI(prompt);
  const parsed = yaml.parse(aiResponse);
  
  if (parsed.verb === "unknown") return null;
  
  // Convert YAML to canonical command string
  const canonicalCommand = parsed.target === "all" 
    ? `${parsed.verb} all`
    : `${parsed.verb} ${parsed.target}`;
    
  return canonicalCommand;  // Returns string like "take golden sword"
}
```

**AI Response Flow (with YAML)**:
1. User: `"grab the shiny thing"`
2. Parser fails with context about golden sword in room
3. AI receives prompt with room state
4. AI responds with YAML:
   ```yaml
   verb: take
   target: golden sword
   ```
5. System converts to canonical: `"take golden sword"`
6. System re-parses `"take golden sword"` (guaranteed to work)
7. Command executes normally through existing pipeline

**Design Benefits**:
- **Structured AI responses**: YAML format prevents ambiguity
- **Simple integration**: Both approaches return canonical command strings
- **Validation through re-parsing**: AI output goes through same validation
- **Flexibility**: Can use simple strings or structured YAML based on AI model
- **Easy testing**: Mock AI returns canonical commands
- **Graceful degradation**: Works without AI, just shows error messages
- **Future extensibility**: YAML format can grow (add confidence, alternatives, etc.)