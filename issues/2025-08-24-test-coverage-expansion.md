# Test Coverage Expansion - Phase 2 Implementation

**Date**: 2025-08-24  
**Status**: Open  
**Priority**: High  
**Category**: Testing/Quality  
**Related**: test_strategy.yml, 2025-08-24-test-suite-improvements.md

## Description

Following the successful completion of Phase 1 (fixing all failing tests), this issue tracks Phase 2 and Phase 3 of the test coverage expansion based on the test audit findings. The goal is to fill critical coverage gaps identified in the audit, particularly for Phase 9 features and concurrent operations.

## Current State

- **Phase 1**: ✅ Completed - All 26 failing tests fixed
- **Phase 2**: 🚧 In Progress - Critical coverage gaps
- **Phase 3**: 📋 Planned - Complete coverage expansion
- **Current Coverage**: ~70% (estimated)
- **Target Coverage**: >80% for critical paths

## Phase 2: Critical Coverage (Priority: High)

### 1. Phase 9 Region Queue System

**Priority**: Critical  
**Files to Create**:

#### `tests/services/regionQueueService.test.ts`
- [ ] Queue initialization with multiple regions
- [ ] Region sequence management (FIFO ordering)
- [ ] Transition logic between regions
- [ ] Queue state persistence across sessions
- [ ] Error recovery in queue operations
- [ ] Edge cases (empty queue, single region, max regions)

#### `tests/integration/region-queue-integration.test.ts`
- [ ] Full region progression flow (5+ regions)
- [ ] Multiple region transitions with room generation
- [ ] Queue recovery after generation errors
- [ ] Player movement across region boundaries
- [ ] Background generation with queue management

### 2. Background Generation Race Conditions

**Priority**: Critical  
**Files to Create**:

#### `tests/generation/concurrent-generation.test.ts`
- [ ] Simultaneous connection generation from multiple sources
- [ ] Processing flag atomic operations verification
- [ ] Connection claim conflict resolution
- [ ] Room creation deduplication mechanisms
- [ ] Orphaned room cleanup validation
- [ ] Transaction rollback on conflicts

#### `tests/performance/stress-generation.test.ts`
- [ ] Multiple players triggering generation in same area
- [ ] Rapid movement triggering overlapping generation
- [ ] Generation queue overflow handling
- [ ] Memory usage under concurrent load
- [ ] Database lock contention metrics

### 3. Command History Navigation

**Priority**: High  
**Files to Create**:

#### `tests/commands/command-history.test.ts`
- [ ] Arrow key navigation (up/down through history)
- [ ] History persistence between commands
- [ ] History buffer limits (max 100 commands)
- [ ] Command recall accuracy verification
- [ ] Empty history edge cases
- [ ] Special character handling in history

#### `tests/integration/history-persistence.test.ts`
- [ ] History across game sessions
- [ ] History isolation between different games
- [ ] History cleanup on game deletion
- [ ] Menu vs game command history separation

### 4. AI Mock Response System Enhancement

**Priority**: Medium  
**Files to Expand/Create**:

#### Expand `tests/ai/mockAIEngine.test.ts`
- [ ] All room generation scenarios with different themes
- [ ] Character generation with sentiment analysis
- [ ] Region generation with context awareness
- [ ] Fallback response quality testing
- [ ] Response variation testing
- [ ] Context sensitivity verification

#### Create `tests/ai/ai-fallback-chains.test.ts`
- [ ] Primary AI failure → mock fallback flow
- [ ] Mock failure → static fallback flow
- [ ] Response quality degradation tracking
- [ ] Fallback trigger conditions
- [ ] Recovery from fallback mode

## Phase 3: Complete Coverage (Priority: Medium)

### 5. Event Trigger System

#### Expand `tests/services/eventTriggerService.test.ts`
- [ ] All trigger types (combat, item, room, character)
- [ ] Complex trigger conditions
- [ ] Action execution verification
- [ ] Trigger persistence and loading
- [ ] Trigger priority and ordering

#### Create `tests/integration/event-triggers.test.ts`
- [ ] Combat trigger sequences
- [ ] Item pickup trigger chains
- [ ] Room entry trigger effects
- [ ] Character death trigger handling
- [ ] Composite trigger scenarios

### 6. Validation System

#### Expand `tests/services/actionValidator.test.ts`
- [ ] All action types validation
- [ ] Complex validation chains
- [ ] Permission system checks
- [ ] Context-aware validation rules
- [ ] Error message quality

### 7. Performance Benchmarks

#### Create `tests/performance/benchmarks.test.ts`
- [ ] Room generation < 500ms
- [ ] Database queries < 50ms
- [ ] Command processing < 100ms
- [ ] AI generation < 2000ms (with fallback)
- [ ] Memory usage tracking

#### Create `tests/performance/load.test.ts`
- [ ] 1000 rooms per game capacity
- [ ] 50 concurrent generation operations
- [ ] Memory leak detection
- [ ] Database size growth monitoring

## Implementation Strategy

### TDD Approach
1. Write failing test for specific behavior
2. Implement minimal code to pass
3. Refactor for clarity and performance
4. Ensure all related tests still pass
5. Document complex test scenarios

### Test Patterns to Use
- **Isolation**: Each test uses in-memory database
- **Determinism**: No reliance on test execution order
- **Clarity**: Descriptive test names and assertions
- **Performance**: Tests complete within 100ms (except stress tests)

### Mock Strategies
- Use real services where possible
- Mock only external dependencies (AI, filesystem)
- Verify mock interactions explicitly
- Maintain mock response consistency

## Acceptance Criteria

### Phase 2 Completion
- [ ] All Phase 2 test files created and passing
- [ ] No test timeouts or flaky tests
- [ ] Coverage > 75% for targeted services
- [ ] All tests pass with `--randomize` flag

### Phase 3 Completion
- [ ] All Phase 3 test files created and passing
- [ ] Overall coverage > 80% for critical paths
- [ ] Performance benchmarks established
- [ ] Complete test documentation

## Success Metrics

- **Test Execution Time**: < 3 minutes for full suite
- **Test Reliability**: 100% pass rate over 10 consecutive runs
- **Coverage Increase**: +10% overall, +15% for critical services
- **Documentation**: All new test files have README sections

## Technical Considerations

### Database Isolation
- Continue using `:memory:` SQLite databases
- Ensure proper cleanup in afterEach hooks
- No shared state between test files

### Async Operations
- Proper async/await usage
- No fire-and-forget promises
- Explicit timeout handling

### Mock Data Quality
- Realistic mock responses
- Consistent mock behavior
- Documented mock limitations

## Dependencies

- Jest testing framework
- TypeScript type definitions
- SQLite in-memory database support
- Mock service implementations

## Notes

- Start with Phase 2 critical items
- Each test file should be self-contained
- Follow patterns from existing passing tests
- Update this issue as tests are completed
- Consider creating sub-issues for large test groups

## Related Documentation

- `test_strategy.yml` - Overall test strategy
- `tests/README.md` - Test suite documentation  
- `tests/CLAUDE.md` - Testing guidelines
- `specs/test-suite-fixes-comprehensive.md` - Phase 1 completion details