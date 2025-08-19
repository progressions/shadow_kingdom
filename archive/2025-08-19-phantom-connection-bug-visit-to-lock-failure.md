# Phantom Connection Bug: Visit-to-Lock System Failure

**Date**: 2025-08-19  
**Status**: Open  
**Priority**: Critical  
**Category**: Bug  
**Estimated Time**: 2-3 hours  

## Summary

The visit-to-lock mechanism is failing to prevent background generation from adding new connections to already-visited rooms, causing "phantom connections" that break spatial consistency and violate core text adventure principles.

## Problem Statement

During live testing, the "Smoldering Obsidian Ledge" room exhibited different connection counts between visits:
- **First visit**: 1 exit (south)
- **Return visit**: 2 exits (north, south)

This behavior violates the visit-to-lock promise that room layouts remain fixed after the first player visit, breaking the fundamental spatial consistency that players rely on to build mental maps.

## Root Cause Analysis

The visit-to-lock system (`generation_processed = TRUE`) is supposed to prevent background generation from modifying visited rooms, but is failing under the aggressive background generation system. Possible causes:

1. **Processing Logic Order**: Room marking happens too late in the flow
2. **Background Generation Bypass**: System ignoring `generation_processed` flag
3. **Race Condition**: Concurrent generation vs processing marking
4. **SessionInterface vs GameController**: Different processing paths

## Technical Details

**Affected Room**: Smoldering Obsidian Ledge (Room ID: TBD)
**Game Session**: Game 1 in shadow_kingdom_session.db
**Symptom**: Connection count changed from 1 to 2 between visits
**Impact**: Critical - breaks core text adventure spatial consistency

## Reproduction Steps

1. Start new game session
2. Navigate to a room with limited connections
3. Leave the room and trigger background generation
4. Return to the original room
5. **Expected**: Same number of connections
6. **Actual**: Additional connections appear

## Acceptance Criteria

### Core Functionality
- [ ] Visited rooms maintain identical connection counts on return visits
- [ ] `generation_processed = TRUE` prevents all connection modifications
- [ ] Background generation respects visit-to-lock status
- [ ] Both SessionInterface and GameController handle processing consistently

### Edge Cases
- [ ] Rapid room transitions don't create race conditions
- [ ] Massive background generation doesn't override processing flags
- [ ] Connection creation timestamps show proper ordering

### Quality Assurance
- [ ] All existing visit-to-lock tests continue passing
- [ ] New reproduction test case added and passing
- [ ] Live gameplay testing confirms fix effectiveness

## Implementation Plan

### Phase 1: Data Collection & Verification (30 mins)
- Reproduce issue systematically with specific room ID
- Check database state: `generation_processed` status
- Document connection creation timestamps
- Verify issue scope (isolated vs widespread)

### Phase 2: Root Cause Analysis (45 mins)
- Compare SessionInterface vs GameController processing logic
- Examine background generation room modification checks
- Identify exact failure point in visit-to-lock flow
- Review room processing timing and order

### Phase 3: Targeted Testing (30 mins)
- Create minimal reproduction test case
- Test both interface paths (SessionInterface + GameController)
- Validate connection count consistency

### Phase 4: Fix Implementation (60 mins)
- Apply targeted fix based on root cause analysis
- Likely fixes: processing order, flag checking, race condition handling
- Comprehensive validation of fix effectiveness

## Testing Strategy

### Unit Tests
- Visit-to-lock mechanism isolation testing
- Background generation room modification checks
- Processing flag state management

### Integration Tests
- End-to-end room visit consistency
- Background generation with processed rooms
- SessionInterface processing behavior

### Manual Testing
- Reproduction case verification
- Extended gameplay spatial consistency
- Performance impact of fix

## Dependencies

- Existing background generation system
- Visit-to-lock test infrastructure
- Database connection creation tracking
- SessionInterface and GameController logic

## Risks and Mitigations

### Risk: Performance Impact
**Mitigation**: Focus on logic fixes rather than additional database queries

### Risk: Breaking Background Generation
**Mitigation**: Preserve generation functionality while fixing lock mechanism

### Risk: Complex Race Conditions
**Mitigation**: Use systematic debugging approach with database forensics

## Success Metrics

- **Spatial Consistency**: 100% of visited rooms maintain identical layouts on return
- **Test Coverage**: All visit-to-lock tests passing + new reproduction test
- **User Experience**: Players can rely on consistent mental mapping
- **System Stability**: Background generation continues working without phantom connections

## Related Issues

- Previous visit-to-lock fixes (reference completed work)
- Background generation system validation
- SessionInterface implementation differences

## References

- Background Generation System Documentation
- Visit-to-Lock Test Cases
- Database Schema Documentation
- Text Adventure Spatial Consistency Principles

---

**Priority Justification**: This breaks a fundamental promise of text adventures - spatial consistency. Players cannot build reliable mental maps if room layouts change between visits, severely damaging the core user experience despite the excellent background generation functionality.