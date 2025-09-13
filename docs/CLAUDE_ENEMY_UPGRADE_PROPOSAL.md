# Enemy AI and Pathfinding Upgrade Proposal

## Current State
Enemies currently move directly toward the player using simple vector movement. This causes issues when obstacles or walls block the path, resulting in enemies getting stuck or exhibiting unnatural behavior.

## Proposed Solutions

### 1. Simple Obstacle Avoidance (Minimal Change)
Keep direct movement but add basic obstacle detection and avoidance.

**Implementation:**
- Cast rays left/right when blocked
- Try alternate angles (±30°, ±60°, ±90°)
- Move perpendicular to obstacle briefly, then resume direct path

**Pros:**
- Easy to implement
- Low CPU cost
- Minimal code changes

**Cons:**
- Can get stuck in corners
- Movement looks robotic
- Not optimal for complex layouts

### 2. A* Pathfinding (Classic Solution)
Pre-compute grid of walkable tiles and find optimal paths.

**Implementation:**
- Divide map into grid cells (16x16 or 32x32)
- Calculate path from enemy to player using A* algorithm
- Recalculate periodically (every 0.5-1s) or when blocked
- Share pathfinding results among nearby enemies for performance

**Pros:**
- Guaranteed optimal paths
- Handles mazes and complex layouts well
- Well-documented algorithm

**Cons:**
- CPU intensive with many enemies
- Requires grid setup and maintenance
- May cause all enemies to take same path

### 3. Flow Fields (Scalable for Hordes)
Calculate direction vectors for entire map pointing toward player.

**Implementation:**
- Generate single flow field from player position
- All enemies just follow local flow direction
- Update field periodically (every 30-60 frames)
- Use Dijkstra or brushfire algorithm for field generation

**Pros:**
- Scales to hundreds of enemies
- Natural swarming behavior
- Single calculation for all enemies

**Cons:**
- Memory overhead for flow field storage
- Complex implementation
- Requires careful tuning

### 4. Steering Behaviors (Natural Movement)
Combine multiple movement impulses for organic motion.

**Behaviors:**
- **Seek**: Move toward player
- **Avoid**: Steer around obstacles (using short raycasts)
- **Separation**: Keep distance from other enemies
- **Arrival**: Slow down when approaching target

**Implementation:**
- Weight and blend these forces
- Use local perception (raycasts) for obstacle detection
- Smooth movement with acceleration/deceleration

**Pros:**
- Organic, natural-looking movement
- Handles dynamic obstacles well
- No pre-computation needed

**Cons:**
- Can fail in complex mazes
- Requires careful force balancing
- May exhibit emergent unwanted behaviors

### 5. Hybrid Approach (Recommended)
Combine simple methods based on context and distance.

**Strategy:**
- **Far from player (>300px)**: Use direct movement with basic avoidance
- **Medium range (100-300px)**: Use steering behaviors
- **Close/Complex areas**: Switch to A* if stuck for >2 seconds
- Cache successful paths between common points

**Pros:**
- Balances performance and quality
- Adapts to different scenarios
- Fallback mechanisms prevent getting stuck

**Cons:**
- More complex state management
- Requires tuning thresholds
- Debugging can be more difficult

### 6. Line-of-Sight with Flanking
Smarter tactical movement with combat awareness.

**Implementation:**
- Check LOS to player regularly
- If blocked, pick flanking positions (left/right of obstacles)
- Move to intermediate waypoints that have clear paths
- Some enemies could circle around while others wait

**Pros:**
- Creates interesting combat scenarios
- Enemies appear more intelligent
- Varied attack patterns

**Cons:**
- Requires tactical analysis of space
- More complex decision trees
- May need per-enemy-type behaviors

## Performance Optimizations

Applicable to any chosen approach:

### Time-slicing
- Spread pathfinding calculations across multiple frames
- Update different enemy groups on different frames

### Level-of-Detail (LOD) System
- Distant enemies use simpler AI
- Off-screen enemies update less frequently
- Complexity scales with proximity to player

### Path Sharing
- Groups of enemies going to same destination share calculations
- Leader calculates path, followers use offset positions

### Path Caching
- Store recent successful paths
- Reuse paths when start/end points are similar
- Invalidate cache when obstacles change

### Update Staggering
- Don't update all enemies in same frame
- Use modulo operator with enemy ID for update scheduling
- Prioritize enemies closer to player

## Implementation Recommendation

Given Shadow Kingdom's characteristics:
- Real-time combat focus
- No build dependencies
- Browser-based performance constraints
- Current simple architecture

**Recommended approach:**

1. **Phase 1**: Implement Simple Obstacle Avoidance
   - Quick win with immediate improvement
   - Minimal code changes
   - Test performance impact

2. **Phase 2**: Add Steering Behaviors
   - Layer on top of Phase 1
   - Improve movement quality
   - Still relatively simple

3. **Phase 3**: Implement A* Fallback
   - Only for enemies stuck >2 seconds
   - Limited grid size around stuck enemy
   - Cache results aggressively

This phased approach allows incremental improvements while maintaining code simplicity and performance.

## Code Integration Points

Key files that would need modification:
- `src/systems/step.js`: Main enemy update loop
- `src/systems/combat.js`: Movement and targeting logic
- `src/engine/terrain.js`: Obstacle detection interface
- `src/engine/state.js`: Enemy state management

New files to consider:
- `src/systems/pathfinding.js`: Core pathfinding algorithms
- `src/systems/enemy_ai.js`: AI behavior management
- `src/utils/spatial.js`: Spatial queries and optimizations

## Testing Considerations

- Create test levels with various obstacle configurations
- Measure performance with different enemy counts
- Test edge cases: dead ends, narrow passages, moving obstacles
- Ensure save/load compatibility with new AI states

## Conclusion

The current direct movement approach can be significantly improved without major architectural changes. Starting with simple improvements and progressively adding sophistication allows for maintaining game performance while enhancing enemy behavior. The hybrid approach offers the best balance of simplicity, performance, and player experience.