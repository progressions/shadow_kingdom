# The Development Journey of Shadow Kingdom
## From Simple CLI to Multi-Game Adventure System

### Introduction

Shadow Kingdom represents the evolution of a TypeScript CLI application from a basic command-line interface to a sophisticated multi-game text adventure system with persistent save functionality. This article chronicles the key development phases, technical challenges, and architectural decisions that shaped the project.

### Phase 1: Foundation - Basic CLI Framework

The project began as a simple TypeScript CLI with a basic command system. The initial architecture focused on creating a flexible command registration system:

```typescript
interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => void | Promise<void>;
}

export class CLI {
  private commands: Map<string, Command> = new Map();
  
  addCommand(command: Command): void {
    this.commands.set(command.name, command);
  }
  
  private async handleInput(input: string): Promise<void> {
    const [commandName, ...args] = input.trim().split(' ');
    const command = this.commands.get(commandName);
    
    if (command) {
      await command.handler(args);
    } else {
      console.log(`Unknown command: ${commandName}`);
    }
  }
}
```

This foundation provided essential features:
- Command registration system
- Interactive readline interface
- Basic help system
- Error handling for unknown commands

### Phase 2: Game World Creation

The next evolution introduced a basic room navigation system with SQLite persistence:

#### Database Schema Design

The initial schema was simple but functional:

```sql
CREATE TABLE rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_room_id INTEGER NOT NULL,
  to_room_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (from_room_id) REFERENCES rooms(id),
  FOREIGN KEY (to_room_id) REFERENCES rooms(id)
);
```

#### Room Navigation Logic

```typescript
async move(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.log('Move where? Try: go north, go south, etc.');
    return;
  }

  const direction = args[0].toLowerCase();
  
  const connection = await this.db.get(
    'SELECT * FROM connections WHERE from_room_id = ? AND LOWER(name) = LOWER(?)',
    [this.currentRoomId, direction]
  );

  if (connection) {
    this.currentRoomId = connection.to_room_id;
    await this.lookAround();
  } else {
    console.log(`You can't go ${direction} from here.`);
  }
}
```

### Phase 3: The Main Menu Challenge

A critical issue emerged: the application jumped directly into the game world, making it impossible to implement multiple games or save systems. The solution required a fundamental architectural shift.

#### The Problem: Readline Interface Conflicts

The initial attempt to add a main menu revealed a Node.js limitation:

```typescript
// This approach failed - multiple readline interfaces conflict
class MainMenu {
  private rl: readline.Interface;
  
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
}

class GameCLI {
  private rl: readline.Interface; // CONFLICT!
  
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
}
```

#### The Solution: Unified Controller Architecture

The breakthrough came with creating a single controller managing multiple modes:

```typescript
type Mode = 'menu' | 'game';

export class GameController {
  private rl: readline.Interface;
  private mode: Mode = 'menu';
  private currentGameId: number | null = null;
  private menuCommands: Map<string, Command> = new Map();
  private gameCommands: Map<string, Command> = new Map();

  private async handleInput(input: string): Promise<void> {
    const [commandName, ...args] = input.trim().split(' ');
    
    if (this.mode === 'menu') {
      await this.handleMenuCommand(commandName, args);
    } else {
      await this.handleGameCommand(commandName, args);
    }
  }
  
  private switchToGame(gameId: number): void {
    this.mode = 'game';
    this.currentGameId = gameId;
    this.rl.setPrompt('game> ');
  }
  
  private switchToMenu(): void {
    this.mode = 'menu';
    this.currentGameId = null;
    this.rl.setPrompt('menu> ');
  }
}
```

### Phase 4: Multi-Game Save System

The most complex phase involved implementing a complete multi-game save system with database schema evolution.

#### Database Schema Evolution

The schema required significant expansion to support multiple games:

```sql
-- New games table for multi-game support
CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Updated rooms table with game isolation
CREATE TABLE rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,  -- NEW: Game isolation
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Updated connections with game awareness
CREATE TABLE connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,  -- NEW: Game isolation
  from_room_id INTEGER NOT NULL,
  to_room_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (from_room_id) REFERENCES rooms(id),
  FOREIGN KEY (to_room_id) REFERENCES rooms(id)
);

-- New game state table for save/resume
CREATE TABLE game_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL UNIQUE,
  current_room_id INTEGER NOT NULL,
  player_name TEXT,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (current_room_id) REFERENCES rooms(id)
);
```

#### Game Creation and Isolation

Each new game gets its own complete world copy:

```typescript
export async function createGameWithRooms(
  db: Database, 
  gameName: string
): Promise<number> {
  try {
    // Create the game record
    const gameResult = await db.run(
      'INSERT INTO games (name) VALUES (?)',
      [gameName]
    );
    const gameId = gameResult.lastID;

    // Create game-specific rooms
    const entranceResult = await db.run(
      'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
      [gameId, 'Entrance Hall', 'A grand entrance hall with high ceilings...']
    );
    
    const libraryResult = await db.run(
      'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
      [gameId, 'Library', 'A cozy library filled with ancient books...']
    );
    
    const gardenResult = await db.run(
      'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
      [gameId, 'Garden', 'A peaceful garden with blooming flowers...']
    );

    // Create game-specific connections (including secret passages)
    await createGameConnections(db, gameId, entranceResult.lastID, 
                               libraryResult.lastID, gardenResult.lastID);
    
    // Set initial game state
    await db.run(
      'INSERT INTO game_state (game_id, current_room_id) VALUES (?, ?)',
      [gameId, entranceResult.lastID]
    );

    return gameId;
  } catch (error) {
    console.error('Error creating game with rooms:', error);
    throw error;
  }
}
```

#### Auto-Save Implementation

Every room movement triggers an automatic save:

```typescript
private async move(args: string[]): Promise<void> {
  if (!this.currentGameId || !this.currentRoomId) return;
  
  const direction = args[0]?.toLowerCase();
  if (!direction) {
    console.log('Move where? Try: go north, go south, etc.');
    return;
  }

  // Find connection within current game
  const connection = await this.db.get(
    `SELECT * FROM connections 
     WHERE game_id = ? AND from_room_id = ? AND LOWER(name) = LOWER(?)`,
    [this.currentGameId, this.currentRoomId, direction]
  );

  if (connection) {
    this.currentRoomId = connection.to_room_id;
    
    // AUTO-SAVE: Update game state
    await this.db.run(
      'UPDATE game_state SET current_room_id = ? WHERE game_id = ?',
      [this.currentRoomId, this.currentGameId]
    );
    
    // Update last played timestamp
    await this.db.run(
      'UPDATE games SET last_played_at = ? WHERE id = ?',
      [new Date().toISOString(), this.currentGameId]
    );
    
    await this.lookAround();
  } else {
    console.log(`You can't go ${direction} from here.`);
  }
}
```

### Phase 5: User Experience Polish

#### Game Loading with Formatted Timestamps

The load game feature includes user-friendly timestamp formatting:

```typescript
private async loadGame(): Promise<void> {
  const games = await this.db.all<Game>(
    'SELECT id, name, created_at, last_played_at FROM games ORDER BY last_played_at DESC'
  );

  if (games.length === 0) {
    console.log('No saved games found. Create a new game first.');
    return;
  }

  console.log('\nSaved Games:');
  games.forEach((game, index) => {
    const timeAgo = this.formatTimeAgo(game.last_played_at);
    console.log(`${index + 1}. ${game.name} (Last played: ${timeAgo})`);
  });
}

private formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const playedAt = new Date(timestamp);
  const diffMs = now.getTime() - playedAt.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}
```

#### Game Deletion with Confirmation

```typescript
private async deleteGame(): Promise<void> {
  // Show games list...
  
  const gameId = parseInt(selection);
  const selectedGame = games[gameId - 1];
  
  // Confirmation prompt
  const confirmed = await this.askQuestion(
    `Are you sure you want to delete "${selectedGame.name}"? This cannot be undone. (yes/no): `
  );
  
  if (confirmed.toLowerCase() === 'yes') {
    await this.db.run('DELETE FROM games WHERE id = ?', [selectedGame.id]);
    console.log(`Game "${selectedGame.name}" deleted successfully.`);
  }
}
```

### Phase 6: Comprehensive Testing

The final phase involved creating a robust test suite to ensure reliability.

#### Test Architecture Challenges

Initial testing faced database isolation issues:

```typescript
// Problem: Shared :memory: databases between tests
describe('Game Tests', () => {
  let db: Database;
  
  beforeEach(async () => {
    db = new Database(':memory:'); // Not truly isolated!
    await db.connect();
    await initializeDatabase(db);
  });
});
```

#### Solution: Unique Names and Isolated Databases

```typescript
// Solution: Unique game names and isolated databases for critical tests
describe('Game Management', () => {
  test('should create demo game when no games exist', async () => {
    // Use truly isolated temporary file database
    const tempDbPath = `temp_seed_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.db`;
    const freshDb = new Database(tempDbPath);
    await freshDb.connect();
    await initializeDatabase(freshDb);
    
    await seedDatabase(freshDb);
    
    const demoGames = await freshDb.all('SELECT * FROM games WHERE name = ?', ['Demo Game']);
    expect(demoGames).toHaveLength(1);
    
    await freshDb.close();
    // Cleanup...
  });
  
  test('should isolate games from each other', async () => {
    const timestamp = Date.now();
    const game1Id = await createGameWithRooms(db, `Game 1 ${timestamp}-${Math.random()}`);
    const game2Id = await createGameWithRooms(db, `Game 2 ${timestamp}-${Math.random()}`);
    
    // Verify complete isolation...
  });
});
```

### Technical Lessons Learned

#### 1. Single Responsibility for I/O Interfaces
Node.js readline interfaces must be managed carefully. Multiple interfaces competing for stdin/stdout cause conflicts.

#### 2. Database Schema Evolution
Planning for multi-tenancy (multiple games) from the start would have saved significant refactoring. Adding `game_id` foreign keys to existing tables required careful data migration.

#### 3. Test Isolation is Critical
Database testing requires true isolation. The `:memory:` approach had unexpected behavior where different Database instances shared state.

#### 4. User Experience First
Features like timestamp formatting ("2 hours ago") and confirmation dialogs significantly improve the user experience despite adding complexity.

### Current Architecture Overview

The final architecture achieves:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GameController │────│   Database       │────│   SQLite DB     │
│   - Menu Mode    │    │   - Typed API    │    │   - Multi-game  │
│   - Game Mode    │    │   - Connection   │    │   - Auto-save   │
│   - Unified I/O  │    │     Management   │    │   - Isolation   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### What's Next

Shadow Kingdom is now ready for the next evolution: AI-powered content generation. The multi-game save system provides the perfect foundation for:

- AI-generated rooms and descriptions
- Dynamic NPCs with persistent conversations
- Procedural storylines that adapt to player choices
- Cross-game content sharing and evolution

The robust architecture and comprehensive test suite ensure that future features can be built with confidence on this solid foundation.

### Key Files and Structure

```
shadow_kingdom/
├── src/
│   ├── gameController.ts     # Main application logic (656 lines)
│   ├── index.ts             # Entry point
│   └── utils/
│       ├── database.ts      # SQLite wrapper with TypeScript
│       └── initDb.ts        # Schema management and game creation
├── tests/                   # Comprehensive test suite (48 tests)
├── docs/
│   └── development-journey.md  # This document
└── issues/                  # Development tracking
```

The journey from simple CLI to sophisticated multi-game system demonstrates how thoughtful architecture, iterative development, and comprehensive testing can transform a basic concept into a robust foundation for future innovation.