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

    // Add unique constraint to prevent duplicate connections (fix for duplicate connection bug)
    await ensureConnectionUniqueConstraint(db);

    // Ensure regions table exists (Phase 1.1)
    await ensureRegionsTable(db);

    // Add region columns to rooms table (Phase 1.2)
    await ensureRoomRegionColumns(db);

    // Add database validation triggers (Phase 1.3)
    await ensureRegionTriggers(db);

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

async function ensureConnectionUniqueConstraint(db: Database): Promise<void> {
  try {
    // Check if unique constraint already exists by looking for the unique index
    const constraintExists = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM sqlite_master 
       WHERE type='index' AND name='unique_connections_per_direction'`
    );

    if (!constraintExists || constraintExists.count === 0) {
      console.log('Adding unique constraint to prevent duplicate connections...');
      
      // First, remove any existing duplicate connections
      console.log('Cleaning up existing duplicate connections...');
      
      // Find and remove duplicate connections, keeping only the first one
      await db.run(`
        DELETE FROM connections 
        WHERE id NOT IN (
          SELECT MIN(id) 
          FROM connections 
          GROUP BY game_id, from_room_id, direction
        )
      `);
      
      // Create unique index to prevent future duplicates
      await db.run(`
        CREATE UNIQUE INDEX unique_connections_per_direction 
        ON connections(game_id, from_room_id, direction)
      `);
      
      console.log('Unique constraint added - duplicate connections prevented');
    }
  } catch (error) {
    console.error('Error ensuring connection unique constraint:', error);
    throw error;
  }
}

async function ensureRegionsTable(db: Database): Promise<void> {
  try {
    // Check if regions table exists
    const tableExists = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM sqlite_master 
       WHERE type='table' AND name='regions'`
    );

    if (!tableExists || tableExists.count === 0) {
      console.log('Creating regions table...');
      
      // Create regions table
      await db.run(`
        CREATE TABLE regions (
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

      // Create index for performance
      await db.run('CREATE INDEX idx_regions_game ON regions(game_id)');
      
      console.log('Regions table created successfully');
    }
  } catch (error) {
    console.error('Error ensuring regions table:', error);
    throw error;
  }
}

async function ensureRoomRegionColumns(db: Database): Promise<void> {
  try {
    // Check if region_id column exists
    const regionIdExists = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('rooms') 
       WHERE name = 'region_id'`
    );

    if (!regionIdExists || regionIdExists.count === 0) {
      console.log('Adding region_id column to rooms table...');
      await db.run('ALTER TABLE rooms ADD COLUMN region_id INTEGER');
      console.log('region_id column added successfully');
    }

    // Check if region_distance column exists
    const regionDistanceExists = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('rooms') 
       WHERE name = 'region_distance'`
    );

    if (!regionDistanceExists || regionDistanceExists.count === 0) {
      console.log('Adding region_distance column to rooms table...');
      await db.run('ALTER TABLE rooms ADD COLUMN region_distance INTEGER');
      console.log('region_distance column added successfully');
    }

    // Create indexes for region queries
    await db.run('CREATE INDEX IF NOT EXISTS idx_rooms_region ON rooms(region_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_rooms_region_distance ON rooms(region_id, region_distance) WHERE region_id IS NOT NULL');
    
    console.log('Room region columns and indexes ensured successfully');
  } catch (error) {
    console.error('Error ensuring room region columns:', error);
    throw error;
  }
}

async function ensureRegionTriggers(db: Database): Promise<void> {
  try {
    console.log('Ensuring region database triggers...');

    // Trigger to set region center when distance 0 room is created
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

    // Trigger to prevent multiple centers per region (optional but helpful)
    await db.run(`
      CREATE TRIGGER IF NOT EXISTS prevent_multiple_centers
        BEFORE INSERT ON rooms
        WHEN NEW.region_distance = 0 AND NEW.region_id IS NOT NULL
        BEGIN
          SELECT CASE
            WHEN EXISTS (
              SELECT 1 FROM regions 
              WHERE id = NEW.region_id AND center_room_id IS NOT NULL
            )
            THEN RAISE(ABORT, 'Region already has a center room')
          END;
        END
    `);

    console.log('Region database triggers created successfully');
  } catch (error) {
    console.error('Error ensuring region triggers:', error);
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
    // All rooms start unprocessed and get locked when player first visits them
    const entranceResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
      [gameId, 'Grand Entrance Hall', 
       `You stand in a magnificent entrance hall that speaks of forgotten grandeur. Towering marble columns stretch up to a vaulted ceiling painted with faded celestial murals, their gold leaf catching the light that filters through tall, arched windows. The polished marble floor beneath your feet reflects the dancing dust motes like stars in a night sky. Ancient tapestries hang between the windows, their once-vibrant colors now muted by centuries of shadow. The air carries a faint echo of footsteps from ages past, and the silence feels both reverent and expectant.`, 
       false]
    );

    const libraryResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
      [gameId, 'Scholar\'s Library', 
       `You enter a vast library that seems to hold the weight of countless ages. Floor-to-ceiling bookshelves carved from dark oak stretch into the shadows above, filled with leather-bound tomes whose gilded spines catch the warm glow of brass reading lamps. The air is thick with the intoxicating scent of old parchment, leather bindings, and the faintest hint of forgotten incense. A massive oak desk sits near the center, its surface covered with open books, scrolls, and an ornate brass inkwell. Dust motes drift lazily through shafts of amber light, and somewhere in the depths of the shelves, you can hear the occasional whisper of settling books and the soft tick of an ancient clock.`, 
       false]
    );

    const gardenResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
      [gameId, 'Moonlit Courtyard Garden', 
       `You step into an enchanted courtyard garden where nature has reclaimed its ancient dominion. Weathered stone paths wind between overgrown flowerbeds where wild roses climb trellises heavy with blooms that seem to glow in the perpetual twilight. At the garden's heart stands a marble fountain whose crystal waters still flow with an otherworldly luminescence, casting dancing reflections on the moss-covered statues that watch over this secret sanctuary. Night-blooming jasmine fills the air with its heady perfume, and somewhere in the shadows, you can hear the gentle tinkle of wind chimes and the soft rustle of leaves that seem to whisper secrets of the old kingdom.`, 
       false]
    );

    // Create leaf nodes - unprocessed rooms that will become expansion points
    const towerStairsResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
      [gameId, 'Winding Tower Stairs', 
       `A narrow spiral staircase winds upward into shadow, its stone steps worn smooth by countless centuries of use. Tall, narrow windows pierce the curved wall at irregular intervals, casting shifting patterns of light and shadow on the ancient stonework. The air grows cooler as you ascend, carrying the faint sound of wind whistling through distant chambers above. Iron sconces hold long-cold torches, their brackets green with age, and somewhere far above you can hear the distant echo of your own footsteps.`, 
       false]
    );

    const cryptEntranceResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
      [gameId, 'Ancient Crypt Entrance', 
       `You stand before the entrance to what appears to be an ancient crypt, its arched doorway carved with weathered symbols that seem to shift in your peripheral vision. Cool air flows from the depths beyond, carrying the scent of stone and time itself. Flickering torchlight from within casts dancing shadows on walls lined with worn burial niches, their occupants long since turned to dust. The silence here is profound, broken only by the occasional drip of water and the whisper of air moving through forgotten passages.`, 
       false]
    );

    const observatoryStepsResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
      [gameId, 'Observatory Steps', 
       `Wide stone steps lead upward toward what must once have been a grand observatory or watchtower. Star charts and celestial maps are carved into the stone walls, their intricate details still visible despite the passage of ages. Through gaps in the stonework above, you can glimpse the night sky, where stars seem unusually bright and close. The air here thrums with a subtle energy, and you can hear the faint whisper of wind through the apparatus that waits somewhere above.`, 
       false]
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