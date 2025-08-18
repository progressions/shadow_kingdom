import Database from './database';

export async function initializeDatabase(db: Database): Promise<void> {
  try {
    // Create rooms table
    await db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL
      )
    `);

    // Create connections table
    await db.run(`
      CREATE TABLE IF NOT EXISTS connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_room_id INTEGER NOT NULL,
        to_room_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (from_room_id) REFERENCES rooms(id),
        FOREIGN KEY (to_room_id) REFERENCES rooms(id)
      )
    `);

    // Create index for faster connection lookups
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_connections_from_room 
      ON connections(from_room_id, name)
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export async function seedDatabase(db: Database): Promise<void> {
  try {
    // Check if rooms already exist
    const existingRooms = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM rooms'
    );

    if (existingRooms && existingRooms.count > 0) {
      console.log('Database already contains rooms, skipping seed');
      return;
    }

    // Create initial rooms
    await db.run(
      'INSERT INTO rooms (name, description) VALUES (?, ?)',
      ['Entrance Hall', 'A grand entrance hall with marble floors and towering columns. Dust motes dance in the light streaming through tall windows.']
    );

    await db.run(
      'INSERT INTO rooms (name, description) VALUES (?, ?)',
      ['Library', 'Ancient bookshelves line the walls, filled with leather-bound tomes. The air smells of old paper and mystery.']
    );

    await db.run(
      'INSERT INTO rooms (name, description) VALUES (?, ?)',
      ['Garden', 'A serene garden with overgrown paths and a fountain that still trickles with clear water.']
    );

    // Create connections between rooms
    // From Entrance Hall to Library (north)
    await db.run(
      'INSERT INTO connections (from_room_id, to_room_id, name) VALUES (?, ?, ?)',
      [1, 2, 'north']
    );

    // From Library back to Entrance Hall (south)
    await db.run(
      'INSERT INTO connections (from_room_id, to_room_id, name) VALUES (?, ?, ?)',
      [2, 1, 'south']
    );

    // From Entrance Hall to Garden (east)
    await db.run(
      'INSERT INTO connections (from_room_id, to_room_id, name) VALUES (?, ?, ?)',
      [1, 3, 'east']
    );

    // From Garden back to Entrance Hall (west)
    await db.run(
      'INSERT INTO connections (from_room_id, to_room_id, name) VALUES (?, ?, ?)',
      [3, 1, 'west']
    );

    // Secret one-way passage from Library to Garden
    await db.run(
      'INSERT INTO connections (from_room_id, to_room_id, name) VALUES (?, ?, ?)',
      [2, 3, 'bookshelf']
    );

    console.log('Database seeded with initial rooms and connections');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}