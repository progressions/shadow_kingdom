# Shadow Kingdom Test Suite

## Organization Structure

The test suite is organized into logical categories based on the `test_strategy.yml` specification:

### Directory Structure

```
tests/
├── README.md                    # This file
├── CLAUDE.md                    # Test guidelines and conventions
├── setup.ts                     # Global test setup
│
├── services/                    # Service layer tests
│   ├── *.test.ts               # Service-specific tests
│   └── *.prisma.test.ts        # Prisma service variant tests
│
├── commands/                    # Game command tests
│   ├── attack*.test.ts         # Combat commands
│   ├── give*.test.ts           # Item transfer commands
│   └── talk*.test.ts           # Dialogue commands
│
├── integration/                 # Integration tests
│   ├── *-integration.test.ts   # Cross-service integration
│   └── sentiment-system.test.ts # System-wide features
│
├── e2e/                        # End-to-end journey tests
│   ├── command-interface.test.ts
│   └── region-planner-service.test.ts
│
├── nlp/                        # Natural Language Processing tests
│   ├── nlp.test.ts             # Core NLP engine
│   ├── context-resolver*.test.ts
│   └── enhanced-nlp*.test.ts
│
├── items/                      # Item and equipment tests
│   ├── item-generation*.test.ts
│   ├── armor-calculation.test.ts
│   └── starter-*.test.ts
│
├── characters/                 # Character system tests
│   ├── character-generation*.test.ts
│   ├── hostile-character-blocking.test.ts
│   └── fallback-character-generation.test.ts
│
├── generation/                 # World generation tests
│   ├── automaticRoomGeneration.test.ts
│   ├── connectionBasedGeneration.test.ts
│   └── duplicateRoomRaceCondition.test.ts
│
├── utils/                      # Utility function tests
│   ├── articleParser.test.ts
│   ├── combat.test.ts
│   └── directionSorter.test.ts
│
├── adapters/                   # Adapter tests
│   └── *.test.ts
│
├── ai/                         # AI integration tests
│   └── room-generation-sentiment.test.ts
│
├── display/                    # Display component tests
│   └── sentiment-indicators.test.ts
│
├── migration/                  # Database migration tests
│   └── remove-is-hostile.test.ts
│
├── prisma/                     # Prisma-specific tests
│   ├── integration.test.ts
│   ├── performance.test.ts
│   └── setup.ts
│
└── *.test.ts                   # Core/foundational tests
    ├── database.test.ts
    ├── gameController.*.test.ts
    ├── gameManagement.test.ts
    ├── gamePersistence.test.ts
    ├── index.test.ts
    ├── mockAI.test.ts
    ├── multiGameIsolation.test.ts
    └── simple.test.ts
```

## Test Categories

### Service Tests (`tests/services/`)
Tests for individual service classes. These test business logic in isolation.
- Coverage target: 75-85% depending on criticality
- Naming: `[ServiceName].test.ts`

### Command Tests (`tests/commands/`)
Tests for game commands (attack, give, talk, etc.) including sentiment effects.
- Focus on user interactions and command processing
- Test both success and failure cases

### Integration Tests (`tests/integration/`)
Tests that verify multiple services working together.
- Database transactions
- Cross-service workflows
- System-wide features

### E2E Tests (`tests/e2e/`)
End-to-end journey tests simulating complete user workflows.
- New player experience
- Combat encounters
- Region exploration

### NLP Tests (`tests/nlp/`)
Natural language processing and command parsing tests.
- Command interpretation
- Context resolution
- AI fallback handling

### Specialized Categories
- **Items**: Item generation, equipment, armor calculations
- **Characters**: Character generation, AI behaviors, sentiment
- **Generation**: World generation, room creation, connections
- **Utils**: Utility functions, helpers, formatters

## Running Tests

```bash
# Run all tests
npm test

# Run with randomization (recommended)
npm test -- --randomize

# Run specific category
npm test -- tests/services
npm test -- tests/commands
npm test -- tests/integration

# Run specific file
npm test -- tests/services/characterService.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Test Conventions

### File Naming
- Test files: `*.test.ts`
- Match source file names where applicable
- Use descriptive names for integration tests

### Describe Blocks
```typescript
describe('ServiceName', () => {
  describe('Method or Feature', () => {
    test('should [action] [expected result]', () => {
      // test implementation
    });
  });
});
```

### Test Isolation
- Each test uses in-memory SQLite (`:memory:`)
- Tests run serially (`maxWorkers: 1`)
- No shared state between tests
- Clean setup/teardown in beforeEach/afterEach

### Best Practices
1. **Never assume database order** - Use specific queries
2. **Use unique identifiers** - Add timestamps to test data
3. **Test with randomization** - Ensure order independence
4. **Mock external services** - Especially AI/Grok client
5. **Ensure clean exit** - No hanging handles or timeouts

## Coverage Requirements

Based on `test_strategy.yml`:
- Global target: 75%
- Critical services: 85%
- Game mechanics: 80%
- AI integration: 60% (due to mocking)
- UI components: 50% (TUI limitations)
- Utilities: 70%

## Recent Reorganization (2025-08-24)

Reorganized 51 test files from root directory into categorical subdirectories:
- Improved discoverability and maintenance
- Better coverage analysis by category
- Aligned with test_strategy.yml specifications
- All import paths updated to reflect new structure

Total test files: 115 across 14 categories