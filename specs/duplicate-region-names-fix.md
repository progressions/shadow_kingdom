# Fix Duplicate Region Names Specification

## Overview

This specification addresses the issue where multiple regions in the same game can have identical names, causing confusion and breaking immersion. The fix ensures each region within a game has a unique name by implementing validation and automatic name variation.

## Current Problem

The region generation system creates regions without checking for name uniqueness, resulting in:
- Multiple "Night Bazaar (phantom market)" regions
- Multiple "The Floating Archive (sky library)" regions  
- Multiple "Gloomspire Nexus" regions with slight variations

## Solution Architecture

### 1. Region Name Uniqueness Validation

**Location**: `src/services/regionService.ts`

Add validation logic that:
- Checks existing region names in the current game before creating new regions
- Generates unique name variants when duplicates are detected
- Maintains backward compatibility with existing games

### 2. Name Variation Strategy

When a duplicate region name is detected, apply these strategies in order:
1. **Directional Suffixes**: "Night Bazaar East", "Night Bazaar West", "Night Bazaar North", "Night Bazaar South"
2. **Level/Position**: "Night Bazaar Upper", "Night Bazaar Lower", "Night Bazaar Central"
3. **Descriptive Variations**: "Night Bazaar Outer", "Night Bazaar Inner", "Night Bazaar Distant"
4. **Numbered Fallback**: "Night Bazaar II", "Night Bazaar III" (only as last resort)

### 3. Implementation Details

#### Database Changes
No schema changes required - this is handled at the application level.

#### Service Layer Changes

**RegionService Updates:**
```typescript
interface RegionService {
  // New method for name uniqueness
  generateUniqueRegionName(baseName: string, gameId: number): Promise<string>;
  
  // Enhanced existing method
  createRegion(name: string, theme: string, gameId: number): Promise<Region>;
  
  // New helper method
  private getExistingRegionNames(gameId: number): Promise<string[]>;
}
```

## Implementation Steps

### Phase 1: Core Infrastructure
1. Add `generateUniqueRegionName` method to RegionService
2. Add `getExistingRegionNames` helper method
3. Create name variation logic with directional/positional suffixes

### Phase 2: Integration
1. Update `createRegion` method to use uniqueness validation
2. Update room generation service to use the new region creation flow
3. Ensure all region creation paths use the validation

### Phase 3: Testing
1. Unit tests for name uniqueness validation
2. Unit tests for name variation strategies
3. Integration tests for region creation
4. End-to-end tests with `regions` command

## Acceptance Criteria

### Functional Requirements
- ✅ No duplicate region names within a single game
- ✅ System automatically generates unique variants for duplicate names
- ✅ Name variations follow logical patterns (directional, positional)
- ✅ Existing games continue to work without issues
- ✅ `regions` command shows only unique region names

### Technical Requirements
- ✅ Validation happens at region creation time
- ✅ Performance impact is minimal (single query per region creation)
- ✅ Name generation is deterministic for consistency
- ✅ Backward compatibility maintained

## Test Cases

### Unit Tests
1. **Name Uniqueness Validation**
   - Test with no existing regions → original name returned
   - Test with one duplicate → directional suffix added
   - Test with multiple duplicates → appropriate variation chosen

2. **Name Variation Logic**
   - Test directional suffixes (East, West, North, South)
   - Test positional suffixes (Upper, Lower, Central)
   - Test descriptive variations (Outer, Inner, Distant)
   - Test numbered fallback as last resort

3. **Database Integration**
   - Test querying existing region names
   - Test region creation with unique names
   - Test performance with large number of regions

### Integration Tests
1. **Region Creation Flow**
   - Test creating regions through normal gameplay
   - Test region creation through room generation
   - Verify all paths use uniqueness validation

2. **Backward Compatibility**
   - Test loading games with existing duplicate regions
   - Verify new regions created are unique
   - Test `regions` command output

### End-to-End Tests
1. **Game Session Testing**
   - Start new game and generate multiple regions
   - Verify no duplicates appear in `regions` command
   - Test with various region themes

2. **Long-running Game Testing**  
   - Create game with many regions (20+)
   - Verify name variations remain logical
   - Test performance remains acceptable

## Files to Modify

### Core Implementation
- `src/services/regionService.ts` - Main uniqueness logic
- `src/services/roomGenerationService.ts` - Integration point

### Testing
- `tests/services/regionService.test.ts` - Unit tests
- `tests/integration/regionCreation.test.ts` - Integration tests
- `tests/e2e/regions.test.ts` - End-to-end tests

## Migration Strategy

No database migration required. The fix is purely application-level:
1. Deploy the updated code
2. Existing games with duplicate regions continue working
3. New region creation automatically uses uniqueness validation
4. Over time, as games progress, all new regions will have unique names

## Success Metrics

- Zero duplicate region names in new games
- No performance regression in region creation
- All existing tests continue passing
- `regions` command output is clean and logical