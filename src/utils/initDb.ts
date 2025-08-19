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

    // Create rooms table with all columns from the start
    await db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        region_id INTEGER,
        region_distance INTEGER,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      )
    `);

    // Create connections table with all columns from the start
    await db.run(`
      CREATE TABLE IF NOT EXISTS connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        from_room_id INTEGER NOT NULL,
        to_room_id INTEGER,
        direction TEXT,
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

    // Create regions table
    await db.run(`
      CREATE TABLE IF NOT EXISTS regions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        name TEXT,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        center_room_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for faster lookups
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_connections_from_room 
      ON connections(from_room_id, direction, name)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_rooms_game_id 
      ON rooms(game_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_connections_game_id 
      ON connections(game_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_regions_game ON regions(game_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_rooms_region_id ON rooms(region_id) 
      WHERE region_id IS NOT NULL
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_connections_unfilled 
      ON connections(game_id, from_room_id) WHERE to_room_id IS NULL
    `);
    
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_connections_filled 
      ON connections(game_id, from_room_id, to_room_id) WHERE to_room_id IS NOT NULL
    `);

    // Run migrations for all databases, but skip the complex table recreation for in-memory
    // Check if direction column exists in connections table, add it if not
    await ensureConnectionDirectionColumn(db);

    // Check if region columns exist in rooms table, add them if not  
    await ensureRegionColumns(db);

    // Migrate connections table to support nullable to_room_id
    await ensureNullableToRoomId(db);

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


async function ensureConnectionDirectionColumn(db: Database): Promise<void> {
  try {
    // Skip complex column additions for in-memory databases (they're already created with correct schema)
    if (db.getDbPath() === ':memory:') {
      console.log('Skipping direction column migration for in-memory database');
      return;
    }

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

async function ensureRegionColumns(db: Database): Promise<void> {
  try {
    // Skip complex column additions for in-memory databases (they're already created with correct schema)
    if (db.getDbPath() === ':memory:') {
      console.log('Skipping region column migration for in-memory database');
      return;
    }

    // Check if region_id column exists in rooms table
    const regionIdExists = await db.get<{ count: number }>(`
      SELECT COUNT(*) as count FROM pragma_table_info('rooms') 
      WHERE name = 'region_id'
    `);

    if (!regionIdExists || regionIdExists.count === 0) {
      console.log('Adding region_id column to rooms table...');
      await db.run('ALTER TABLE rooms ADD COLUMN region_id INTEGER');
    }

    // Check if region_distance column exists in rooms table
    const regionDistanceExists = await db.get<{ count: number }>(`
      SELECT COUNT(*) as count FROM pragma_table_info('rooms') 
      WHERE name = 'region_distance'
    `);

    if (!regionDistanceExists || regionDistanceExists.count === 0) {
      console.log('Adding region_distance column to rooms table...');
      await db.run('ALTER TABLE rooms ADD COLUMN region_distance INTEGER');
    }

    // Create region-related indexes
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_rooms_region_id ON rooms(region_id) 
      WHERE region_id IS NOT NULL
    `);

    // Create trigger to set region center when distance 0 room created
    await db.run(`
      CREATE TRIGGER IF NOT EXISTS set_region_center
        AFTER INSERT ON rooms
        WHEN NEW.region_distance = 0 AND NEW.region_id IS NOT NULL
        BEGIN
          UPDATE regions 
          SET center_room_id = NEW.id
          WHERE id = NEW.region_id AND center_room_id IS NULL;
        END
    `);

    console.log('Region columns and triggers ensured successfully');
  } catch (error) {
    console.error('Error ensuring region columns:', error);
    throw error;
  }
}

async function ensureNullableToRoomId(db: Database): Promise<void> {
  try {
    // Skip complex table recreation for in-memory databases (they're already created with correct schema)
    if (db.getDbPath() === ':memory:') {
      console.log('Skipping connection migration for in-memory database');
      return;
    }

    // Check if we need to migrate the connections table to allow NULL to_room_id
    // We'll check if there are any constraints that would prevent NULL values
    const tableInfo = await db.all(`PRAGMA table_info('connections')`);
    const toRoomIdColumn = tableInfo.find((col: any) => col.name === 'to_room_id');
    
    // If the column exists and is marked as NOT NULL, we need to migrate
    if (toRoomIdColumn && toRoomIdColumn.notnull === 1) {
      console.log('Migrating connections table to allow NULL to_room_id...');
      
      // SQLite requires recreating the table to remove NOT NULL constraint
      await db.run('PRAGMA foreign_keys=off');
      
      // Create new table with nullable to_room_id
      await db.run(`
        CREATE TABLE connections_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id INTEGER NOT NULL,
          from_room_id INTEGER NOT NULL,
          to_room_id INTEGER,
          direction TEXT,
          name TEXT NOT NULL,
          FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
          FOREIGN KEY (from_room_id) REFERENCES rooms(id),
          FOREIGN KEY (to_room_id) REFERENCES rooms(id)
        )
      `);
      
      // Copy existing data
      await db.run(`
        INSERT INTO connections_new (id, game_id, from_room_id, to_room_id, direction, name)
        SELECT id, game_id, from_room_id, to_room_id, direction, name FROM connections
      `);
      
      // Drop old table and rename new one
      await db.run('DROP TABLE connections');
      await db.run('ALTER TABLE connections_new RENAME TO connections');
      
      await db.run('PRAGMA foreign_keys=on');
      
      console.log('Connections table migrated successfully');
    }
    
    // Add optimized indexes for connection-based generation
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_connections_unfilled 
      ON connections(game_id, from_room_id) WHERE to_room_id IS NULL
    `);
    
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_connections_filled 
      ON connections(game_id, from_room_id, to_room_id) WHERE to_room_id IS NOT NULL
    `);
    
    // Update existing connection indexes
    await db.run('DROP INDEX IF EXISTS idx_connections_from_room');
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_connections_from_room 
      ON connections(from_room_id, direction, name)
    `);
    
    console.log('Connection table migration and indexes ensured successfully');
  } catch (error) {
    console.error('Error ensuring nullable to_room_id:', error);
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

    // Create the initial region for this game
    const regionResult = await db.run(
      'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
      [gameId, 'Shadow Kingdom Manor', 'mansion', 'A grand manor estate shrouded in mystery, filled with elegant halls, ancient libraries, and moonlit gardens where forgotten secrets await discovery.']
    );

    const regionId = regionResult.lastID;

    // Create initial rooms for this game with rich, atmospheric descriptions
    // The entrance hall is the center of the manor region (distance 0)
    const entranceResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
      [gameId, 'Grand Entrance Hall', 
       `You stand in a magnificent entrance hall that speaks of forgotten grandeur. Towering marble columns stretch up to a vaulted ceiling painted with faded celestial murals, their gold leaf catching the light that filters through tall, arched windows. The polished marble floor beneath your feet reflects the dancing dust motes like stars in a night sky. Ancient tapestries hang between the windows, their once-vibrant colors now muted by centuries of shadow. The air carries a faint echo of footsteps from ages past, and the silence feels both reverent and expectant.`, 
       regionId, 0]
    );

    const libraryResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
      [gameId, 'Scholar\'s Library', 
       `You enter a vast library that seems to hold the weight of countless ages. Floor-to-ceiling bookshelves carved from dark oak stretch into the shadows above, filled with leather-bound tomes whose gilded spines catch the warm glow of brass reading lamps. The air is thick with the intoxicating scent of old parchment, leather bindings, and the faintest hint of forgotten incense. A massive oak desk sits near the center, its surface covered with open books, scrolls, and an ornate brass inkwell. Dust motes drift lazily through shafts of amber light, and somewhere in the depths of the shelves, you can hear the occasional whisper of settling books and the soft tick of an ancient clock.`, 
       regionId, 1]
    );

    const gardenResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
      [gameId, 'Moonlit Courtyard Garden', 
       `You step into an enchanted courtyard garden where nature has reclaimed its ancient dominion. Weathered stone paths wind between overgrown flowerbeds where wild roses climb trellises heavy with blooms that seem to glow in the perpetual twilight. At the garden's heart stands a marble fountain whose crystal waters still flow with an otherworldly luminescence, casting dancing reflections on the moss-covered statues that watch over this secret sanctuary. Night-blooming jasmine fills the air with its heady perfume, and somewhere in the shadows, you can hear the gentle tinkle of wind chimes and the soft rustle of leaves that seem to whisper secrets of the old kingdom.`, 
       regionId, 1]
    );

    // Create expansion point rooms
    const towerStairsResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
      [gameId, 'Winding Tower Stairs', 
       `A narrow spiral staircase winds upward into shadow, its stone steps worn smooth by countless centuries of use. Tall, narrow windows pierce the curved wall at irregular intervals, casting shifting patterns of light and shadow on the ancient stonework. The air grows cooler as you ascend, carrying the faint sound of wind whistling through distant chambers above. Iron sconces hold long-cold torches, their brackets green with age, and somewhere far above you can hear the distant echo of your own footsteps.`, 
       regionId, 2]
    );

    const cryptEntranceResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
      [gameId, 'Ancient Crypt Entrance', 
       `You stand before the entrance to what appears to be an ancient crypt, its arched doorway carved with weathered symbols that seem to shift in your peripheral vision. Cool air flows from the depths beyond, carrying the scent of stone and time itself. Flickering torchlight from within casts dancing shadows on walls lined with worn burial niches, their occupants long since turned to dust. The silence here is profound, broken only by the occasional drip of water and the whisper of air moving through forgotten passages.`, 
       regionId, 2]
    );

    const observatoryStepsResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
      [gameId, 'Observatory Steps', 
       `Wide stone steps lead upward toward what must once have been a grand observatory or watchtower. Star charts and celestial maps are carved into the stone walls, their intricate details still visible despite the passage of ages. Through gaps in the stonework above, you can glimpse the night sky, where stars seem unusually bright and close. The air here thrums with a subtle energy, and you can hear the faint whisper of wind through the apparatus that waits somewhere above.`, 
       regionId, 1]
    );

    const entranceId = entranceResult.lastID;
    const libraryId = libraryResult.lastID;
    const gardenId = gardenResult.lastID;
    const towerStairsId = towerStairsResult.lastID;
    const cryptEntranceId = cryptEntranceResult.lastID;
    const observatoryStepsId = observatoryStepsResult.lastID;

    // Create atmospheric connections between starter rooms (processed - these never change)
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

    // Connections to leaf nodes (expansion points - unprocessed)
    
    // From Grand Entrance Hall to Winding Tower Stairs
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, entranceId, towerStairsId, 'west', 'up the stone steps to the winding tower']
    );

    // From Winding Tower Stairs back to Grand Entrance Hall
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, towerStairsId, entranceId, 'down', 'down the worn steps to the entrance hall']
    );

    // From Scholar's Library to Ancient Crypt Entrance
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, libraryId, cryptEntranceId, 'west', 'through the hidden door behind dusty tomes']
    );

    // From Ancient Crypt Entrance back to Scholar's Library
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, cryptEntranceId, libraryId, 'east', 'back through the concealed library entrance']
    );

    // From Moonlit Courtyard Garden to Observatory Steps
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, gardenId, observatoryStepsId, 'up', 'up the celestial pathway to the stars']
    );

    // From Observatory Steps back to Moonlit Courtyard Garden
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, observatoryStepsId, gardenId, 'down', 'down the starlit steps to the garden']
    );

    // Create unfilled connections for background generation expansion
    // These are the expansion points that will be filled when players explore
    
    // From Winding Tower Stairs - unfilled connections for expansion
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, towerStairsId, null, 'north', 'through the shadowed northern passage']
    );
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, towerStairsId, null, 'east', 'through the ornate eastern passage']
    );
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, towerStairsId, null, 'south', 'through the mysterious southern passage']
    );

    // From Ancient Crypt Entrance - unfilled connections for expansion  
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, cryptEntranceId, null, 'north', 'deeper into the crypts']
    );
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, cryptEntranceId, null, 'south', 'through the bone-carved archway']
    );

    // From Observatory Steps - unfilled connections for expansion
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, observatoryStepsId, null, 'north', 'via the ancient northern passage']
    );
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, observatoryStepsId, null, 'east', 'through the starlit eastern corridor']
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