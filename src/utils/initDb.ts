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

    // Check if direction column exists in connections table, add it if not
    await ensureConnectionDirectionColumn(db);

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

async function ensureConnectionDirectionColumn(db: Database): Promise<void> {
  try {
    // Check if direction column exists in connections table
    const columnExists = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('connections') 
       WHERE name = 'direction'`
    );

    if (!columnExists || columnExists.count === 0) {
      console.log('Adding direction column to connections table...');
      
      // Add the direction column
      await db.run('ALTER TABLE connections ADD COLUMN direction TEXT');
      
      // Migrate existing connections: copy name to direction and set name to be more descriptive
      // For existing connections, direction and name will initially be the same
      await db.run('UPDATE connections SET direction = name WHERE direction IS NULL');
      
      // Update the index to include the new direction column for better performance
      await db.run('DROP INDEX IF EXISTS idx_connections_from_room');
      await db.run(`
        CREATE INDEX IF NOT EXISTS idx_connections_from_room 
        ON connections(from_room_id, direction, name)
      `);
      
      console.log('direction column added and existing connections migrated successfully');
    }
  } catch (error) {
    console.error('Error ensuring direction column:', error);
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

    // Create initial rooms for this game with rich, atmospheric descriptions
    const entranceResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
      [gameId, 'Grand Entrance Hall', 
       `You stand in a magnificent entrance hall that speaks of forgotten grandeur. Towering marble columns stretch up to a vaulted ceiling painted with faded celestial murals, their gold leaf catching the light that filters through tall, arched windows. The polished marble floor beneath your feet reflects the dancing dust motes like stars in a night sky. Ancient tapestries hang between the windows, their once-vibrant colors now muted by centuries of shadow. The air carries a faint echo of footsteps from ages past, and the silence feels both reverent and expectant.`, 
       true]
    );

    const libraryResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
      [gameId, 'Scholar\'s Library', 
       `You enter a vast library that seems to hold the weight of countless ages. Floor-to-ceiling bookshelves carved from dark oak stretch into the shadows above, filled with leather-bound tomes whose gilded spines catch the warm glow of brass reading lamps. The air is thick with the intoxicating scent of old parchment, leather bindings, and the faintest hint of forgotten incense. A massive oak desk sits near the center, its surface covered with open books, scrolls, and an ornate brass inkwell. Dust motes drift lazily through shafts of amber light, and somewhere in the depths of the shelves, you can hear the occasional whisper of settling books and the soft tick of an ancient clock.`, 
       true]
    );

    const gardenResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
      [gameId, 'Moonlit Courtyard Garden', 
       `You step into an enchanted courtyard garden where nature has reclaimed its ancient dominion. Weathered stone paths wind between overgrown flowerbeds where wild roses climb trellises heavy with blooms that seem to glow in the perpetual twilight. At the garden's heart stands a marble fountain whose crystal waters still flow with an otherworldly luminescence, casting dancing reflections on the moss-covered statues that watch over this secret sanctuary. Night-blooming jasmine fills the air with its heady perfume, and somewhere in the shadows, you can hear the gentle tinkle of wind chimes and the soft rustle of leaves that seem to whisper secrets of the old kingdom.`, 
       true]
    );

    const entranceId = entranceResult.lastID;
    const libraryId = libraryResult.lastID;
    const gardenId = gardenResult.lastID;

    // Create atmospheric connections between rooms
    // Format: (game_id, from_room_id, to_room_id, direction, name)
    
    // From Grand Entrance Hall to Scholar's Library
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, entranceId, libraryId, 'north', 'through the ornate archway beneath celestial murals']
    );

    // From Scholar's Library back to Grand Entrance Hall
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, libraryId, entranceId, 'south', 'through the shadowed archway to the grand hall']
    );

    // From Grand Entrance Hall to Moonlit Courtyard Garden
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, entranceId, gardenId, 'east', 'through the glass doors that shimmer with moonlight']
    );

    // From Moonlit Courtyard Garden back to Grand Entrance Hall
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, gardenId, entranceId, 'west', 'through the crystal doors back to the marble hall']
    );

    // Secret passage from Scholar's Library to Moonlit Courtyard Garden
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, libraryId, gardenId, 'bookshelf', 'through the secret passage behind the ancient tome collection']
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