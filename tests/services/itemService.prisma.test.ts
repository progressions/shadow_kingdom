/**
 * Tests for ItemService Prisma methods
 * These tests verify that the Prisma implementations match the legacy behavior
 */

import { PrismaClient } from '../../src/generated/prisma';
import { ItemServicePrisma } from '../../src/services/itemService.prisma';
import { ItemType } from '../../src/types/item';

describe('ItemService Prisma Implementation', () => {
  let prisma: PrismaClient;
  let itemService: ItemServicePrisma;
  let testItemId: number;
  let testCharacterId: number;
  let testRoomId: number;
  let testGameId: number;

  beforeEach(async () => {
    // Use test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file::memory:'
        }
      }
    });

    // Initialize schema
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
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

    itemService = new ItemServicePrisma(prisma);

    // Create test data
    const game = await prisma.game.create({
      data: { name: 'Test Game' }
    });
    testGameId = game.id;

    const item = await prisma.item.create({
      data: {
        name: 'Test Sword',
        description: 'A test weapon',
        type: ItemType.WEAPON,
        weight: 2.5,
        value: 10
      }
    });
    testItemId = item.id;

    const room = await prisma.room.create({
      data: {
        gameId: testGameId,
        name: 'Test Room',
        description: 'A test room'
      }
    });
    testRoomId = room.id;

    const character = await prisma.character.create({
      data: {
        gameId: testGameId,
        name: 'Test Character',
        type: 'player'
      }
    });
    testCharacterId = character.id;
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  describe('New Prisma Methods', () => {
    describe('getCharacterInventory', () => {
      it('should return empty array for character with no items', async () => {
        const inventory = await itemService.getCharacterInventory(testCharacterId);
        expect(inventory).toEqual([]);
      });

      it('should return inventory items with full details', async () => {
        // Add item to inventory
        await prisma.inventoryItem.create({
          data: {
            characterId: testCharacterId,
            itemId: testItemId,
            quantity: 2
          }
        });

        const inventory = await itemService.getCharacterInventory(testCharacterId);
        
        expect(inventory).toHaveLength(1);
        expect(inventory[0].character_id).toBe(testCharacterId);
        expect(inventory[0].item_id).toBe(testItemId);
        expect(inventory[0].quantity).toBe(2);
        expect(inventory[0].item.name).toBe('Test Sword');
      });
    });

    describe('hasItemByPartialName', () => {
      it('should return false when character has no items', async () => {
        const hasItem = await itemService.hasItemByPartialName(testCharacterId, 'sword');
        expect(hasItem).toBe(false);
      });

      it('should find item by partial name (case insensitive)', async () => {
        // Add item to inventory
        await prisma.inventoryItem.create({
          data: {
            characterId: testCharacterId,
            itemId: testItemId,
            quantity: 1
          }
        });

        const hasItem1 = await itemService.hasItemByPartialName(testCharacterId, 'sword');
        const hasItem2 = await itemService.hasItemByPartialName(testCharacterId, 'SWORD');
        const hasItem3 = await itemService.hasItemByPartialName(testCharacterId, 'Test');
        const hasItem4 = await itemService.hasItemByPartialName(testCharacterId, 'axe');

        expect(hasItem1).toBe(true);
        expect(hasItem2).toBe(true);
        expect(hasItem3).toBe(true);
        expect(hasItem4).toBe(false);
      });
    });

    describe('addItemToCharacter', () => {
      it('should add new item to inventory', async () => {
        await itemService.addItemToCharacter(testCharacterId, testItemId, 3);

        const inventory = await prisma.inventoryItem.findMany({
          where: { characterId: testCharacterId }
        });

        expect(inventory).toHaveLength(1);
        expect(inventory[0].itemId).toBe(testItemId);
        expect(inventory[0].quantity).toBe(3);
      });

      it('should update quantity when adding existing item', async () => {
        // Add initial quantity
        await itemService.addItemToCharacter(testCharacterId, testItemId, 2);
        
        // Add more of the same item
        await itemService.addItemToCharacter(testCharacterId, testItemId, 3);

        const inventory = await prisma.inventoryItem.findMany({
          where: { characterId: testCharacterId }
        });

        expect(inventory).toHaveLength(1);
        expect(inventory[0].quantity).toBe(5); // 2 + 3
      });
    });

    describe('placeItemInRoom', () => {
      it('should add new item to room', async () => {
        await itemService.placeItemInRoom(testRoomId, testItemId, 2);

        const roomItems = await prisma.roomItem.findMany({
          where: { roomId: testRoomId }
        });

        expect(roomItems).toHaveLength(1);
        expect(roomItems[0].itemId).toBe(testItemId);
        expect(roomItems[0].quantity).toBe(2);
      });

      it('should update quantity when placing existing item', async () => {
        await itemService.placeItemInRoom(testRoomId, testItemId, 1);
        await itemService.placeItemInRoom(testRoomId, testItemId, 2);

        const roomItems = await prisma.roomItem.findMany({
          where: { roomId: testRoomId }
        });

        expect(roomItems).toHaveLength(1);
        expect(roomItems[0].quantity).toBe(3); // 1 + 2
      });
    });
  });
});