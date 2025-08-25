import Database from './database';
import { TUIInterface } from '../ui/TUIInterface';
import { MessageType } from '../ui/MessageFormatter';
import { seedItems } from './seedItems.prisma';
import { seedGameTriggers } from './seedGameTriggers.prisma';
import { ensureCharacterIdColumn } from './ensureCharacterIdColumn.prisma';
import { addStarterItemValidations } from './addStarterItemValidations.prisma';
import { seedDatabase as seedDatabasePrisma } from './seedDatabase.prisma';
import { CharacterService } from '../services/characterService';
import { CharacterGenerationService } from '../services/characterGenerationService';
import type { CreateCharacterData } from '../types/character';
import { RegionPlannerService } from '../services/regionPlannerService';
import { RegionService } from '../services/regionService';

export async function initializeDatabase(db: Database, tui?: TUIInterface): Promise<void> {
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
        extended_description TEXT, -- detailed description shown on examine
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
        processing BOOLEAN DEFAULT FALSE,
        locked BOOLEAN DEFAULT FALSE,
        required_key_name TEXT,
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
        character_id INTEGER, -- reference to the player character
        player_name TEXT, -- legacy field, will be replaced by character.name
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (current_room_id) REFERENCES rooms(id),
        FOREIGN KEY (character_id) REFERENCES characters(id)
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

    // Create characters table (unified for players, NPCs, and enemies)
    await db.run(`
      CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'player', -- 'player', 'npc', 'enemy'
        current_room_id INTEGER, -- where this character is located (NULL for player uses game_state)
        strength INTEGER DEFAULT 10,
        dexterity INTEGER DEFAULT 10,
        intelligence INTEGER DEFAULT 10,
        constitution INTEGER DEFAULT 10,
        wisdom INTEGER DEFAULT 10,
        charisma INTEGER DEFAULT 10,
        max_health INTEGER, -- calculated from constitution, NULL = not calculated yet
        current_health INTEGER, -- current HP, NULL = full health
        description TEXT, -- basic description
        extended_description TEXT, -- detailed description shown on examine
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (current_room_id) REFERENCES rooms(id)
      )
    `);

    // Create items table
    await db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        extended_description TEXT, -- detailed description shown on examine
        type TEXT NOT NULL, -- weapon, armor, consumable, misc, quest
        weight REAL DEFAULT 0.0,
        value INTEGER DEFAULT 0, -- in copper pieces
        stackable BOOLEAN DEFAULT FALSE,
        max_stack INTEGER DEFAULT 1,
        armor_rating INTEGER DEFAULT 0,
        equipment_slot TEXT, -- hand, head, body, foot
        is_fixed BOOLEAN DEFAULT FALSE, -- true for scenery items that cannot be picked up
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create character_inventory table
    await db.run(`
      CREATE TABLE IF NOT EXISTS character_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        equipped BOOLEAN DEFAULT FALSE,
        equipped_slot TEXT, -- weapon, armor, accessory
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      )
    `);

    // Create room_items table
    await db.run(`
      CREATE TABLE IF NOT EXISTS room_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      )
    `);

    // Create action validation tables (for future phases)
    
    // Generic conditions table for flexible validation
    await db.run(`
      CREATE TABLE IF NOT EXISTS action_conditions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,      -- 'room', 'connection', 'item', 'character'
        entity_id INTEGER NOT NULL,     -- ID of the entity
        action_type TEXT NOT NULL,      -- 'move', 'rest', 'pickup', 'drop', 'use', 'equip'
        condition_type TEXT NOT NULL,   -- 'hostile_present', 'item_required', 'item_forbidden', 'state_check'
        condition_data TEXT,             -- JSON data for condition specifics
        failure_message TEXT NOT NULL,  -- Message shown when condition blocks action
        hint_message TEXT,               -- Optional hint for overcoming the blocker
        priority INTEGER DEFAULT 0,      -- Order of checking (lower = checked first)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Track hostile entities that block actions
    await db.run(`
      CREATE TABLE IF NOT EXISTS room_hostiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        character_id INTEGER NOT NULL,
        blocks_rest BOOLEAN DEFAULT TRUE,
        blocks_movement TEXT,            -- JSON array of blocked directions
        threat_level INTEGER DEFAULT 1,  -- How threatening (affects what they block)
        threat_message TEXT,              -- Custom message for this hostile
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
      )
    `);

    // Item curses and restrictions
    await db.run(`
      CREATE TABLE IF NOT EXISTS item_curses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL UNIQUE,
        curse_type TEXT NOT NULL,        -- 'sticky', 'heavy', 'disturbing', 'blocking'
        prevents_actions TEXT NOT NULL,  -- JSON array ['drop', 'unequip', 'rest', etc.]
        curse_message TEXT NOT NULL,     -- Message explaining the curse
        removal_condition TEXT,           -- How to remove curse (future feature)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      )
    `);

    // Migration: Add equipment_slot column if it doesn't exist
    try {
      await db.run(`ALTER TABLE items ADD COLUMN equipment_slot TEXT`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Add is_fixed column if it doesn't exist
    try {
      await db.run(`ALTER TABLE items ADD COLUMN is_fixed BOOLEAN DEFAULT FALSE`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Add is_dead column to characters if it doesn't exist
    try {
      await db.run(`ALTER TABLE characters ADD COLUMN is_dead BOOLEAN DEFAULT FALSE`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Add description column to characters if it doesn't exist
    try {
      await db.run(`ALTER TABLE characters ADD COLUMN description TEXT`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Add dialogue_response column to characters if it doesn't exist
    try {
      await db.run(`ALTER TABLE characters ADD COLUMN dialogue_response TEXT DEFAULT 'Lovely day.'`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Add is_hostile column to characters if it doesn't exist
    try {
      await db.run(`ALTER TABLE characters ADD COLUMN is_hostile BOOLEAN DEFAULT FALSE`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Add sentiment column to characters if it doesn't exist
    try {
      await db.run(`ALTER TABLE characters ADD COLUMN sentiment TEXT DEFAULT 'indifferent'`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Add extended_description column to characters if it doesn't exist
    try {
      await db.run(`ALTER TABLE characters ADD COLUMN extended_description TEXT`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Add extended_description column to items if it doesn't exist
    try {
      await db.run(`ALTER TABLE items ADD COLUMN extended_description TEXT`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Add extended_description column to rooms if it doesn't exist
    try {
      await db.run(`ALTER TABLE rooms ADD COLUMN extended_description TEXT`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Convert is_hostile values to sentiment system (Phase 9)
    try {
      await db.run(`
        UPDATE characters 
        SET sentiment = CASE 
          WHEN is_hostile = 1 THEN 'aggressive'
          ELSE 'indifferent' 
        END
        WHERE sentiment IS NULL OR sentiment = 'indifferent'
      `);
    } catch (error) {
      // Migration might fail if sentiment column doesn't exist yet, but that's okay
      console.warn('Sentiment migration failed, likely due to missing column:', error);
    }

    // Migration: Add room connection validation triggers (Phase 11)
    try {
      // Create triggers to validate room connections
      await db.run(`
        CREATE TRIGGER IF NOT EXISTS validate_room_connections_after_insert
        AFTER INSERT ON rooms
        BEGIN
          -- Allow the insert to proceed, but log a warning if no connections exist
          -- This is handled by application logic rather than blocking the insert
          SELECT CASE 
            WHEN (SELECT COUNT(*) FROM connections WHERE from_room_id = NEW.id OR to_room_id = NEW.id) = 0 
            THEN RAISE(IGNORE) -- Allow insertion, validation happens at application level
          END;
        END;
      `);

      // Trigger to warn about room deletion that might orphan other rooms  
      await db.run(`
        CREATE TRIGGER IF NOT EXISTS validate_room_connections_before_delete
        BEFORE DELETE ON rooms
        BEGIN
          -- Check if deleting this room would orphan other rooms
          UPDATE connections SET to_room_id = NULL 
          WHERE to_room_id = OLD.id;
          
          DELETE FROM connections 
          WHERE from_room_id = OLD.id;
        END;
      `);

      console.log('✅ Room connection validation triggers created successfully');
    } catch (error) {
      console.warn('⚠️ Failed to create room connection validation triggers:', error);
    }

    // Migration: Remove is_hostile column from characters table (Phase 10)
    try {
      // Check if the column exists before trying to drop it
      const tableInfo = await db.all("PRAGMA table_info(characters)");
      const hasIsHostile = tableInfo.some((col: any) => col.name === 'is_hostile');
      
      if (hasIsHostile) {
        // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
        await db.run('BEGIN TRANSACTION');
        
        // Create new table without is_hostile column
        await db.run(`
          CREATE TABLE characters_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'player',
            current_room_id INTEGER,
            strength INTEGER DEFAULT 10,
            dexterity INTEGER DEFAULT 10,
            intelligence INTEGER DEFAULT 10,
            constitution INTEGER DEFAULT 10,
            wisdom INTEGER DEFAULT 10,
            charisma INTEGER DEFAULT 10,
            max_health INTEGER,
            current_health INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_dead BOOLEAN DEFAULT FALSE,
            description TEXT,
            dialogue_response TEXT,
            sentiment TEXT DEFAULT 'indifferent',
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
            FOREIGN KEY (current_room_id) REFERENCES rooms(id) ON DELETE SET NULL
          )
        `);
        
        // Copy data from old table to new table (excluding is_hostile)
        await db.run(`
          INSERT INTO characters_new (
            id, game_id, name, type, current_room_id, strength, dexterity, intelligence,
            constitution, wisdom, charisma, max_health, current_health, created_at,
            is_dead, description, dialogue_response, sentiment
          )
          SELECT 
            id, game_id, name, type, current_room_id, strength, dexterity, intelligence,
            constitution, wisdom, charisma, max_health, current_health, created_at,
            is_dead, description, dialogue_response, sentiment
          FROM characters
        `);
        
        // Drop old table and rename new table
        await db.run('DROP TABLE characters');
        await db.run('ALTER TABLE characters_new RENAME TO characters');
        
        await db.run('COMMIT');
      }
    } catch (error) {
      await db.run('ROLLBACK');
      console.warn('Phase 10 migration failed (is_hostile column removal):', error);
    }

    // Migration: Add generation_processed column to rooms if it doesn't exist (for legacy test compatibility)
    try {
      await db.run(`ALTER TABLE rooms ADD COLUMN generation_processed BOOLEAN DEFAULT FALSE`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Add locked column to connections if it doesn't exist
    try {
      await db.run(`ALTER TABLE connections ADD COLUMN locked BOOLEAN DEFAULT FALSE`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Add required_key_name column to connections if it doesn't exist
    try {
      await db.run(`ALTER TABLE connections ADD COLUMN required_key_name TEXT`);
    } catch (error) {
      // Column already exists, ignore error
    }

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

    // Create indexes for character tables
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_characters_game_id 
      ON characters(game_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_characters_type 
      ON characters(game_id, type)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_characters_room 
      ON characters(current_room_id) WHERE current_room_id IS NOT NULL
    `);

    // Create indexes for item tables
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_character_inventory_character 
      ON character_inventory(character_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_character_inventory_item 
      ON character_inventory(item_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_room_items_room 
      ON room_items(room_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_room_items_item 
      ON room_items(item_id)
    `);

    // Create event trigger system tables
    await db.run(`
      CREATE TABLE IF NOT EXISTS event_triggers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        entity_type TEXT NOT NULL,     -- 'item', 'room', 'connection', 'npc', 'global'
        entity_id INTEGER,             -- ID of the entity (null for global)
        event_type TEXT NOT NULL,      -- 'equip', 'unequip', 'pickup', 'drop', 'enter', 'exit', 'use', 'examine'
        priority INTEGER DEFAULT 0,    -- Execution order (lower = first)
        enabled BOOLEAN DEFAULT TRUE,
        max_executions INTEGER,        -- Limit executions (null = unlimited)
        execution_count INTEGER DEFAULT 0,
        cooldown_seconds INTEGER,      -- Minimum time between executions
        last_executed DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS trigger_conditions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trigger_id INTEGER NOT NULL,
        condition_order INTEGER DEFAULT 0,
        condition_type TEXT NOT NULL,  -- 'attribute_check', 'item_possessed', 'health_check', 'room_check', 'random_chance'
        comparison_operator TEXT,      -- '>', '<', '=', '>=', '<=', '!=', 'contains'
        condition_value TEXT NOT NULL, -- JSON-encoded value
        logic_operator TEXT DEFAULT 'AND', -- 'AND' or 'OR' with next condition
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trigger_id) REFERENCES event_triggers(id) ON DELETE CASCADE
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS trigger_effects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trigger_id INTEGER NOT NULL,
        effect_order INTEGER DEFAULT 0,
        effect_type TEXT NOT NULL,     -- 'spawn_creature', 'damage', 'heal', 'add_item', 'remove_item', 'apply_status'
        target_type TEXT NOT NULL,     -- 'self', 'character', 'room', 'item', 'connection'
        target_specifier TEXT,         -- Additional targeting info
        effect_data TEXT NOT NULL,     -- JSON-encoded effect parameters
        delay_seconds INTEGER DEFAULT 0,
        duration_seconds INTEGER,      -- For temporary effects
        message TEXT,                  -- Message to display
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trigger_id) REFERENCES event_triggers(id) ON DELETE CASCADE
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS trigger_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trigger_id INTEGER NOT NULL,
        character_id INTEGER,
        room_id INTEGER,
        event_type TEXT NOT NULL,
        event_data TEXT,              -- JSON context
        effects_applied TEXT,         -- JSON array of effects
        execution_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trigger_id) REFERENCES event_triggers(id) ON DELETE CASCADE
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS character_status_effects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        status_type TEXT NOT NULL,     -- 'cursed', 'blessed', 'poisoned', 'strengthened'
        source_trigger_id INTEGER,
        effect_data TEXT,             -- JSON data for the effect
        expires_at DATETIME,          -- When the effect expires
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (source_trigger_id) REFERENCES event_triggers(id) ON DELETE SET NULL
      )
    `);

    // Create indexes for action validation tables
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_action_conditions_entity 
      ON action_conditions(entity_type, entity_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_action_conditions_action 
      ON action_conditions(action_type)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_room_hostiles_room 
      ON room_hostiles(room_id)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_item_curses_item 
      ON item_curses(item_id)
    `);

    // Create indexes for event trigger system
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_event_triggers_entity 
      ON event_triggers(entity_type, entity_id, event_type)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_event_triggers_event_type 
      ON event_triggers(event_type)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_trigger_conditions_trigger 
      ON trigger_conditions(trigger_id, condition_order)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_trigger_effects_trigger 
      ON trigger_effects(trigger_id, effect_order)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_trigger_history_trigger 
      ON trigger_history(trigger_id, execution_time)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_trigger_history_character 
      ON trigger_history(character_id, execution_time)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_character_status_effects_character 
      ON character_status_effects(character_id, status_type)
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_character_status_effects_expiry 
      ON character_status_effects(expires_at)
    `);

    // Run migrations for all databases, but skip the complex table recreation for in-memory
    // Check if direction column exists in connections table, add it if not
    await ensureConnectionDirectionColumn(db, tui);

    // Check if region columns exist in rooms table, add them if not  
    await ensureRegionColumns(db, tui);

    // Migrate connections table to support nullable to_room_id
    await ensureNullableToRoomId(db, tui);

    // Add processing column to connections table for auto-generation
    await ensureProcessingColumn(db, tui);

    // Ensure character_id column exists in game_state table
    await ensureCharacterIdColumn(tui);

    // Seed items table with initial items if empty
    await seedItems(tui);

    if (tui) {
      tui.display('Database tables initialized successfully', MessageType.SYSTEM);
    }
  } catch (error) {
    if (tui) {
      tui.display(`Error initializing database: ${error}`, MessageType.ERROR);
    }
    throw error;
  }
}



async function ensureConnectionDirectionColumn(db: Database, tui?: TUIInterface): Promise<void> {
  try {
    // Skip complex column additions for in-memory databases (they're already created with correct schema)
    if (db.getDbPath() === ':memory:') {
      if (tui) {
        tui.display('Skipping direction column migration for in-memory database', MessageType.SYSTEM);
      } else {
      }
      return;
    }

    // Check if direction column exists in connections table
    const columnExists = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('connections') 
       WHERE name = 'direction'`
    );

    if (!columnExists || columnExists.count === 0) {
      if (tui) {
        tui.display('Adding direction column to connections table...', MessageType.SYSTEM);
      } else {
      }
      
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
      
      if (tui) {
        tui.display('direction column added and existing connections migrated successfully', MessageType.SYSTEM);
      } else {
      }
    }
  } catch (error) {
    if (tui) {
      tui.display(`Error ensuring direction column: ${error}`, MessageType.ERROR);
    } else {
    }
    throw error;
  }
}

async function ensureRegionColumns(db: Database, tui?: TUIInterface): Promise<void> {
  try {
    // Skip complex column additions for in-memory databases (they're already created with correct schema)
    if (db.getDbPath() === ':memory:') {
      return;
    }

    // Check if region_id column exists in rooms table
    const regionIdExists = await db.get<{ count: number }>(`
      SELECT COUNT(*) as count FROM pragma_table_info('rooms') 
      WHERE name = 'region_id'
    `);

    if (!regionIdExists || regionIdExists.count === 0) {
      await db.run('ALTER TABLE rooms ADD COLUMN region_id INTEGER');
    }

    // Check if region_distance column exists in rooms table
    const regionDistanceExists = await db.get<{ count: number }>(`
      SELECT COUNT(*) as count FROM pragma_table_info('rooms') 
      WHERE name = 'region_distance'
    `);

    if (!regionDistanceExists || regionDistanceExists.count === 0) {
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

  } catch (error) {
    throw error;
  }
}

async function ensureNullableToRoomId(db: Database, tui?: TUIInterface): Promise<void> {
  try {
    // Skip complex table recreation for in-memory databases (they're already created with correct schema)
    if (db.getDbPath() === ':memory:') {
      return;
    }

    // Check if we need to migrate the connections table to allow NULL to_room_id
    // We'll check if there are any constraints that would prevent NULL values
    const tableInfo = await db.all(`PRAGMA table_info('connections')`);
    const toRoomIdColumn = tableInfo.find((col: any) => col.name === 'to_room_id');
    
    // If the column exists and is marked as NOT NULL, we need to migrate
    if (toRoomIdColumn && toRoomIdColumn.notnull === 1) {
      
      // SQLite requires recreating the table to remove NOT NULL constraint
      await db.run('PRAGMA foreign_keys=off');
      
      // Create new table with nullable to_room_id and processing column
      await db.run(`
        CREATE TABLE connections_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id INTEGER NOT NULL,
          from_room_id INTEGER NOT NULL,
          to_room_id INTEGER,
          direction TEXT,
          name TEXT NOT NULL,
          processing BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
          FOREIGN KEY (from_room_id) REFERENCES rooms(id),
          FOREIGN KEY (to_room_id) REFERENCES rooms(id)
        )
      `);
      
      // Copy existing data (processing defaults to FALSE for existing connections)
      await db.run(`
        INSERT INTO connections_new (id, game_id, from_room_id, to_room_id, direction, name, processing)
        SELECT id, game_id, from_room_id, to_room_id, direction, name, FALSE FROM connections
      `);
      
      // Drop old table and rename new one
      await db.run('DROP TABLE connections');
      await db.run('ALTER TABLE connections_new RENAME TO connections');
      
      await db.run('PRAGMA foreign_keys=on');
      
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
    
  } catch (error) {
    throw error;
  }
}

async function ensureProcessingColumn(db: Database, tui?: TUIInterface): Promise<void> {
  try {
    // Skip complex column additions for in-memory databases (they're already created with correct schema)
    if (db.getDbPath() === ':memory:') {
      return;
    }

    // Check if processing column exists in connections table
    const processingColumnExists = await db.get<{ count: number }>(`
      SELECT COUNT(*) as count FROM pragma_table_info('connections') 
      WHERE name = 'processing'
    `);

    if (!processingColumnExists || processingColumnExists.count === 0) {
      
      // Add the processing column with default FALSE
      await db.run('ALTER TABLE connections ADD COLUMN processing BOOLEAN DEFAULT FALSE');
      
      // Set all existing connections to processing = FALSE (they're not currently being processed)
      await db.run('UPDATE connections SET processing = FALSE WHERE processing IS NULL');
      
      // Update indexes to optimize for processing queries
      await db.run(`
        CREATE INDEX IF NOT EXISTS idx_connections_processing 
        ON connections(game_id, from_room_id, processing) WHERE to_room_id IS NULL
      `);
      
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Generate a timestamp-based game name
 */
function generateTimestampGameName(): string {
  const now = new Date();
  return now.toISOString().replace('T', ' ').split('.')[0]; // Format: "2025-01-20 14:32:05"
}

/**
 * Create a new game with rooms using timestamp-based name
 */
export async function createGameWithRooms(db: Database, customName?: string, tui?: TUIInterface): Promise<number> {
  const gameName = customName || generateTimestampGameName();
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
       `You stand before the entrance to what appears to be an ancient crypt, its arched doorway carved with weathered symbols that seem to shift in your peripheral vision. A massive Stone Sentinel stands guard here, its granite form emanating ancient magic as it protects a glowing key. Cool air flows from the depths beyond, carrying the scent of stone and time itself. The silence here is profound, broken only by the occasional drip of water and the grinding of stone as the guardian shifts its weight.`, 
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

    // From Scholar's Library to Ancient Crypt Entrance (LOCKED - requires Ancient Key)
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, locked, required_key_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [gameId, libraryId, cryptEntranceId, 'west', 'through the sealed door behind dusty tomes', 1, 'Ancient Key']
    );

    // From Ancient Crypt Entrance back to Scholar's Library
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [gameId, cryptEntranceId, libraryId, 'east', 'back through the concealed library entrance']
    );

    // From Moonlit Courtyard Garden to Observatory Steps (LOCKED - requires Celestial Star Key)
    await db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, locked, required_key_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [gameId, gardenId, observatoryStepsId, 'up', 'through the starlit gateway to the observatory', 1, 'Star Key']
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

    // Create default player character (auto-increment ID)
    const playerResult = await db.run(`
      INSERT INTO characters (
        game_id, name, type, current_room_id,
        strength, dexterity, intelligence, constitution, wisdom, charisma,
        max_health, current_health
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      gameId, 'Hero', 'player', null, // Let ID auto-increment
      10, 10, 10, 10, 10, 10, // Default attributes
      10, 10 // max_health and current_health
    ]);

    const playerCharacterId = playerResult.lastID;

    // Create initial game state (player starts in entrance hall)
    await db.run(
      'INSERT INTO game_state (game_id, current_room_id, character_id) VALUES (?, ?, ?)',
      [gameId, entranceId, playerCharacterId]
    );

    // Place starter items in all starter rooms
    const starterRoomItems = [
      { roomId: entranceId, itemNames: ['Iron Sword', 'Chain Mail', 'Leather Armor', 'Ancient Stone Pedestal', 'Blessed Silver Amulet', 'Cursed Skull', 'Leather Boots'], roomName: 'Grand Entrance Hall' },
      { roomId: libraryId, itemNames: ['Ancient Key', 'Healing Herbs', 'Scholar\'s Spectacles'], roomName: 'Scholar\'s Library' },
      { roomId: gardenId, itemNames: ['Health Potion', 'Bread', 'Mysterious Glowing Orb', 'Celestial Star Key'], roomName: 'Moonlit Courtyard Garden' },
      { roomId: towerStairsId, itemNames: ['Wooden Staff', 'Cursed Ruby Ring'], roomName: 'Winding Tower Stairs' },
      { roomId: cryptEntranceId, itemNames: ['Vault Key', 'Iron Helmet', 'Gold Coins', 'Poisoned Dagger'], roomName: 'Ancient Crypt Entrance' },
      { roomId: observatoryStepsId, itemNames: [], roomName: 'Observatory Steps' }
    ];

    let totalItemsPlaced = 0;
    const placedItems: string[] = [];

    for (const room of starterRoomItems) {
      for (const itemName of room.itemNames) {
        const item = await db.get<any>(
          'SELECT id FROM items WHERE name = ?',
          [itemName]
        );
        if (item) {
          await db.run(
            'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
            [room.roomId, item.id, 1]
          );
          totalItemsPlaced++;
          placedItems.push(`${itemName} in ${room.roomName}`);
          
          if (tui) {
            tui.display(`Placed ${itemName} in ${room.roomName}`, MessageType.SYSTEM);
          }
        } else if (tui) {
          tui.display(`Warning: Item "${itemName}" not found for placement`, MessageType.ERROR);
        }
      }
    }

    // Create characters in starter rooms for easy testing
    const characterService = new CharacterService(db);
    const characterGenerationService = new CharacterGenerationService(db, characterService, { enableDebugLogging: false });
    
    const starterRoomCharacters = [
      { roomId: entranceId, character: { name: 'Ancient Guardian', description: 'A spectral guardian that watches over the entrance hall with eternal vigilance', type: 'npc' as const, initialDialogue: 'These halls have stood for centuries, and I shall guard them for centuries more.' }, roomName: 'Grand Entrance Hall' },
      { roomId: libraryId, character: { name: 'Scholar Wraith', description: 'A ghostly figure in scholarly robes, eternally tending to the ancient tomes', type: 'npc' as const, initialDialogue: 'So many books, so little time... even in death.' }, roomName: 'Scholar\'s Library' },
      { roomId: gardenId, character: { name: 'Garden Spirit', description: 'A benevolent nature spirit that tends to the moonlit garden with gentle care', type: 'npc' as const, initialDialogue: 'The flowers whisper secrets of ages past, if you know how to listen.' }, roomName: 'Moonlit Courtyard Garden' },
      { roomId: towerStairsId, character: { name: 'Tower Sentinel', description: 'A mysterious figure that guards the winding stairs leading to higher mysteries', type: 'enemy' as const, initialDialogue: 'None may pass without proving their worth. Turn back, or face the consequences.' }, roomName: 'Winding Tower Stairs' },
      { roomId: cryptEntranceId, character: { name: 'Stone Sentinel', description: 'An ancient golem of carved granite, eyes glowing with fading protective magic. It guards the Vault Key with unwavering dedication.', type: 'enemy' as const, initialDialogue: 'None shall take what I am sworn to protect. Turn back or face destruction.' }, roomName: 'Ancient Crypt Entrance' },
      { roomId: observatoryStepsId, character: { name: 'Star Watcher', description: 'An ethereal being dedicated to observing the celestial movements above', type: 'npc' as const, initialDialogue: 'The stars tell stories of destiny and fate, written across the night sky.' }, roomName: 'Observatory Steps' }
    ];

    let totalCharactersPlaced = 0;
    const placedCharacters: string[] = [];

    for (const room of starterRoomCharacters) {
      try {
        await characterGenerationService.createCharactersFromRoomGeneration(
          gameId, 
          room.roomId, 
          [room.character]
        );
        totalCharactersPlaced++;
        placedCharacters.push(`${room.character.name} in ${room.roomName}`);
        
        if (tui) {
          tui.display(`Placed ${room.character.name} in ${room.roomName}`, MessageType.SYSTEM);
        }
      } catch (error) {
        if (tui) {
          tui.display(`Warning: Failed to place character "${room.character.name}" in ${room.roomName}: ${error}`, MessageType.ERROR);
        }
      }
    }

    // Add validations to specific starter items
    await addStarterItemValidations(gameId, entranceId, tui);

    // Add event triggers for interactive gameplay
    await seedGameTriggers({
      gameId,
      entranceRoomId: entranceId,
      libraryRoomId: libraryId,
      gardenRoomId: gardenId,
      towerStairsRoomId: towerStairsId,
      cryptEntranceRoomId: cryptEntranceId,
      observatoryStepsRoomId: observatoryStepsId
    }, tui);

    // Phase 5: Generate Region 2 for new games  
    try {
      if (tui) {
        tui.display('🏰 Generating Region 2...', MessageType.SYSTEM);
      }
      
      const regionPlannerService = new RegionPlannerService(db, { enableDebugLogging: !!tui });
      const regionService = new RegionService(db, { enableDebugLogging: !!tui });
      
      // Generate complete Region 2 (sequence number 2)
      const completeRegion2 = await regionPlannerService.generateCompleteRegion(2, {
        existingConcepts: ['Shadow Kingdom Manor'] // Avoid duplicating the hardcoded region
      });
      
      // Instantiate Region 2 in the database
      const region2Id = await regionService.instantiateRegion(completeRegion2, gameId);
      
      // Connect Region 1's locked exit to Region 2's entrance
      const region2Rooms = await db.all('SELECT * FROM rooms WHERE region_id = ? ORDER BY region_distance LIMIT 1', [region2Id]);
      const region2Entrance = region2Rooms[0];
      
      if (region2Entrance) {
        // Find a room in Region 1 that needs a locked connection to Region 2
        // The Ancient Crypt Entrance should have a locked vault door leading to Region 2
        const cryptEntrance = await db.get('SELECT id FROM rooms WHERE name = ? AND game_id = ?', ['Ancient Crypt Entrance', gameId]);
        
        if (cryptEntrance) {
          // Create locked connection from crypt to Region 2 using Vault Key
          await db.run(
            'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, locked, required_key_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [gameId, cryptEntrance.id, region2Entrance.id, 'vault', 'through the ancient vault door to another realm', 1, 'Vault Key']
          );
          
          // Create return connection from Region 2 back to Region 1
          await db.run(
            'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
            [gameId, region2Entrance.id, cryptEntrance.id, 'back', 'back through the vault door to the crypt']
          );
          
          if (tui) {
            tui.display(`🔗 Connected Region 1 (Ancient Crypt Entrance) to Region 2 (${region2Entrance.name})`, MessageType.SYSTEM);
            tui.display(`🗝️ Connection requires Vault Key to unlock`, MessageType.SYSTEM);
          }
        }
      }
      
      if (tui) {
        tui.display(`🏰 Successfully generated Region 2: "${completeRegion2.concept.name}" (ID: ${region2Id})`, MessageType.SYSTEM);
        tui.display(`🏰 Region 2 contains 12 rooms with guardian "${completeRegion2.concept.guardian.name}" and key "${completeRegion2.concept.key.name}"`, MessageType.SYSTEM);
      }
    } catch (error) {
      if (tui) {
        tui.display(`⚠️ Warning: Failed to generate Region 2: ${error}`, MessageType.ERROR);
        tui.display('Game still created successfully with Region 1', MessageType.SYSTEM);
      }
      // Don't fail game creation if Region 2 generation fails
    }

    if (tui) {
      tui.display(`Game "${gameName}" created successfully with ID ${gameId}`, MessageType.SYSTEM);
      tui.display(`Placed ${totalItemsPlaced} items across ${starterRoomItems.length} starter rooms`, MessageType.SYSTEM);
      tui.display(`Placed ${totalCharactersPlaced} characters across ${starterRoomCharacters.length} starter rooms`, MessageType.SYSTEM);
      tui.display('Added validations to 3 starter items', MessageType.SYSTEM);
    }
    return gameId;
  } catch (error) {
    if (tui) {
      tui.display(`Error creating game with rooms: ${error}`, MessageType.ERROR);
    }
    throw error;
  }
}

/**
 * Add validations to specific starter items to demonstrate the validation system
 * @param db Database instance
 * @param gameId Game ID for context
 * @param entranceId Grand Entrance Hall room ID
 * @param tui Optional TUI interface for output
 */

/**
 * Create a new game automatically with timestamp name - no user input required
 */
export async function createGameAutomatic(db: Database, tui?: TUIInterface): Promise<number> {
  return await createGameWithRooms(db, undefined, tui); // Uses timestamp name by default
}

export async function seedDatabase(db: Database, tui?: TUIInterface): Promise<void> {
  // Call the Prisma version
  return seedDatabasePrisma(db, tui);
}

