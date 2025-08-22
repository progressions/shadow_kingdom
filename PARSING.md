# Command Parsing Philosophy

**Created**: 2025-08-22  
**Status**: Design Guideline  
**Audience**: Developers working on Shadow Kingdom command system  

## Core Philosophy

The **Command Parser** is responsible for **object disambiguation and target resolution**. Individual command handlers should focus purely on **action execution** and assume their targets have already been identified and validated.

## Architecture Principles

### 1. **Separation of Concerns**

```
User Input → Command Parser → Action Handler → Game State Change
            ↓                 ↓
         Target Resolution   Action Execution
```

- **Command Parser**: "What does the user want to do, and to what?"
- **Action Handler**: "Now that I know the target, how do I perform this action?"

### 2. **Parser Responsibility Hierarchy**

```
1. Direct Entity Resolution    (fast path)
2. Contextual Disambiguation   (smart matching)
3. AI Fallback Resolution      (natural language)
4. Action Handler Execution    (clean interface)
```

## Implementation Strategy

### Current State: Anti-Pattern ❌

```typescript
// WRONG: Handler does its own target finding
async handleExamine(args: string[]) {
  const targetName = stripArticles(args.join(' '));
  const target = await this.examineService.findExaminableTarget(
    roomId, gameId, characterId, targetName
  );
  
  if (!target) {
    this.tui.display("Target not found");
    return;
  }
  
  // Finally do the actual action...
}
```

**Problems:**
- Every handler duplicates target resolution logic
- Inconsistent error messages across commands
- No centralized disambiguation strategy
- AI fallback logic scattered throughout handlers

### Target State: Correct Pattern ✅

```typescript
// CORRECT: Parser handles target resolution
class CommandParser {
  async processCommand(input: string, context: GameContext): Promise<void> {
    const { verb, rawTarget } = this.parseCommand(input);
    
    // 1. Try direct entity resolution
    const target = await this.resolveTarget(rawTarget, context);
    
    if (target) {
      // Call handler with resolved target
      await this.executeHandler(verb, target, context);
      return;
    }
    
    // 2. Fall back to AI for disambiguation
    const aiResult = await this.nlpEngine.processCommand(input, context);
    if (aiResult) {
      const resolvedTarget = await this.resolveTarget(aiResult.target, context);
      await this.executeHandler(aiResult.verb, resolvedTarget, context);
      return;
    }
    
    // 3. True failure
    this.displayError(`I don't understand "${input}"`);
  }
}

// CLEAN: Handler focuses on action only
async handleExamine(target: ResolvedTarget, context: GameContext) {
  const description = this.examineService.getExaminationText(target);
  this.tui.display(description, MessageType.NORMAL);
  // No target resolution logic!
}
```

## Target Resolution Strategy

### Entity Resolution Hierarchy

```typescript
interface TargetResolver {
  async resolveTarget(input: string, context: GameContext): Promise<ResolvedTarget | null> {
    // 1. EXACT MATCHES (fastest)
    let target = await this.findExactMatch(input, context);
    if (target) return target;
    
    // 2. PARTIAL MATCHES (smart)
    target = await this.findPartialMatch(input, context);
    if (target) return target;
    
    // 3. CONTEXTUAL MATCHES (intelligent)
    target = await this.findContextualMatch(input, context);
    if (target) return target;
    
    // 4. Return null → triggers AI fallback
    return null;
  }
}
```

### Search Priority Order

1. **Characters in room** (NPCs, enemies, players)
2. **Items in inventory** (what player carries)
3. **Items in room** (what player can see/interact with)
4. **Room features** (exits, furniture, fixtures)
5. **Environmental objects** (AI-described elements)

### Disambiguation Examples

```typescript
// INPUT: "look at the ancient sword"
// PARSING: verb="look", target="ancient sword"
// RESOLUTION: 
//   1. Strip articles: "ancient sword"
//   2. Search inventory: InventoryItem{ name: "Ancient Elven Sword" } ✓
//   3. Return ResolvedTarget{ type: "inventory_item", entity: sword }

// INPUT: "examine the mysterious pedestal"  
// PARSING: verb="examine", target="mysterious pedestal"
// RESOLUTION:
//   1. Strip articles: "mysterious pedestal"
//   2. Search entities: null
//   3. AI Fallback: "The ornate stone pedestal bears ancient runes..."

// INPUT: "attack the guardian"
// PARSING: verb="attack", target="guardian"  
// RESOLUTION:
//   1. Strip articles: "guardian"
//   2. Search characters: Character{ name: "Ancient Guardian" } ✓
//   3. Return ResolvedTarget{ type: "character", entity: guardian }
```

## Command Handler Interface

### Standardized Handler Signature

```typescript
interface CommandHandler {
  // BEFORE: Handlers took raw strings
  async execute(args: string[], context: GameContext): Promise<void>;
  
  // AFTER: Handlers take resolved targets
  async execute(target: ResolvedTarget, context: GameContext): Promise<ActionResult>;
}

interface ResolvedTarget {
  type: 'character' | 'inventory_item' | 'room_item' | 'room_feature' | 'environmental';
  entity: Character | InventoryItem | RoomItem | RoomFeature | EnvironmentalObject;
  name: string;         // Canonical name for display
}

interface ActionResult {
  success: boolean;
  message?: string;
  sideEffects?: GameStateChange[];
}
```

### Handler Simplification Benefits

```typescript
// EXAMINE HANDLER - Before vs After

// BEFORE: 40 lines of target resolution + 5 lines of action
async handleExamine(args: string[]) {
  if (!this.gameStateManager.isInGame()) return;
  const targetName = stripArticles(args.join(' '));
  if (!targetName) { /* error handling */ }
  const target = await this.examineService.findExaminableTarget(/*...*/);
  if (!target) { /* fallback logic */ }
  
  // Finally, the actual action:
  const text = this.examineService.getExaminationText(target);
  this.tui.display(text, MessageType.NORMAL);
}

// AFTER: 3 lines total, pure action logic
async handleExamine(target: ResolvedTarget, context: GameContext): Promise<ActionResult> {
  const text = this.examineService.getExaminationText(target.entity);
  context.ui.display(text, MessageType.NORMAL);
  return { success: true };
}
```

## AI Fallback Integration

### Natural Language → Structured Commands

```typescript
interface AICommandResult {
  verb: string;           // "examine", "attack", "take"
  target: string;         // "pedestal", "rusty key", "north exit"  
  context?: string;       // Additional context for disambiguation
}

// Example AI processing:
// INPUT: "look at the glowing thing on the altar"
// AI OUTPUT: { 
//   verb: "examine", 
//   target: "glowing orb",
//   context: "magical artifact on stone altar"
// }
```

### Fallback Flow

```mermaid
graph TD
    A[User Input] --> B[Parse Command]
    B --> C{Direct Resolution?}
    C -->|Yes| D[Execute Handler]
    C -->|No| E[AI Fallback]
    E --> F{AI Success?}
    F -->|Yes| G[Resolve AI Target]
    G --> H{Target Found?}
    H -->|Yes| D
    H -->|No| I[Error: Target Not Found]
    F -->|No| J[Error: Don't Understand]
```

## Migration Strategy

### Phase 1: Extract Target Resolution (Current)

```typescript
// Keep existing handlers but extract resolution logic
private async handleExamine(args: string[]): Promise<boolean> {
  const target = await this.resolveExamineTarget(args);
  if (!target) return false; // Trigger AI fallback
  
  // Pure action logic
  const text = this.examineService.getExaminationText(target);
  this.tui.display(text, MessageType.NORMAL);
  return true;
}
```

### Phase 2: Centralize Resolution

```typescript
// Move resolution into CommandRouter
class CommandRouter {
  async processCommand(input: string, context: GameContext): Promise<void> {
    const parsed = this.parseInput(input);
    const target = await this.globalTargetResolver.resolve(parsed.target, context);
    
    if (target) {
      await this.executeHandler(parsed.verb, target, context);
    } else {
      await this.handleAIFallback(input, context);
    }
  }
}
```

### Phase 3: Standardize Handlers

```typescript
// Convert all handlers to new interface
interface StandardCommandHandler {
  async execute(target: ResolvedTarget, context: GameContext): Promise<ActionResult>;
}
```

## Benefits of This Approach

### 1. **Consistency**
- Unified target resolution across all commands
- Consistent error messages and disambiguation
- Predictable AI fallback behavior

### 2. **Maintainability**
- Target resolution logic in one place
- Handlers focus on single responsibility
- Easy to add new entity types globally

### 3. **Extensibility**
- New commands automatically get smart target resolution
- AI fallback works for any command structure  
- Easy to add new disambiguation strategies

### 4. **User Experience**
- Predictable command interpretation
- Smart partial matching across all commands
- Graceful fallback to natural language

### 5. **Performance**
- Optimized search order (fast common cases first)
- Cached entity lookups
- Minimal redundant database queries

## Example Command Flows

### Simple Success Path
```
User: "examine sword"
Parser: verb="examine", target="sword" 
Resolver: Found InventoryItem("Iron Sword")
Handler: Display examination text
Result: "A well-crafted iron blade..."
```

### Disambiguation Path  
```
User: "take key"
Parser: verb="take", target="key"
Resolver: Found multiple keys → return most relevant
Handler: Execute take action  
Result: "You take the brass key."
```

### AI Fallback Path
```
User: "look at the shimmering portal thing"
Parser: verb="look", target="shimmering portal thing"
Resolver: No matches found → return null
AI: Interprets as examine action on room feature
Resolver: Retry with AI target "magical portal"  
Handler: Display AI-generated description
Result: "The swirling vortex pulses with arcane energy..."
```

## Implementation Notes

- Start with high-frequency commands (look, examine, take, go)
- Preserve backward compatibility during migration
- Use feature flags to enable new parsing gradually
- Extensive testing of disambiguation edge cases
- Monitor AI fallback usage patterns for optimization

This parsing philosophy creates a clean separation between **understanding what the user wants** (parser's job) and **doing what the user wants** (handler's job), leading to more maintainable, consistent, and user-friendly command processing.
