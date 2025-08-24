# Test Coverage Expansion - Phase 2 & 3 Implementation Specification

**Version**: 1.0  
**Date**: 2025-08-24  
**Status**: Draft  
**Related Issue**: 2025-08-24-test-coverage-expansion.md

## Overview

This specification defines the implementation of comprehensive test coverage expansion for Shadow Kingdom, focusing on Phase 9 features, concurrent operations, and critical system gaps identified in the test audit.

## Architecture Overview

### Current Test Infrastructure
- **Framework**: Jest with ts-jest
- **Database**: SQLite `:memory:` for isolation
- **Execution**: Serial (`maxWorkers: 1`)
- **Current Coverage**: ~70% estimated
- **Target Coverage**: >80% for critical paths

### Test Categories
```
tests/
├── services/          # Service layer tests
├── integration/       # Cross-service integration  
├── e2e/              # End-to-end workflows
├── generation/       # Room/content generation
├── commands/         # Command handling
├── performance/      # Performance benchmarks
└── ai/               # AI system testing
```

## Phase 2: Critical Coverage Implementation

### Priority 1: Region Queue System Testing

**Background**: Phase 9 introduced a simplified region queue system that needs comprehensive testing.

#### Service Test: `tests/services/regionQueueService.test.ts`

```typescript
// Test Structure Template
describe('RegionQueueService', () => {
  describe('Queue Initialization', () => {
    // Test queue setup with multiple regions
    // Test default queue population
    // Test empty queue handling
  })
  
  describe('Region Sequence Management', () => {
    // Test FIFO ordering
    // Test region transitions
    // Test queue exhaustion
  })
  
  describe('State Persistence', () => {
    // Test queue state saving/loading
    // Test recovery after errors
    // Test concurrent access
  })
})
```

**Key Test Scenarios**:
1. **Queue Initialization**
   - Empty game → populate with default regions
   - Existing game → load saved queue state
   - Invalid queue state → fallback to defaults

2. **Region Management**
   - FIFO region selection
   - Transition triggers and conditions
   - Queue wraparound behavior

3. **Error Recovery**
   - Corrupted queue state recovery
   - Missing region data handling
   - Concurrent modification conflicts

#### Integration Test: `tests/integration/region-queue-integration.test.ts`

**Test Flow**:
```
Game Start → Region 1 → Generate Rooms → Transition Trigger
→ Region 2 → Generate Rooms → Continue...
```

**Scenarios**:
1. Full 5-region progression cycle
2. Player movement triggering transitions  
3. Background generation with queue updates
4. Error recovery during transitions

### Priority 2: Concurrent Generation Testing

**Background**: Race conditions in room generation can create duplicate rooms or inconsistent state.

#### Unit Test: `tests/generation/concurrent-generation.test.ts`

**Key Test Areas**:
1. **Connection Claiming**
   - Multiple processes claiming same unfilled connection
   - Atomic update verification (SQL `WHERE to_room_id IS NULL`)
   - Proper rollback on claim failure

2. **Room Creation Deduplication**
   - Duplicate room detection and cleanup
   - Orphaned room removal
   - Database consistency verification

3. **Processing Flag Management**
   - Atomic flag setting/clearing
   - Flag timeout handling
   - Concurrent flag access

**Test Implementation Pattern**:
```typescript
test('should handle race condition on connection claiming', async () => {
  // Setup: Create unfilled connection
  const connection = await createUnfilledConnection(gameId, roomId, 'north')
  
  // Execute: Simultaneous generation attempts
  const [result1, result2] = await Promise.all([
    roomGenService.generateRoomForConnection(connection),
    roomGenService.generateRoomForConnection(connection)
  ])
  
  // Verify: Both succeed, same room ID returned
  expect(result1.success).toBe(true)
  expect(result2.success).toBe(true)
  expect(result1.roomId).toBe(result2.roomId)
  
  // Verify: Only one room created, orphan cleaned up
  const roomCount = await countRooms(gameId)
  expect(roomCount).toBe(initialCount + 1) // Not +2
})
```

#### Stress Test: `tests/performance/stress-generation.test.ts`

**Scenarios**:
1. **Multiple Players Simulation**
   - 5 players moving simultaneously in same area
   - Generation queue overflow handling
   - Memory usage monitoring

2. **Rapid Movement Stress**
   - Player movement every 100ms
   - Overlapping generation requests
   - System stability verification

### Priority 3: Command History Testing

**Background**: Arrow key navigation for command history needs comprehensive testing.

#### Unit Test: `tests/commands/command-history.test.ts`

**Test Areas**:
1. **History Navigation**
   ```typescript
   test('should navigate history with arrow keys', async () => {
     const history = new CommandHistory()
     
     // Add commands to history
     history.addCommand('go north')
     history.addCommand('look around')
     history.addCommand('take sword')
     
     // Navigate up (previous commands)
     expect(history.navigateUp()).toBe('take sword')
     expect(history.navigateUp()).toBe('look around') 
     expect(history.navigateUp()).toBe('go north')
     
     // Navigate down (forward in history)
     expect(history.navigateDown()).toBe('look around')
     expect(history.navigateDown()).toBe('take sword')
     expect(history.navigateDown()).toBe('') // Current command
   })
   ```

2. **History Persistence**
   - Commands saved between sessions
   - History limit enforcement (100 commands)
   - Memory cleanup for old commands

3. **Edge Cases**
   - Empty history navigation
   - Special characters in commands
   - Very long command handling

#### Integration Test: `tests/integration/history-persistence.test.ts`

**Scenarios**:
1. History across game sessions
2. History isolation between games
3. Menu vs game command separation

## Phase 3: Complete Coverage Implementation

### AI Mock System Enhancement

#### Expand: `tests/ai/mockAIEngine.test.ts`

**Current Coverage Gaps**:
- Region generation scenarios
- Character generation with sentiment
- Response variation testing
- Context sensitivity verification

**Implementation Plan**:
```typescript
describe('MockAI Response Quality', () => {
  test('should generate varied room descriptions', async () => {
    const responses = []
    for (let i = 0; i < 10; i++) {
      const response = await mockAI.generateRoom(standardContext)
      responses.push(response.description)
    }
    
    // Verify variation in responses
    const uniqueResponses = new Set(responses)
    expect(uniqueResponses.size).toBeGreaterThan(7) // 70% variation
  })
  
  test('should respect theme context', async () => {
    const crystalTheme = { theme: 'crystal caverns' }
    const response = await mockAI.generateRoom(crystalTheme)
    
    // Verify thematic consistency
    const description = response.description.toLowerCase()
    const hasThematicWords = ['crystal', 'cavern', 'gleam', 'sparkle']
      .some(word => description.includes(word))
    expect(hasThematicWords).toBe(true)
  })
})
```

#### New: `tests/ai/ai-fallback-chains.test.ts`

**Fallback Chain Testing**:
1. Primary AI → Mock AI → Static Fallback
2. Response quality degradation tracking
3. Recovery from fallback mode

### Event Trigger System Testing

#### Expand: `tests/services/eventTriggerService.test.ts`

**Coverage Areas**:
- All trigger types (combat, item, room, character)
- Complex trigger conditions
- Action execution verification
- Trigger priority and ordering

### Performance Benchmarks

#### New: `tests/performance/benchmarks.test.ts`

**Performance Targets**:
- Room generation: < 500ms
- Database queries: < 50ms  
- Command processing: < 100ms
- AI generation: < 2000ms

**Implementation Pattern**:
```typescript
test('room generation performance', async () => {
  const startTime = Date.now()
  
  await roomGenService.generateSingleRoom({
    gameId,
    fromRoomId: 1, 
    direction: 'north',
    theme: 'standard'
  })
  
  const duration = Date.now() - startTime
  expect(duration).toBeLessThan(500) // 500ms target
})
```

## Implementation Strategy

### TDD Workflow
1. **Red**: Write failing test for specific behavior
2. **Green**: Implement minimal code to make test pass
3. **Refactor**: Improve code quality and performance
4. **Integration**: Ensure all related tests still pass
5. **Documentation**: Document complex scenarios

### Test Organization Principles

#### File Naming Convention
```
[feature]-[aspect].test.ts
region-queue-service.test.ts       # Service unit tests
region-queue-integration.test.ts   # Cross-service integration
concurrent-generation.test.ts      # Specific functionality
stress-generation.test.ts          # Performance/load testing
```

#### Test Structure Template
```typescript
describe('ServiceName', () => {
  let db: Database
  let service: ServiceType
  
  beforeEach(async () => {
    // Isolated setup for each test
    db = new Database(':memory:')
    await db.connect()
    await initializeDatabase(db)
    service = new ServiceType(db, options)
  })
  
  afterEach(async () => {
    // Clean shutdown
    if (db) await db.close()
  })
  
  describe('Core Functionality', () => {
    test('should perform expected behavior', async () => {
      // Arrange: Set up test data
      // Act: Execute the behavior
      // Assert: Verify expectations
    })
  })
})
```

### Mock Strategy Guidelines

#### When to Mock
- External services (AI, file system)
- Time-dependent operations
- Complex setup requirements

#### When NOT to Mock  
- Database operations (use in-memory DB)
- Service interactions within the app
- Simple data transformations

#### Mock Quality Standards
```typescript
// Good: Realistic mock responses
const mockAI = {
  generateRoom: jest.fn().mockResolvedValue({
    name: 'Ancient Library',
    description: 'Towering bookshelves filled with dusty tomes.',
    connections: [
      { direction: 'north', name: 'toward the reading alcove' }
    ]
  })
}

// Bad: Minimal mock responses
const mockAI = {
  generateRoom: jest.fn().mockResolvedValue({ name: 'Room' })
}
```

## Testing Patterns and Best Practices

### Database Isolation Pattern
```typescript
// Pattern: Each test gets fresh database
beforeEach(async () => {
  db = new Database(':memory:')
  await db.connect() 
  await initializeDatabase(db)
  
  // Create test-specific data
  const gameId = await createGameWithRooms(db, `Test ${Date.now()}`)
})
```

### Deterministic Testing Pattern
```typescript
// Good: Specific entity identification
test('should find correct character', async () => {
  const uniqueName = `Test Character ${Date.now()}`
  const characterId = await createCharacter(gameId, uniqueName)
  
  const result = await service.findCharacter(uniqueName)
  expect(result.id).toBe(characterId)
})

// Bad: Relying on database order
test('should find first character', async () => {
  const characters = await db.all('SELECT * FROM characters')
  const result = await service.findCharacter(characters[0].name)
  // Fragile - depends on database ordering
})
```

### Async Testing Pattern
```typescript
// Pattern: Proper async handling
test('should handle concurrent operations', async () => {
  const promises = [
    service.operation1(),
    service.operation2(), 
    service.operation3()
  ]
  
  const results = await Promise.all(promises)
  
  // Verify all operations succeeded
  results.forEach(result => {
    expect(result.success).toBe(true)
  })
})
```

## Quality Assurance

### Test Reliability
- All tests must pass with `npm test -- --randomize`
- No dependencies on test execution order
- No shared state between test files
- Proper cleanup in afterEach hooks

### Performance Standards
- Individual tests: < 100ms (except stress tests)
- Full test suite: < 3 minutes
- Memory usage: No significant leaks
- Database: Proper connection cleanup

### Coverage Targets
- **Critical Services**: >85% coverage
- **Generation System**: >80% coverage  
- **Command Processing**: >75% coverage
- **Overall Project**: >70% coverage

## Implementation Phases

### Phase 2A: Region Queue (Week 1)
- [ ] Create `regionQueueService.test.ts`
- [ ] Create `region-queue-integration.test.ts`
- [ ] Verify all queue scenarios work
- [ ] Document queue testing patterns

### Phase 2B: Concurrent Generation (Week 2)
- [ ] Create `concurrent-generation.test.ts`
- [ ] Create `stress-generation.test.ts`  
- [ ] Verify race condition handling
- [ ] Performance benchmark establishment

### Phase 2C: Command History (Week 2-3)
- [ ] Create `command-history.test.ts`
- [ ] Create `history-persistence.test.ts`
- [ ] Integration with game controller
- [ ] Edge case validation

### Phase 3A: AI Enhancement (Week 3)
- [ ] Expand `mockAIEngine.test.ts`
- [ ] Create `ai-fallback-chains.test.ts`
- [ ] Response quality verification
- [ ] Context sensitivity testing

### Phase 3B: Complete Coverage (Week 4)
- [ ] Event trigger system tests
- [ ] Performance benchmarks
- [ ] Validation system expansion
- [ ] Documentation completion

## Success Criteria

### Technical Metrics
- [ ] All tests pass consistently (100% reliability)
- [ ] No test timeouts or hanging processes
- [ ] Coverage targets met for all categories
- [ ] Performance benchmarks established

### Quality Metrics
- [ ] Tests are self-documenting and clear
- [ ] Mock implementations are realistic
- [ ] Error scenarios are properly tested
- [ ] Edge cases are covered

### Maintenance Metrics
- [ ] Tests run in under 3 minutes
- [ ] New developers can understand test structure
- [ ] Test failures provide clear diagnosis
- [ ] Continuous integration ready

## Documentation Requirements

### Test Documentation
Each new test file must include:
- Purpose and scope description
- Key scenarios covered
- Mock strategy explanation
- Performance considerations

### README Updates
- Update `tests/README.md` with new categories
- Document new testing patterns
- Explain performance test usage
- Provide troubleshooting guides

## Risk Mitigation

### Potential Issues
- **Test Suite Duration**: Monitor and optimize slow tests
- **Database Conflicts**: Ensure proper isolation
- **Mock Complexity**: Keep mocks simple and maintainable
- **Coverage Accuracy**: Use multiple coverage tools for validation

### Contingency Plans
- **Time Constraints**: Prioritize critical path coverage
- **Technical Blockers**: Document workarounds and alternatives
- **Resource Limits**: Focus on highest-value test scenarios
- **Integration Issues**: Fallback to unit testing where needed

## Conclusion

This specification provides a comprehensive roadmap for expanding Shadow Kingdom's test coverage to production-ready standards. The phased approach ensures critical areas are covered first while building toward complete system coverage.

The emphasis on TDD, proper test isolation, and realistic scenarios will result in a robust test suite that supports confident development and maintenance of the Shadow Kingdom codebase.