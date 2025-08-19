# Issue: Migrate Database Layer to Prisma ORM

**Created:** 2025-08-19  
**Priority:** Medium  
**Status:** Open  
**Category:** Technical Debt / Database Architecture

## Problem Statement

The current database implementation uses a custom SQLite wrapper with manual migration logic that is complex and error-prone:

- **Custom Database Wrapper**: Manual async/await wrapper around sqlite3
- **Complex Migration Logic**: Hand-written column checks and table recreation
- **No Type Safety**: Raw SQL queries with potential runtime errors
- **Manual Schema Management**: Schema defined inline in TypeScript code
- **Migration Fragility**: Complex logic for handling different database states

**Current Issues:**
- Database locking conflicts during tests (recently fixed with workarounds)
- Complex migration functions that need to check column existence
- No compile-time query validation
- Manual type casting for database results
- Difficulty maintaining schema consistency

## Proposed Solution

Migrate to **Prisma ORM** for modern, type-safe database management:

### Why Prisma?

1. **Type Safety**: Full TypeScript integration with generated types
2. **Schema-First**: Declarative schema definition in `schema.prisma`
3. **Automatic Migrations**: Generate and run migrations automatically
4. **Query Builder**: Type-safe query API that prevents SQL injection
5. **Excellent DX**: Great tooling, debugging, and development experience
6. **SQLite Support**: Full support for our current SQLite setup

### Implementation Plan

#### Phase 1: Setup and Schema Definition
- [ ] Install Prisma CLI and client: `npm install prisma @prisma/client`
- [ ] Initialize Prisma: `npx prisma init --datasource-provider sqlite`
- [ ] Define schema in `prisma/schema.prisma` based on current tables:
  ```prisma
  model Game {
    id            Int      @id @default(autoincrement())
    name          String   @unique
    createdAt     DateTime @default(now()) @map("created_at")
    lastPlayedAt  DateTime @default(now()) @map("last_played_at")
    
    rooms         Room[]
    connections   Connection[]
    gameState     GameState?
    regions       Region[]
    
    @@map("games")
  }
  
  model Room {
    id             Int     @id @default(autoincrement())
    gameId         Int     @map("game_id")
    name           String
    description    String
    regionId       Int?    @map("region_id")
    regionDistance Int?    @map("region_distance")
    
    game           Game    @relation(fields: [gameId], references: [id], onDelete: Cascade)
    region         Region? @relation(fields: [regionId], references: [id])
    
    connectionsFrom Connection[] @relation("FromRoom")
    connectionsTo   Connection[] @relation("ToRoom")
    gameStates      GameState[]
    
    @@map("rooms")
  }
  
  model Connection {
    id         Int     @id @default(autoincrement())
    gameId     Int     @map("game_id")
    fromRoomId Int     @map("from_room_id")
    toRoomId   Int?    @map("to_room_id")
    direction  String?
    name       String
    
    game       Game    @relation(fields: [gameId], references: [id], onDelete: Cascade)
    fromRoom   Room    @relation("FromRoom", fields: [fromRoomId], references: [id])
    toRoom     Room?   @relation("ToRoom", fields: [toRoomId], references: [id])
    
    @@map("connections")
  }
  
  model GameState {
    id            Int    @id @default(autoincrement())
    gameId        Int    @unique @map("game_id")
    currentRoomId Int    @map("current_room_id")
    playerName    String?
    
    game          Game   @relation(fields: [gameId], references: [id], onDelete: Cascade)
    currentRoom   Room   @relation(fields: [currentRoomId], references: [id])
    
    @@map("game_state")
  }
  
  model Region {
    id           Int      @id @default(autoincrement())
    gameId       Int      @map("game_id")
    name         String?
    type         String
    description  String
    centerRoomId Int?     @map("center_room_id")
    createdAt    DateTime @default(now()) @map("created_at")
    
    game         Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
    rooms        Room[]
    
    @@map("regions")
  }
  ```

#### Phase 2: Data Migration
- [ ] Create migration from existing database: `npx prisma db pull`
- [ ] Generate initial migration: `npx prisma migrate dev --name init`
- [ ] Test migration with existing data
- [ ] Update database path configuration for different environments

#### Phase 3: Service Layer Migration
- [ ] Replace `Database` class with Prisma Client
- [ ] Update `GameStateManager` to use Prisma queries
- [ ] Migrate `RoomGenerationService` database calls
- [ ] Update `RegionService` with Prisma queries
- [ ] Migrate `BackgroundGenerationService` calls
- [ ] Replace all raw SQL with Prisma queries

#### Phase 4: Test Updates
- [ ] Update test database setup to use Prisma
- [ ] Replace manual database initialization with Prisma migrations
- [ ] Update test data creation to use Prisma client
- [ ] Ensure in-memory database support for tests

#### Phase 5: Cleanup
- [ ] Remove custom `Database` class from `src/utils/database.ts`
- [ ] Delete complex migration logic from `src/utils/initDb.ts`
- [ ] Update type definitions to use Prisma-generated types
- [ ] Remove manual SQL query strings

### Benefits After Migration

1. **Type Safety**: All database operations will be type-checked
2. **Simplified Migrations**: Automatic migration generation and management
3. **Better Developer Experience**: Auto-completion, query validation
4. **Maintainability**: Declarative schema, easier to understand
5. **Performance**: Optimized queries and connection pooling
6. **Testing**: Built-in test database utilities

### Example Code Transformation

**Before (Current):**
```typescript
const room = await this.db.get<Room>(
  'SELECT * FROM rooms WHERE id = ?', 
  [roomId]
);

const connections = await this.db.all<Connection>(
  'SELECT * FROM connections WHERE game_id = ? AND to_room_id IS NULL',
  [gameId]
);
```

**After (Prisma):**
```typescript
const room = await prisma.room.findUnique({
  where: { id: roomId }
});

const connections = await prisma.connection.findMany({
  where: { 
    gameId,
    toRoomId: null 
  }
});
```

### Compatibility Considerations

- **Database File**: Keep using SQLite, just change the access layer
- **Existing Data**: Preserve all current game data during migration
- **API Compatibility**: Maintain existing service interfaces
- **Environment Support**: Ensure development, test, and production environments work

### Risks and Mitigation

**Risks:**
- Breaking changes during migration
- Data loss if migration fails
- Learning curve for team members
- Potential performance changes

**Mitigation:**
- Comprehensive backup before migration
- Incremental migration approach (service by service)
- Extensive testing with existing data
- Rollback plan using git branches

## Success Criteria

- [ ] All existing functionality works with Prisma
- [ ] Database schema is identical to current structure
- [ ] All tests pass without modification to test logic
- [ ] Performance is equal or better than current implementation
- [ ] Code is more maintainable and type-safe
- [ ] Migration can be easily reversed if needed

## Implementation Notes

- Start with a separate branch: `feature/prisma-migration`
- Migrate one service at a time to minimize risk
- Keep the existing database wrapper initially for gradual migration
- Use Prisma's introspection to ensure schema accuracy
- Test thoroughly with the existing game data

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma SQLite Guide](https://www.prisma.io/docs/concepts/database-connectors/sqlite)
- [Migration from Raw SQL](https://www.prisma.io/docs/guides/migrate-from-sql)