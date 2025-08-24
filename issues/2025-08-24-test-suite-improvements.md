# Test Suite Improvements and Coverage Expansion

**Date**: 2025-08-24  
**Status**: Open  
**Priority**: High  
**Category**: Testing/Quality  
**Related**: test_strategy.yml, test-results-summary.md

## Description

Following the test suite audit and reorganization, several areas need improvement to achieve comprehensive coverage and fix existing failures. This issue tracks all necessary test improvements based on the audit findings.

## Current State

- **Overall Success Rate**: ~96.5% (1,020 of 1,066 tests passing)
- **Failed Tests**: 26 tests across 3 categories
- **Test Organization**: ✅ Completed (51 files reorganized into proper categories)
- **Coverage Gaps**: Multiple areas identified lacking adequate test coverage

## Required Fixes

### 1. Fix Failing Tests (Priority: Critical)

#### Generation Tests (17 failures)
- [ ] Fix `reduce-repetitive-room-descriptions.test.ts` - Update source code verification
- [ ] Fix `automaticRoomGeneration.test.ts` - Update for Phase 9 region queue system
- [ ] Fix `connectionBasedGeneration.test.ts` - Adjust for new connection handling
- [ ] Fix `duplicateRoomRaceCondition.test.ts` - Review race condition timing
- [ ] Fix `movement-room-generation.test.ts` - Update room generation expectations

#### Integration Tests (5 failures)
- [ ] Fix `backgroundGeneration.integration.test.ts` - Resolve timing issues
- [ ] Update integration tests for Phase 9 architectural changes
- [ ] Fix region name uniqueness test expectations

#### Service Tests (1 failure)
- [ ] Fix `regionConnectorService.test.ts` - Update path count assertion (expects >1, gets 1)

#### Item Tests (8 failures)
- [ ] Fix remaining import path issues in item tests
- [ ] Update item generation frequency test expectations
- [ ] Fix starter item validation tests

## New Test Coverage Required

### 2. Phase 9 Region Queue System (Priority: High)

Create comprehensive tests for the new simplified region queue system:

- [ ] Create `tests/services/regionQueueService.test.ts`
  - Queue initialization
  - Region sequence management
  - Transition logic
  - Queue state persistence

- [ ] Create `tests/integration/region-queue-integration.test.ts`
  - Full region progression flow
  - Multiple region transitions
  - Queue recovery after errors

### 3. Background Generation Race Conditions (Priority: High)

Expand race condition testing:

- [ ] Create `tests/generation/concurrent-generation.test.ts`
  - Simultaneous connection generation
  - Processing flag atomic operations
  - Connection claim conflicts
  - Room creation deduplication

- [ ] Add stress tests for concurrent generation
  - Multiple players in same area
  - Rapid movement triggering generation
  - Generation queue overflow handling

### 4. Command History Navigation (Priority: Medium)

Add missing command history tests:

- [ ] Create `tests/commands/command-history.test.ts`
  - Arrow key navigation (up/down)
  - History persistence
  - History limits
  - Command recall accuracy

- [ ] Integration test for history with game state
  - History across game sessions
  - History isolation between games

### 5. AI Mock Response System (Priority: Medium)

Improve AI mock testing coverage:

- [ ] Expand `tests/ai/mockAIEngine.test.ts`
  - All room generation scenarios
  - Character generation with sentiment
  - Region generation mocking
  - Fallback response testing

- [ ] Create `tests/ai/ai-fallback-chains.test.ts`
  - Primary AI failure → mock fallback
  - Mock failure → static fallback
  - Response quality degradation

### 6. Event Trigger System (Priority: Medium)

Complete event trigger testing:

- [ ] Expand `tests/services/eventTriggerService.test.ts`
  - All trigger types
  - Trigger conditions
  - Action execution
  - Trigger persistence

- [ ] Create `tests/integration/event-triggers.test.ts`
  - Combat triggers
  - Item pickup triggers
  - Room entry triggers
  - Character death triggers

### 7. Validation System (Priority: Low)

Enhance validation testing:

- [ ] Expand `tests/services/actionValidator.test.ts`
  - All action types
  - Complex validation chains
  - Permission systems
  - Context-aware validation

## Performance Testing

### 8. Add Performance Benchmarks (Priority: Medium)

Create performance test suite:

- [ ] Create `tests/performance/benchmarks.test.ts`
  - Room generation < 500ms
  - Database queries < 50ms
  - Command processing < 100ms
  - AI generation < 2000ms (with fallback)

- [ ] Create `tests/performance/load.test.ts`
  - 1000 rooms per game
  - 50 concurrent generations
  - Memory usage tracking
  - Database size limits

## Test Infrastructure Improvements

### 9. Test Execution Optimization (Priority: Low)

- [ ] Add proper test timeouts to prevent hanging
  ```typescript
  jest.setTimeout(10000); // 10 second default
  ```

- [ ] Implement test categorization for parallel execution
  - Independent test suites run in parallel
  - Database tests remain serial

- [ ] Add test performance monitoring
  - Track slow tests
  - Generate performance reports

### 10. Test Documentation (Priority: Low)

- [ ] Add README.md to each test category explaining:
  - What the category tests
  - How to run specific tests
  - Common patterns used
  - Known issues

- [ ] Create test writing guide
  - Naming conventions
  - Mock strategies
  - Database isolation patterns
  - Assertion best practices

## Acceptance Criteria

### Phase 1: Fix Failures (Week 1)
- [ ] All 26 failing tests pass
- [ ] No test timeouts
- [ ] All import paths correct
- [ ] Success rate > 99%

### Phase 2: Critical Coverage (Week 2)
- [ ] Phase 9 region queue fully tested
- [ ] Race condition tests comprehensive
- [ ] Background generation stable
- [ ] Command history tested

### Phase 3: Complete Coverage (Week 3-4)
- [ ] All identified gaps filled
- [ ] Performance benchmarks in place
- [ ] Test documentation complete
- [ ] Coverage > 80% for critical services

## Success Metrics

- **Test Success Rate**: > 99.5%
- **Test Coverage**: > 80% for critical paths
- **Test Execution Time**: < 2 minutes for full suite
- **No Flaky Tests**: All tests reliable with `--randomize`

## Technical Debt Addressed

This issue will eliminate technical debt from:
- Incomplete test coverage after Phase 9 changes
- Missing tests for new features
- Outdated test expectations
- Poor test organization (already fixed)
- Lack of performance testing

## Dependencies

- Completion of Phase 9 region system stabilization
- Test infrastructure setup (jest configuration)
- Mock system improvements

## Notes

- Prioritize fixing failures before adding new tests
- Use TDD for new test creation
- Ensure all tests work with `npm test -- --randomize`
- Follow conventions in `tests/CLAUDE.md`
- Update `test_strategy.yml` as coverage improves

## Related Files

- `test_strategy.yml` - Test strategy document
- `test-organization-report.md` - Reorganization details
- `test-results-summary.md` - Current test state
- `tests/README.md` - Test suite documentation
- `tests/CLAUDE.md` - Testing guidelines