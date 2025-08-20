# Test Guidelines for Shadow Kingdom

This file provides guidance for writing and maintaining tests in the Shadow Kingdom project.

## Running Tests

```bash
# Run all tests
npm test

# Run all tests with randomized order (RECOMMENDED for robustness testing)
npm test -- --randomize

# Run specific test file
npm test -- tests/gameController.test.ts

# Run specific test file with randomized order
npm test -- tests/gameController.test.ts --randomize

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific AI-related test scripts
npm run test:grok          # Test Grok AI integration
npm run test:bg            # Test background room generation
npm run test:limits        # Test generation limits
npm run test:errors        # Test error handling
npm run test:tracking      # Test generation tracking
```

## Jest Exit Requirements

**CRITICAL**: Tests MUST always exit cleanly without timeouts or warnings.

### ✅ Expected Behavior (Tests are healthy):
```bash
$ npm test
# Tests run and complete...
Test Suites: 4 skipped, 25 passed, 25 of 29 total
Tests:       62 skipped, 282 passed, 344 total
Snapshots:   0 total
Time:        21.797 s, estimated 24 s
Ran all test suites.
$ # <-- Command prompt returns immediately
```

### ❌ Warning Signs (Jest has open handles):
```bash
$ npm test
# Tests run and complete...
Test Suites: 4 skipped, 25 passed, 25 of 29 total
Tests:       62 skipped, 282 passed, 344 total
Snapshots:   0 total
Time:        21.797 s, estimated 24 s
Ran all test suites.
Jest did not exit one second after the test run has completed.

This usually means that there are asynchronous operations that weren't stopped in your tests. Consider running Jest with `--detectOpenHandles` to troubleshoot this issue.
# <-- Process hangs here, no command prompt
```

### Debugging Open Handles:
```bash
# Identify what's keeping Jest alive
npm test -- --detectOpenHandles

# Force exit (masks the problem - don't use for development)
npm test -- --forceExit
```

### What Causes Open Handles:
- **Database connections** not properly closed
- **HTTP connections** (axios, node-fetch) keeping connection pools alive  
- **Timers/intervals** not cleared (setTimeout, setInterval)
- **Event listeners** not removed from process/streams
- **File handles** not closed
- **Singleton services** maintaining persistent resources

### Our Solution:
The project has comprehensive cleanup in `tests/setup.ts` that handles:
- PrismaService singleton destruction
- HTTP/HTTPS global agent cleanup
- Timer/interval cleanup  
- Process handle cleanup

**Remember**: If you see the "Jest did not exit" warning, there's a resource leak that MUST be fixed. Never ignore this warning or mask it with timeouts.

## Test Database Isolation

Each test uses an in-memory SQLite database (`:memory:`) to ensure complete isolation between tests. This means:

- Tests run serially (`maxWorkers: 1`) to avoid database conflicts
- Each test gets a fresh, empty database
- No cleanup of persistent data is needed
- Tests are fast and reliable

## Test Execution Order

**IMPORTANT**: Test execution order should never affect test outcomes!

- **Test files** run in roughly alphabetical order by default
- **Individual tests** within a file run in the order they're written  
- Jest can randomize test order with `--randomize` flag (RECOMMENDED!)
- Different environments may have slightly different execution orders

**This is why you must never rely on database state from previous tests or assume which entities exist!**

### Randomized Testing

**ALWAYS test your changes with randomized order:**
```bash
npm test -- --randomize
```

Randomized tests help catch:
- Order-dependent test failures
- Shared state between tests  
- Assumptions about database content
- Race conditions in async operations

**All tests in this project pass with `--randomize` - yours should too!**

## Critical Testing Guidelines

### ⚠️ NEVER Assume Database Order

**CRITICAL**: Never test by checking "the first item" in the database without specifying exactly which entity you want.

#### ❌ WRONG - Indeterminate Tests:
```typescript
// DON'T DO THIS - will randomly fail
const games = await db.all('SELECT * FROM games');
const firstGame = games[0]; // Which game is this?
expect(controller.currentGameId).toBe(firstGame.id);

// DON'T DO THIS - assumes first choice is our game
const mockQuestion = jest.fn().mockImplementation((question, callback) => {
  callback('1'); // Could be any game!
});
```

#### ✅ CORRECT - Deterministic Tests:
```typescript
// DO THIS - find specific entity by identifier
const games = await db.all('SELECT * FROM games ORDER BY last_played_at DESC');
const targetGame = games.find(game => game.name === uniqueGameName);
expect(controller.currentGameId).toBe(targetGame.id);

// DO THIS - find correct choice number for specific game
const games = await db.all('SELECT * FROM games ORDER BY last_played_at DESC');
const gameIndex = games.findIndex(game => game.id === gameId);
const choiceNumber = (gameIndex + 1).toString();
const mockQuestion = jest.fn().mockImplementation((question, callback) => {
  callback(choiceNumber); // Select our specific game
});
```

### Entity Identification Strategies

1. **Use Unique Names**: Create entities with unique, identifiable names
   ```typescript
   const uniqueName = `Test Game ${Date.now()}-${Math.random()}`;
   ```

2. **Search by Known Properties**: Find entities by properties you control
   ```typescript
   const room = rooms.find(r => r.name === 'Starting Room' && r.game_id === gameId);
   ```

3. **Store IDs from Creation**: Keep references to IDs when you create entities
   ```typescript
   const gameId = await createGameWithRooms(db, uniqueName);
   // Later: find by this specific ID
   ```

4. **Use Specific Filters**: Filter by known characteristics
   ```typescript
   const connections = await db.all('SELECT * FROM connections WHERE from_room_id = ? AND direction = ?', [roomId, 'north']);
   ```

## Test Structure Best Practices

### Database Setup Pattern
```typescript
beforeEach(async () => {
  // Always use in-memory database for isolation
  db = new Database(':memory:');
  await db.connect();
  await initializeDatabase(db);
  
  // Create entities with unique identifiers
  const uniqueName = `Test ${testType} ${Date.now()}-${Math.random()}`;
  testEntityId = await createTestEntity(db, uniqueName);
});
```

### Assertion Patterns
```typescript
// Test specific entities, not arbitrary database order
test('should load the correct game', async () => {
  const uniqueGameName = `Load Test ${Date.now()}`;
  const gameId = await createGameWithRooms(db, uniqueGameName);
  
  // Test the specific game we created
  await controller.loadSpecificGame(gameId);
  
  const session = controller.getCurrentSession();
  expect(session.gameId).toBe(gameId); // Test exact match
  expect(session.mode).toBe('game');
});
```

## Common Test Patterns

### Testing Game State Changes
```typescript
test('should update room correctly', async () => {
  // Setup with known entities
  await gameStateManager.startGameSession(knownGameId);
  const targetRoomId = rooms.find(r => r.name === 'Target Room').id;
  
  // Perform action
  await gameStateManager.moveToRoom(targetRoomId);
  
  // Assert specific expected state
  const session = gameStateManager.getCurrentSession();
  expect(session.roomId).toBe(targetRoomId);
});
```

### Testing List Operations
```typescript
test('should find correct connection', async () => {
  // Create connection with known properties
  const connectionName = 'Crystal Archway';
  await createConnection(gameId, fromRoomId, toRoomId, 'north', connectionName);
  
  // Test finding by specific property
  const connection = await gameStateManager.findConnection(connectionName);
  
  expect(connection).not.toBeNull();
  expect(connection.name).toBe(connectionName);
  expect(connection.direction).toBe('north');
});
```

## Debugging Failed Tests

1. **Check for Race Conditions**: Multiple tests creating similar entities
2. **Verify Unique Identifiers**: Ensure test entities have unique names
3. **Examine Database State**: Log database contents when tests fail
4. **Test in Isolation**: Run single test file to eliminate interference

## Test Performance

- In-memory databases are fast - use them liberally
- Each test should be completely independent
- Avoid shared state between tests
- Use descriptive test names that explain the expected behavior

Remember: Tests should be **deterministic**, **isolated**, and **specific**. Never rely on database ordering or assume which entity will be "first".