# Shadow Kingdom: Region Distribution Consolidation Specification

**Status**: 🚧 IN DEVELOPMENT  
**Priority**: High  
**Related Issue**: region-distribution-consolidation.md  

## Overview

This specification addresses the region fragmentation problem where the current system generates too many micro-regions (37 regions for ~60 rooms) instead of substantial, thematically coherent regions. The goal is to consolidate into 5-8 major regions with 8-15 rooms each.

## Problem Analysis

### Current State (Problematic)
- **37 total regions** in active game
- **24 regions with only 1 room** (micro-regions)
- **3 regions with 0 rooms** (orphaned regions)
- **Average 1.6 rooms per region** (should be 8-12)
- **Thematic redundancy**: Multiple "Crucible", "Necropolis", "Citadel" regions

### Root Cause Analysis
The current 15% base + 12% per distance probability is too aggressive in creating new regions rather than expanding existing ones. The system needs higher bias toward region consolidation.

## Target Architecture

### Desired Distribution
- **5-8 major regions**: 8-15 rooms each
- **2-3 smaller regions**: 3-5 rooms each  
- **Maximum 10 total regions** per game
- **Minimum 3 rooms per region** before creating new regions
- **Clear thematic separation** between regions

### Region Size Targets
```
Tier 1 (Major): 12-15 rooms (2-3 regions)
Tier 2 (Medium): 8-11 rooms (3-4 regions)  
Tier 3 (Small): 4-7 rooms (2-3 regions)
Tier 4 (Minimal): 3 rooms (emergency only)
```

## Implementation Strategy

### Phase 1: Analysis and Algorithm Adjustment

#### 1.1 Region Probability Enhancement
**File**: `src/services/regionService.ts`

```typescript
// Current: 15% base + 12% per distance
// New: Bias heavily toward existing regions

interface RegionConsolidationConfig {
  baseRegionStickiness: number;     // 85% (up from 15%)
  distanceDecayRate: number;        // 8% per distance (down from 12%)
  minRoomsBeforeNewRegion: number;  // 4 rooms minimum
  maxRegionsPerGame: number;        // 10 regions maximum
  preferredRegionSize: number;      // 10 rooms target
}

// Enhanced region selection logic
async selectTargetRegion(context: RegionContext): Promise<Region> {
  const nearbyRegions = await this.findNearbyRegions(context.fromRoomId, 3);
  
  // Strongly prefer expanding existing regions
  for (const region of nearbyRegions) {
    const roomCount = await this.getRegionRoomCount(region.id);
    const distance = region.distance;
    
    // Higher probability for undersized regions
    let probability = this.config.baseRegionStickiness;
    if (roomCount < this.config.preferredRegionSize) {
      probability += (this.config.preferredRegionSize - roomCount) * 5; // 5% per missing room
    }
    probability -= distance * this.config.distanceDecayRate;
    
    if (Math.random() * 100 < probability) {
      return region;
    }
  }
  
  // Only create new region if under limit and existing regions are full
  const totalRegions = await this.getRegionCount(context.gameId);
  if (totalRegions < this.config.maxRegionsPerGame) {
    const smallestRegion = await this.findSmallestRegion(context.gameId);
    if (smallestRegion && await this.getRegionRoomCount(smallestRegion.id) >= this.config.minRoomsBeforeNewRegion) {
      return await this.createNewRegion(context);
    }
  }
  
  // Fallback: expand nearest region
  return nearbyRegions[0] || await this.createNewRegion(context);
}
```

#### 1.2 Region Creation Threshold
**Implementation**: Prevent new region creation until existing regions reach minimum size

```typescript
async shouldCreateNewRegion(gameId: number, context: RegionContext): Promise<boolean> {
  const totalRegions = await this.getRegionCount(gameId);
  
  // Hard limit on total regions
  if (totalRegions >= this.config.maxRegionsPerGame) {
    return false;
  }
  
  // Check if any existing regions are under-sized
  const undersizedRegions = await this.findUndersizedRegions(gameId);
  if (undersizedRegions.length > 0) {
    return false; // Expand existing regions first
  }
  
  return true;
}
```

### Phase 2: Thematic Consolidation System

#### 2.1 Theme Collision Detection
**File**: `src/services/regionService.ts`

```typescript
interface ThemeConsolidation {
  similarThemes: string[];
  consolidatedName: string;
  priority: number;
}

const THEME_CONSOLIDATION_RULES: ThemeConsolidation[] = [
  {
    similarThemes: ['crucible', 'forge', 'foundry'],
    consolidatedName: 'Forge District',
    priority: 1
  },
  {
    similarThemes: ['necropolis', 'cemetery', 'burial'],
    consolidatedName: 'Necropolis',
    priority: 1
  },
  {
    similarThemes: ['citadel', 'fortress', 'stronghold'],
    consolidatedName: 'Fortress Complex',
    priority: 2
  }
];

async detectThemeCollisions(gameId: number): Promise<ThemeCollision[]> {
  const regions = await this.getAllRegions(gameId);
  const collisions: ThemeCollision[] = [];
  
  for (const rule of THEME_CONSOLIDATION_RULES) {
    const matchingRegions = regions.filter(region => 
      rule.similarThemes.some(theme => 
        region.type.toLowerCase().includes(theme) || 
        region.name.toLowerCase().includes(theme)
      )
    );
    
    if (matchingRegions.length > 1) {
      collisions.push({
        rule,
        regions: matchingRegions,
        suggestedConsolidation: rule.consolidatedName
      });
    }
  }
  
  return collisions;
}
```

#### 2.2 AI Prompt Enhancement
**File**: `src/ai/grokClient.ts`

```typescript
// Enhanced region-aware prompts
private buildRegionAwarePrompt(context: RegionContext): string {
  const regionInfo = context.targetRegion;
  const existingRoomCount = context.regionRoomCount;
  
  return `Generate a room for the ${regionInfo.name} region (${regionInfo.type}).
Region Description: ${regionInfo.description}
Current Region Size: ${existingRoomCount} rooms
Target Region Size: 8-12 rooms

IMPORTANT: This region should feel cohesive and connected. Rooms should complement existing rooms in this region.
Adjacent rooms in this region: ${context.regionRooms.map(r => r.name).join(', ')}

${this.getRegionSpecificPrompts(regionInfo.type)}`;
}

private getRegionSpecificPrompts(regionType: string): string {
  const prompts = {
    'mansion': 'Focus on manor architecture: great halls, libraries, chambers, servants quarters, ballrooms.',
    'forest': 'Focus on natural woodland: clearings, groves, ancient trees, hidden paths, streams.',
    'cave': 'Focus on underground systems: caverns, tunnels, underground lakes, crystal formations.',
    'volcanic': 'Consolidate all volcanic/forge themes: lava flows, obsidian formations, forge chambers.',
    'necropolis': 'Consolidate all burial/death themes: tombs, crypts, burial chambers, ossuary.'
  };
  
  return prompts[regionType] || 'Create rooms that thematically align with the existing region.';
}
```

### Phase 3: Migration and Cleanup System

#### 3.1 Region Consolidation Migration
**File**: `src/utils/regionMigration.ts`

```typescript
export class RegionConsolidationMigration {
  async consolidateGame(gameId: number): Promise<ConsolidationReport> {
    const report: ConsolidationReport = {
      beforeRegions: 0,
      afterRegions: 0,
      mergedRegions: [],
      renamedRegions: [],
      removedEmptyRegions: []
    };
    
    // Step 1: Remove empty regions
    await this.removeEmptyRegions(gameId, report);
    
    // Step 2: Merge theme collisions
    await this.mergeThemeCollisions(gameId, report);
    
    // Step 3: Consolidate micro-regions
    await this.consolidateMicroRegions(gameId, report);
    
    // Step 4: Rename for clarity
    await this.standardizeRegionNames(gameId, report);
    
    return report;
  }
  
  private async mergeThemeCollisions(gameId: number, report: ConsolidationReport): Promise<void> {
    const collisions = await this.regionService.detectThemeCollisions(gameId);
    
    for (const collision of collisions) {
      if (collision.regions.length > 1) {
        const primaryRegion = collision.regions.reduce((largest, current) => 
          current.roomCount > largest.roomCount ? current : largest
        );
        
        // Merge smaller regions into the largest one
        for (const region of collision.regions) {
          if (region.id !== primaryRegion.id) {
            await this.mergeRegionInto(region.id, primaryRegion.id);
            report.mergedRegions.push({
              from: region.name,
              to: primaryRegion.name
            });
          }
        }
        
        // Update primary region name
        await this.updateRegionName(primaryRegion.id, collision.suggestedConsolidation);
        report.renamedRegions.push({
          oldName: primaryRegion.name,
          newName: collision.suggestedConsolidation
        });
      }
    }
  }
}
```

## Environment Configuration

### New Environment Variables
```env
# Region Consolidation Settings
REGION_BASE_STICKINESS=85              # Base probability to stay in region
REGION_DISTANCE_DECAY=8                # Probability decrease per distance
MIN_ROOMS_BEFORE_NEW_REGION=4          # Minimum rooms before creating new region
MAX_REGIONS_PER_GAME=10                # Hard limit on total regions
PREFERRED_REGION_SIZE=10               # Target rooms per region
ENABLE_REGION_CONSOLIDATION=true       # Enable consolidation features
```

## Testing Strategy

### Unit Tests
- Region probability calculations
- Theme collision detection
- Consolidation algorithm correctness

### New Game Testing
**Important**: Update `createGameWithRooms()` in `src/utils/initDb.ts` to create starting rooms across multiple test regions (mansion, forest, crypt, observatory) to immediately validate region consolidation behavior.

### Integration Tests  
- End-to-end region generation with new parameters
- Migration script validation
- Performance impact measurement

### Success Metrics
- Average regions per game: 6-8 (down from 37)
- Average rooms per region: 8-12 (up from 1.6)
- Theme collision rate: <10% (down from ~60%)
- Zero empty regions
- Player experience: More coherent exploration

## Implementation Timeline

**Week 1**: Algorithm adjustment and probability tuning
**Week 2**: Theme consolidation system and AI prompt enhancement  
**Week 3**: Migration tools and existing game cleanup
**Week 4**: Testing, validation, and performance optimization

## Risk Mitigation

- **Backward compatibility**: Migration tools preserve existing game data
- **Gradual rollout**: New settings only affect new games initially
- **Fallback systems**: Graceful degradation if consolidation fails
- **Performance monitoring**: Track generation time impact

This specification provides a comprehensive solution to transform the fragmented region system into a coherent, player-friendly world generation experience.