/**
 * Simple Prisma Integration Test
 * Tests basic Prisma functionality with the Item models
 */

import { PrismaClient } from '../../src/generated/prisma';

describe('Simple Prisma Item Test', () => {
  let prisma: PrismaClient;

  beforeEach(async () => {
    // Use in-memory database for testing
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file::memory:'
        }
      }
    });

    // Initialize minimal schema
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_played_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        extended_description TEXT,
        type TEXT NOT NULL,
        weight REAL DEFAULT 0.0,
        value INTEGER DEFAULT 0,
        stackable BOOLEAN DEFAULT FALSE,
        max_stack INTEGER DEFAULT 1,
        armor_rating INTEGER DEFAULT 0,
        equipment_slot TEXT,
        is_fixed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        region_id INTEGER,
        region_distance INTEGER,
        FOREIGN KEY (game_id) REFERENCES games(id)
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS room_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS characters (
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
        FOREIGN KEY (game_id) REFERENCES games(id)
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS character_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        equipped BOOLEAN DEFAULT FALSE,
        equipped_slot TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES characters(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `;
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  describe('Basic Prisma Operations', () => {
    it('should create and retrieve an item', async () => {
      // Create an item
      const item = await prisma.item.create({
        data: {
          name: 'Test Sword',
          description: 'A test weapon',
          type: 'weapon',
          weight: 2.5,
          value: 100
        }
      });

      expect(item.id).toBeDefined();
      expect(item.name).toBe('Test Sword');

      // Retrieve the item
      const retrievedItem = await prisma.item.findUnique({
        where: { id: item.id }
      });

      expect(retrievedItem).not.toBeNull();
      expect(retrievedItem?.name).toBe('Test Sword');
      expect(retrievedItem?.value).toBe(100);
    });

    it('should manage character inventory', async () => {
      // Create test data
      const game = await prisma.game.create({
        data: { name: `Test Game ${Date.now()}` }
      });

      const character = await prisma.character.create({
        data: {
          gameId: game.id,
          name: 'Test Hero',
          type: 'player'
        }
      });

      const item = await prisma.item.create({
        data: {
          name: 'Health Potion',
          description: 'Restores health',
          type: 'consumable',
          weight: 0.5,
          value: 50
        }
      });

      // Add item to character inventory
      const inventoryEntry = await prisma.characterInventory.create({
        data: {
          characterId: character.id,
          itemId: item.id,
          quantity: 3
        }
      });

      expect(inventoryEntry.quantity).toBe(3);

      // Query character inventory with item details
      const inventory = await prisma.characterInventory.findMany({
        where: { characterId: character.id },
        include: { item: true }
      });

      expect(inventory).toHaveLength(1);
      expect(inventory[0].quantity).toBe(3);
      expect(inventory[0].item.name).toBe('Health Potion');
    });

    it('should manage room items', async () => {
      // Create test data
      const game = await prisma.game.create({
        data: { name: `Test Adventure ${Date.now()}` }
      });

      const room = await prisma.room.create({
        data: {
          gameId: game.id,
          name: 'Treasure Room',
          description: 'A room full of treasures'
        }
      });

      const item = await prisma.item.create({
        data: {
          name: 'Gold Coin',
          description: 'Shiny gold coin',
          type: 'treasure',
          weight: 0.1,
          value: 1,
          stackable: true,
          maxStack: 999
        }
      });

      // Place items in room
      const roomItem = await prisma.roomItem.create({
        data: {
          roomId: room.id,
          itemId: item.id,
          quantity: 50
        }
      });

      expect(roomItem.quantity).toBe(50);

      // Query room items with item details
      const roomItems = await prisma.roomItem.findMany({
        where: { roomId: room.id },
        include: { item: true }
      });

      expect(roomItems).toHaveLength(1);
      expect(roomItems[0].quantity).toBe(50);
      expect(roomItems[0].item.name).toBe('Gold Coin');
      expect(roomItems[0].item.stackable).toBe(true);
    });

    it('should handle item updates', async () => {
      const item = await prisma.item.create({
        data: {
          name: 'Rusty Dagger',
          description: 'An old, worn dagger',
          type: 'weapon',
          weight: 1.0,
          value: 5
        }
      });

      // Update the item
      const updatedItem = await prisma.item.update({
        where: { id: item.id },
        data: {
          name: 'Polished Dagger',
          description: 'A freshly polished dagger',
          value: 15
        }
      });

      expect(updatedItem.name).toBe('Polished Dagger');
      expect(updatedItem.value).toBe(15);
      expect(updatedItem.weight).toBe(1.0); // Unchanged
    });
  });
});