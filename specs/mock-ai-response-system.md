# Shadow Kingdom: Mock AI Response System Specification

**Status**: 🚧 IN DEVELOPMENT  
**Priority**: Medium  
**Related Issue**: mock-ai-response-system.md  

## Overview

This specification defines a comprehensive mock AI system to replace expensive Grok API calls during development, testing, and experimentation with rich, context-aware responses that maintain game quality while eliminating costs.

## Problem Analysis

### Current Limitations
The existing mock system in `grokClient.ts` provides only:
- **6 hardcoded rooms** (repeated quickly during gameplay)
- **5 basic regions** (no theme coherence)
- **3 simple NPCs** (limited variety)
- **No context awareness** (ignores prompts and existing content)
- **Random selection only** (no intelligent matching)

### Cost Impact
- **Development**: Continuous API costs during feature work
- **Testing**: Background generation during gameplay testing
- **Experimentation**: Prompt optimization and system tuning
- **Demos**: Presentation and showcase scenarios

## Target Architecture

### Rich Content Pools
Comprehensive categorized content providing 50+ variations per theme:

```typescript
interface MockContentPools {
  rooms: {
    mansion: MockRoom[];        // 50+ mansion rooms
    forest: MockRoom[];         // 50+ forest rooms  
    cave: MockRoom[];           // 50+ cave rooms
    volcanic: MockRoom[];       // 50+ volcanic rooms
    necropolis: MockRoom[];     // 50+ necropolis rooms
    town: MockRoom[];           // 50+ town rooms
    castle: MockRoom[];         // 50+ castle rooms
    laboratory: MockRoom[];     // 50+ laboratory rooms
  };
  regions: {
    [themeType: string]: MockRegion[];
  };
  connections: {
    architectural: MockConnection[];  // doors, archways, stairs
    natural: MockConnection[];        // paths, clearings, bridges
    mystical: MockConnection[];       // portals, veils, passages
    mechanical: MockConnection[];     // lifts, gears, mechanisms
  };
}
```

### Intelligent Selection Engine
Context-aware engine that analyzes prompts and existing content:

```typescript
interface MockAIEngine {
  // Core generation methods
  generateRoom(prompt: string, context: RoomContext): Promise<GeneratedRoom>;
  generateRegion(prompt: string, context: RegionGenerationContext): Promise<GeneratedRegion>;
  generateNPC(prompt: string, context: NPCContext): Promise<GeneratedNPC>;
  
  // Selection logic
  selectRoom(themes: string[], context: RoomContext, usedIds: Set<string>): MockRoom;
  selectRegion(themes: string[], context: RegionContext, usedIds: Set<string>): MockRegion;
  
  // Context analysis
  parseThemes(prompt: string): string[];
  extractKeywords(prompt: string): string[];
  analyzeAdjacentContent(context: RoomContext): ThemeProfile;
  
  // Variation generation
  addVariation(baseContent: MockRoom, context: RoomContext): GeneratedRoom;
  generateConnections(room: MockRoom, context: RoomContext): MockConnection[];
}
```

## Implementation Strategy

### Phase 1: Enhanced Content Structure

#### 1.1 Rich Mock Content Schema
```typescript
interface MockRoom {
  id: string;                    // Unique identifier for tracking usage
  name: string;                  // Base room name
  description: string;           // Primary description
  themes: string[];              // ['mansion', 'library', 'luxurious']
  keywords: string[];            // ['books', 'fireplace', 'crystal', 'mahogany']
  mood: string;                  // 'mysterious' | 'welcoming' | 'ominous' | 'peaceful'
  size: string;                  // 'intimate' | 'spacious' | 'vast' | 'cramped'
  lighting: string;              // 'dim' | 'bright' | 'flickering' | 'ethereal'
  
  // Variation support
  nameVariations: string[];      // Alternative names
  descriptionVariations: string[]; // Alternative descriptions
  
  // Connection hints
  connectionHints: {
    architectural: string[];     // 'grand_staircase', 'hidden_door'
    natural: string[];          // 'forest_path', 'mountain_pass'
    mystical: string[];         // 'magic_portal', 'ethereal_gateway'
    mechanical: string[];       // 'steam_lift', 'gear_mechanism'
  };
  
  // Contextual modifiers
  adjacencyBonus: string[];      // Themes that pair well
  adjacencyPenalty: string[];    // Themes to avoid nearby
  regionFit: number;            // How well this fits in region (0-1)
}

interface MockRegion {
  id: string;
  name: string;
  type: string;                  // 'mansion', 'forest', 'cave', etc.
  description: string;
  themes: string[];
  mood: string;
  
  // Generation hints
  preferredRoomCount: number;    // Suggested room count
  connectionStyles: string[];    // Preferred connection types
  roomTypes: string[];          // Types of rooms that fit
  
  // Variation support
  nameVariations: string[];
  descriptionVariations: string[];
}

interface MockConnection {
  direction: string;             // 'north', 'south', etc.
  name: string;                  // 'through the crystal archway'
  style: string;                // 'architectural', 'natural', etc.
  themes: string[];             // Applicable themes
  mood: string;                 // Connection mood
  
  // Bidirectional support
  reverseTemplates: string[];   // Templates for return path
}
```

#### 1.2 Content Pool Organization
```
src/data/mockContent/
├── rooms/
│   ├── mansion.ts           # 50+ mansion rooms
│   ├── forest.ts           # 50+ forest rooms
│   ├── cave.ts             # 50+ cave rooms
│   ├── volcanic.ts         # 50+ volcanic rooms
│   ├── necropolis.ts       # 50+ necropolis rooms
│   ├── town.ts             # 50+ town rooms
│   ├── castle.ts           # 50+ castle rooms
│   └── laboratory.ts       # 50+ laboratory rooms
├── regions/
│   ├── all-themes.ts       # Region templates by theme
├── connections/
│   ├── architectural.ts    # Architectural connections
│   ├── natural.ts         # Natural connections
│   ├── mystical.ts        # Mystical connections
│   └── mechanical.ts      # Mechanical connections
└── index.ts               # Pool aggregation and export
```

### Phase 2: Context-Aware Selection Engine

#### 2.1 Theme Detection and Analysis
```typescript
class ThemeAnalyzer {
  parsePrompt(prompt: string): ThemeProfile {
    const themes = this.extractThemes(prompt);
    const keywords = this.extractKeywords(prompt);
    const mood = this.detectMood(prompt);
    const requirements = this.parseRequirements(prompt);
    
    return { themes, keywords, mood, requirements };
  }
  
  private extractThemes(prompt: string): string[] {
    const themePatterns = {
      mansion: /mansion|estate|manor|grand|luxurious|opulent/i,
      forest: /forest|woodland|tree|grove|natural|wilderness/i,
      cave: /cave|cavern|underground|subterranean|rocky/i,
      volcanic: /volcanic|lava|fire|forge|molten|obsidian/i,
      necropolis: /necropolis|tomb|crypt|burial|death|cemetery/i,
      laboratory: /laboratory|experiment|alchemy|arcane|magical/i
    };
    
    return Object.entries(themePatterns)
      .filter(([theme, pattern]) => pattern.test(prompt))
      .map(([theme]) => theme);
  }
  
  analyzeAdjacentRooms(context: RoomContext): ThemeProfile {
    // Analyze current room and connected rooms for theme consistency
    const adjacentThemes = this.extractThemesFromRoom(context.currentRoom);
    const regionTheme = context.region?.type;
    
    return {
      themes: adjacentThemes,
      regionTheme,
      coherenceWeight: 0.8  // Strong preference for region coherence
    };
  }
}
```

#### 2.2 Smart Content Selection
```typescript
class ContentSelector {
  selectBestRoom(
    targetThemes: string[], 
    context: RoomContext, 
    usedRoomIds: Set<string>
  ): MockRoom {
    const pool = this.getThemePool(targetThemes);
    const candidates = pool.filter(room => !usedRoomIds.has(room.id));
    
    if (candidates.length === 0) {
      // Fallback to allowing reuse with variation
      candidates = pool;
    }
    
    // Score each candidate
    const scored = candidates.map(room => ({
      room,
      score: this.scoreRoomFit(room, targetThemes, context)
    }));
    
    // Sort by score and add randomization
    scored.sort((a, b) => b.score - a.score);
    
    // Select from top 3 candidates for some variety
    const topCandidates = scored.slice(0, 3);
    const selected = this.weightedRandomSelect(topCandidates);
    
    return selected.room;
  }
  
  private scoreRoomFit(room: MockRoom, themes: string[], context: RoomContext): number {
    let score = 0;
    
    // Theme matching
    const themeOverlap = room.themes.filter(t => themes.includes(t)).length;
    score += themeOverlap * 10;
    
    // Region coherence
    if (context.region && room.themes.includes(context.region.type)) {
      score += 15;
    }
    
    // Adjacency bonuses/penalties
    const adjacentThemes = this.extractAdjacentThemes(context);
    score += room.adjacencyBonus.filter(t => adjacentThemes.includes(t)).length * 5;
    score -= room.adjacencyPenalty.filter(t => adjacentThemes.includes(t)).length * 8;
    
    // Mood compatibility
    if (context.preferredMood && room.mood === context.preferredMood) {
      score += 8;
    }
    
    return score;
  }
}
```

#### 2.3 Variation Generation
```typescript
class VariationGenerator {
  addVariation(baseRoom: MockRoom, context: RoomContext): GeneratedRoom {
    const name = this.varyName(baseRoom, context);
    const description = this.varyDescription(baseRoom, context);
    const connections = this.generateConnections(baseRoom, context);
    
    return { name, description, connections };
  }
  
  private varyDescription(room: MockRoom, context: RoomContext): string {
    let description = room.description;
    
    // Use variation if available and context suggests it
    if (room.descriptionVariations.length > 0 && Math.random() < 0.3) {
      description = this.selectBestVariation(room.descriptionVariations, context);
    }
    
    // Add contextual details based on prompt
    if (context.connectionName) {
      description = this.addConnectionContext(description, context.connectionName);
    }
    
    // Add lighting/mood modifiers based on region or adjacent rooms
    description = this.addAtmosphericDetails(description, context);
    
    return description;
  }
  
  generateConnections(room: MockRoom, context: RoomContext): MockConnection[] {
    const connections: MockConnection[] = [];
    
    // Always add return path
    const returnDirection = this.getReverseDirection(context.direction);
    if (returnDirection) {
      connections.push(this.createReturnConnection(returnDirection, context));
    }
    
    // Add additional connections based on room hints and context
    const additionalCount = this.rollConnectionCount();
    const availableDirections = this.getAvailableDirections(context);
    
    for (let i = 0; i < additionalCount && connections.length < 4; i++) {
      const direction = availableDirections[i % availableDirections.length];
      const connection = this.createThematicConnection(direction, room, context);
      connections.push(connection);
    }
    
    return connections;
  }
}
```

### Phase 3: Integration and Configuration

#### 3.1 Enhanced GrokClient Integration
```typescript
// Modify existing grokClient.ts
export class GrokClient {
  private mockEngine: MockAIEngine;
  
  constructor(config?: Partial<GrokConfig>) {
    // ... existing constructor
    this.mockEngine = new MockAIEngine({
      quality: process.env.AI_MOCK_QUALITY || 'high',
      variation: process.env.AI_MOCK_VARIATION === 'true',
      debug: process.env.AI_MOCK_DEBUG === 'true',
      seed: process.env.AI_MOCK_SEED ? parseInt(process.env.AI_MOCK_SEED) : undefined
    });
  }
  
  async generateRoom(context: RoomContext): Promise<GeneratedRoom> {
    if (this.config.mockMode) {
      return this.mockEngine.generateRoom(this.buildPrompt(context), context);
    }
    // ... existing real API logic
  }
  
  // Similar updates for generateRegion and generateNPC
}
```

#### 3.2 Environment Configuration
```env
# Enhanced Mock AI Configuration
AI_MOCK_MODE=true                      # Enable mock mode
AI_MOCK_QUALITY=high                   # high|medium|basic
AI_MOCK_VARIATION=true                 # Enable variation logic
AI_MOCK_DEBUG=false                    # Show selection reasoning
AI_MOCK_CONTEXT_SENSITIVITY=0.8        # How much to weight context (0-1)
AI_MOCK_CREATIVITY_LEVEL=0.3           # How much to vary from templates (0-1)
AI_MOCK_REPETITION_AVOIDANCE=true      # Track and avoid recent responses
AI_MOCK_FALLBACK_ENABLED=true          # Fall back to basic mocks if needed
AI_MOCK_SEED=12345                     # Deterministic seed for testing
AI_MOCK_THEME_COHERENCE=0.8            # How much to prefer regional coherence
```

#### 3.3 Debug and Analytics System
```typescript
interface MockDebugInfo {
  selectedContentId: string;
  selectionReason: string;
  themeAnalysis: ThemeProfile;
  candidateCount: number;
  scoreBreakdown: Record<string, number>;
  variationsApplied: string[];
}

class MockAnalytics {
  logSelection(debug: MockDebugInfo): void {
    if (process.env.AI_MOCK_DEBUG === 'true') {
      console.log('🎭 Mock AI Selection:', {
        content: debug.selectedContentId,
        reason: debug.selectionReason,
        themes: debug.themeAnalysis.themes,
        score: debug.scoreBreakdown
      });
    }
  }
  
  trackUsage(contentType: string, contentId: string): void {
    // Track which content gets used most for optimization
  }
}
```

## Content Creation Guidelines

### Room Content Standards
Each theme pool should include:

**Mansion Rooms (50+ variations):**
- Grand Library (mahogany shelves, leather-bound tomes, fireplace)
- Ballroom (crystal chandeliers, polished marble, grand piano)
- Master Bedroom (four-poster bed, silk curtains, ornate furniture)
- Servants' Quarters (simple beds, practical furniture, narrow windows)
- Kitchen (copper pots, stone hearth, preparation tables)
- Wine Cellar (stone archways, aged barrels, cool dampness)
- Gallery (portrait paintings, velvet ropes, hardwood floors)
- Conservatory (glass walls, exotic plants, marble fountains)

**Forest Rooms (50+ variations):**
- Ancient Grove (towering oaks, dappled sunlight, moss-covered stones)
- Crystal Stream (babbling water, smooth rocks, wildflowers)
- Hidden Clearing (ring of mushrooms, fairy lights, peaceful silence)
- Treehouse Village (rope bridges, wooden platforms, birds' nests)
- Dense Thicket (tangled branches, thorny vines, hidden paths)
- Moonlit Glade (silver light, deer trails, ethereal mist)
- Sacred Circle (standing stones, ancient runes, mystical energy)

### Connection Generation Rules
- **Return paths must be thematically consistent** with entrance
- **Direction logic must be spatially coherent** (no conflicting directions)
- **Style matching based on region and room themes**
- **Bidirectional descriptions that make sense from both sides**

### Quality Assurance
- **No repeated exact descriptions** within 20 rooms
- **Thematic coherence maintained** within regions
- **Grammatically correct and immersive language**
- **Consistent tone and style** with existing AI-generated content

## Testing Strategy

### New Game Setup
**Important**: When implementing new mock content pools, update `createGameWithRooms()` in `src/utils/initDb.ts` to include representative content from each theme category for immediate validation.

### Unit Tests
```typescript
describe('MockAIEngine', () => {
  test('should select thematically appropriate rooms', () => {
    const engine = new MockAIEngine();
    const context = createMockContext({ region: { type: 'mansion' } });
    
    const room = engine.selectRoom(['mansion', 'library'], context, new Set());
    
    expect(room.themes).toContain('mansion');
    expect(room.themes.some(t => ['library', 'study', 'books'].includes(t))).toBe(true);
  });
  
  test('should avoid repetition within session', () => {
    const engine = new MockAIEngine();
    const usedIds = new Set(['mansion_library_1', 'mansion_study_1']);
    
    const room = engine.selectRoom(['mansion'], context, usedIds);
    
    expect(usedIds.has(room.id)).toBe(false);
  });
  
  test('should generate appropriate connections', () => {
    const room = mockMansionLibrary;
    const connections = engine.generateConnections(room, context);
    
    expect(connections).toHaveLength(2, 4); // 2-4 connections
    expect(connections.some(c => c.direction === 'south')).toBe(true); // Return path
  });
});
```

### Integration Tests
```typescript
describe('Mock AI Integration', () => {
  test('should provide seamless replacement for real API', async () => {
    process.env.AI_MOCK_MODE = 'true';
    const grokClient = new GrokClient();
    
    const room = await grokClient.generateRoom(mockContext);
    
    expect(room.name).toBeDefined();
    expect(room.description).toBeDefined();
    expect(room.connections).toBeDefined();
    expect(room.connections.length).toBeGreaterThan(0);
  });
  
  test('should maintain thematic coherence across multiple generations', async () => {
    const grokClient = new GrokClient();
    const mansionContext = { ...mockContext, region: { type: 'mansion' } };
    
    const rooms = await Promise.all([
      grokClient.generateRoom(mansionContext),
      grokClient.generateRoom(mansionContext),
      grokClient.generateRoom(mansionContext)
    ]);
    
    rooms.forEach(room => {
      expect(room.description).toMatch(/mansion|grand|elegant|luxurious/i);
    });
  });
});
```

## Performance Considerations

### Memory Optimization
- **Lazy loading** of content pools
- **LRU cache** for recently used content
- **Efficient theme indexing** for fast lookups

### Response Time
- **Pre-computed theme mappings** for instant selection
- **Async pool initialization** to avoid startup delays
- **Fallback chain** for graceful degradation

## Success Metrics

### Primary Goals
- [ ] **90%+ API cost reduction** during development
- [ ] **Sub-50ms response time** for mock generation
- [ ] **50+ unique rooms per theme** before repetition
- [ ] **Zero breaking changes** to existing GrokClient interface

### Quality Metrics
- [ ] **Thematic coherence score >85%** in user testing
- [ ] **Developer satisfaction** with mock quality
- [ ] **Test reliability** with deterministic responses
- [ ] **Seamless mode switching** between mock and real API

## Future Enhancements

### Advanced Features
- **Dynamic template combination** for infinite variety
- **Machine learning on real API responses** for quality improvement
- **Community content contributions** via configuration files
- **A/B testing framework** for comparing mock vs real responses

### Analytics Integration
- **Usage tracking** to optimize content pools
- **Quality metrics** to identify best-performing content
- **Theme preference analysis** for targeted content creation

This comprehensive mock AI system will provide rich, varied, context-aware responses that eliminate API costs while maintaining the immersive game experience that Shadow Kingdom provides.