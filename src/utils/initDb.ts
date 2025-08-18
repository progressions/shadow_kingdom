import Database from './database';

export async function initializeDatabase(db: Database): Promise<void> {
  try {
    // Create games table
    await db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_played_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create rooms table
    await db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        generation_processed BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      )
    `);

    // Create connections table
    await db.run(`
      CREATE TABLE IF NOT EXISTS connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        from_room_id INTEGER NOT NULL,
        to_room_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (from_room_id) REFERENCES rooms(id),
        FOREIGN KEY (to_room_id) REFERENCES rooms(id)
      )
    `);

    // Create game_state table
    await db.run(`
      CREATE TABLE IF NOT EXISTS game_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL UNIQUE,
        current_room_id INTEGER NOT NULL,
        player_name TEXT,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (current_room_id) REFERENCES rooms(id)
      )
    `);

    // Create indexes for faster lookups
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_connections_from_room 
      ON connections(from_room_id, name)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_rooms_game_id 
      ON rooms(game_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_connections_game_id 
      ON connections(game_id)
    `);

    // Check if generation_processed column exists, add it if not
    await ensureGenerationProcessedColumn(db);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export async function migrateExistingData(db: Database): Promise<void> {
  try {
    // Check if the old schema exists (rooms table without game_id column)
    const hasOldSchema = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('rooms') 
       WHERE name = 'game_id'`
    );

    // If game_id column doesn't exist, we need to migrate
    if (!hasOldSchema || hasOldSchema.count === 0) {
      console.log('Migrating database from old schema...');
      
      // Check if there are existing rooms to migrate
      const existingRooms = await db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM rooms'
      );

      if (!existingRooms || existingRooms.count === 0) {
        console.log('No existing data to migrate');
        return;
      }

      // Create a default game for existing data
      const result = await db.run(
        'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
        ['Default Game', new Date().toISOString(), new Date().toISOString()]
      );

      const defaultGameId = result.lastID;

      // Add game_id column to rooms table
      await db.run('ALTER TABLE rooms ADD COLUMN game_id INTEGER');
      
      // Add game_id column to connections table
      await db.run('ALTER TABLE connections ADD COLUMN game_id INTEGER');

      // Update existing rooms to use the default game
      await db.run('UPDATE rooms SET game_id = ?', [defaultGameId]);

      // Update existing connections to use the default game
      await db.run('UPDATE connections SET game_id = ?', [defaultGameId]);

      // Create game state for the default game (assume player starts in room 1)
      await db.run(
        'INSERT INTO game_state (game_id, current_room_id) VALUES (?, ?)',
        [defaultGameId, 1]
      );

      console.log('Data migration completed successfully');
    } else {
      console.log('Database already has new schema, no migration needed');
    }
  } catch (error) {
    console.error('Error migrating existing data:', error);
    throw error;
  }
}

async function ensureGenerationProcessedColumn(db: Database): Promise<void> {
  try {
    // Check if generation_processed column exists
    const columnExists = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('rooms') 
       WHERE name = 'generation_processed'`
    );

    if (!columnExists || columnExists.count === 0) {
      console.log('Adding generation_processed column to rooms table...');
      
      // Add the column with default value FALSE
      await db.run('ALTER TABLE rooms ADD COLUMN generation_processed BOOLEAN DEFAULT FALSE');
      
      // Update all existing rooms to not be processed (so they can be processed once)
      await db.run('UPDATE rooms SET generation_processed = FALSE');
      
      console.log('generation_processed column added successfully');
    }
  } catch (error) {
    console.error('Error ensuring generation_processed column:', error);
    throw error;
  }
}

export async function createGameWithRooms(db: Database, gameName: string): Promise<number> {
  try {
    // Create the new game
    const gameResult = await db.run(
      'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
      [gameName, new Date().toISOString(), new Date().toISOString()]
    );

    const gameId = gameResult.lastID;

    // Create initial rooms for this game
    const entranceResult = await db.run(
      'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
      [gameId, 'Entrance Hall', 'A grand entrance hall with marble floors and towering columns. Dust motes dance in the light streaming through tall windows.']
    );

    const libraryResult = await db.run(
      'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
      [gameId, 'Library', 'Ancient bookshelves line the walls, filled with leather-bound tomes. The air smells of old paper and mystery.']
    );

    const gardenResult = await db.run(
      'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
      [gameId, 'Garden', 'A serene garden with overgrown paths and a fountain that still trickles with clear water.']
    );

    const entranceId = entranceResult.lastID;
    const libraryId = libraryResult.lastID;
    const gardenId = gardenResult.lastID;

    // Create connections between rooms for this game
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, name) VALUES (?, ?, ?, ?)',
      [gameId, entranceId, libraryId, 'north']
    );

    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, name) VALUES (?, ?, ?, ?)',
      [gameId, libraryId, entranceId, 'south']
    );

    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, name) VALUES (?, ?, ?, ?)',
      [gameId, entranceId, gardenId, 'east']
    );

    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, name) VALUES (?, ?, ?, ?)',
      [gameId, gardenId, entranceId, 'west']
    );

    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, name) VALUES (?, ?, ?, ?)',
      [gameId, libraryId, gardenId, 'bookshelf']
    );

    // Create initial game state (player starts in entrance hall)
    await db.run(
      'INSERT INTO game_state (game_id, current_room_id) VALUES (?, ?)',
      [gameId, entranceId]
    );

    console.log(`Game "${gameName}" created successfully with ID ${gameId}`);
    return gameId;
  } catch (error) {
    console.error('Error creating game with rooms:', error);
    throw error;
  }
}

export async function seedDatabase(db: Database): Promise<void> {
  try {
    // Check if any games already exist
    const existingGames = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM games'
    );

    if (existingGames && existingGames.count > 0) {
      console.log('Database already contains games, skipping seed');
      return;
    }

    // Create a default game with the initial world
    await createGameWithRooms(db, 'Demo Game');
    console.log('Database seeded with demo game');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}