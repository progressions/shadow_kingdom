/**
 * Target Resolution Service Tests
 * 
 * Comprehensive test suite for the TargetResolutionService using TDD approach.
 */

import { TargetResolutionService } from '../../src/services/targetResolutionService';
import { 
  TargetContext, 
  EntityType, 
  EntityLocation,
  ResolvedTarget 
} from '../../src/types/targetResolution';
import { ItemService } from '../../src/services/itemService';
import { CharacterService } from '../../src/services/characterService';
import { GameStateManager } from '../../src/services/gameStateManager';
import { ItemType, EquipmentSlot } from '../../src/types/item';
import { CharacterType, CharacterSentiment } from '../../src/types/character';
import Database from '../../src/utils/database';

// Mock dependencies
const mockDb = {} as Database;
const mockItemService = {
  getRoomItems: jest.fn(),
  getCharacterInventory: jest.fn(),
} as unknown as jest.Mocked<ItemService>;

const mockCharacterService = {
  getRoomCharacters: jest.fn(),
} as unknown as jest.Mocked<CharacterService>;

const mockGameStateManager = {} as jest.Mocked<GameStateManager>;

// Enhanced mock data factories for Prisma-compatible test data
const createMockFullItem = (id: number, name: string, type: ItemType, options: Partial<any> = {}): any => ({
  id,
  name,
  description: options.description || `A ${name.toLowerCase()}`,
  type,
  weight: options.weight || 1,
  value: options.value || 10,
  stackable: options.stackable || false,
  max_stack: options.max_stack || 1,
  armor_rating: options.armor_rating,
  equipment_slot: options.equipment_slot,
  is_fixed: options.is_fixed || false,
  created_at: '2024-01-01T00:00:00Z'
});

const createMockRoomItem = (id: number, item_id: number, room_id: number, item: any, options: Partial<any> = {}): any => ({
  id,
  item_id,
  room_id,
  quantity: options.quantity || 1,
  created_at: '2024-01-01T00:00:00Z',
  item
});

const createMockInventoryItem = (id: number, character_id: number, item_id: number, item: any, options: Partial<any> = {}): any => ({
  id,
  character_id,
  item_id,
  quantity: options.quantity || 1,
  equipped: options.equipped || false,
  equipped_slot: options.equipped_slot,
  created_at: '2024-01-01T00:00:00Z',
  item
});

const createMockCharacter = (id: number, name: string, options: Partial<any> = {}): any => ({
  id,
  game_id: options.game_id || 1,
  name,
  description: options.description || `A ${name.toLowerCase()}`,
  type: options.type || CharacterType.NPC,
  current_room_id: options.current_room_id || 1,
  strength: options.strength || 10,
  dexterity: options.dexterity || 10,
  intelligence: options.intelligence || 10,
  constitution: options.constitution || 10,
  wisdom: options.wisdom || 10,
  charisma: options.charisma || 10,
  max_health: options.max_health || 20,
  current_health: options.current_health || 20,
  is_dead: options.is_dead || false,
  sentiment: options.sentiment || CharacterSentiment.FRIENDLY,
  dialogue_response: options.dialogue_response || 'Hello!',
  created_at: '2024-01-01T00:00:00Z'
});

// Legacy helper function for simple mock creation
function createMockItem(id: number, name: string, isFixed = false) {
  return createMockFullItem(id, name, ItemType.MISC, { is_fixed: isFixed });
}

describe('TargetResolutionService', () => {
  let service: TargetResolutionService;
  let mockGameContext: any;

  beforeEach(() => {
    service = new TargetResolutionService(
      mockDb,
      mockItemService,
      mockCharacterService,
      mockGameStateManager
    );

    mockGameContext = {
      currentRoom: { id: 1 },
      characterId: 100,
      gameId: 10,
      sessionId: 'test-session'
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('resolveTargets - Single Target Resolution', () => {
    it('should resolve a single room item by exact name', async () => {
      // Arrange
      const ironSword = createMockFullItem(1, 'Iron Sword', ItemType.WEAPON);
      const healthPotion = createMockFullItem(2, 'Health Potion', ItemType.CONSUMABLE);
      const mockRoomItems = [
        createMockRoomItem(1, 1, 1, ironSword),
        createMockRoomItem(2, 2, 1, healthPotion)
      ];
      mockItemService.getRoomItems.mockResolvedValue(mockRoomItems);

      // Act
      const result = await service.resolveTargets(
        'iron sword',
        TargetContext.ROOM_ITEMS,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Iron Sword');
      expect(result[0].type).toBe(EntityType.ITEM);
      expect(result[0].location).toBe(EntityLocation.ROOM);
      expect(result[0].metadata?.canPickup).toBe(true);
    });

    it('should resolve a single item by partial name match', async () => {
      // Arrange  
      const ancientSword = createMockFullItem(1, 'Ancient Rusty Sword', ItemType.WEAPON);
      const mockRoomItems = [
        createMockRoomItem(1, 1, 1, ancientSword)
      ];
      mockItemService.getRoomItems.mockResolvedValue(mockRoomItems);

      // Act
      const result = await service.resolveTargets(
        'rusty',
        TargetContext.ROOM_ITEMS,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Ancient Rusty Sword');
    });

    it('should strip articles from target name', async () => {
      // Arrange
      const magicOrb = createMockFullItem(1, 'Magic Orb', ItemType.MISC);
      const mockRoomItems = [
        createMockRoomItem(1, 1, 1, magicOrb)
      ];
      mockItemService.getRoomItems.mockResolvedValue(mockRoomItems);

      // Act
      const result = await service.resolveTargets(
        'the magic orb',
        TargetContext.ROOM_ITEMS,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Magic Orb');
    });

    it('should return empty array when target not found', async () => {
      // Arrange
      mockItemService.getRoomItems.mockResolvedValue([]);

      // Act
      const result = await service.resolveTargets(
        'nonexistent item',
        TargetContext.ROOM_ITEMS,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('resolveTargets - All Target Resolution', () => {
    it('should resolve all room items when target is "all"', async () => {
      // Arrange
      const ironSword = createMockFullItem(1, 'Iron Sword', ItemType.WEAPON, { 
        weight: 5, value: 100, equipment_slot: EquipmentSlot.HAND 
      });
      const healthPotion = createMockFullItem(2, 'Health Potion', ItemType.CONSUMABLE, { 
        stackable: true, max_stack: 10 
      });
      const fixedAltar = createMockFullItem(3, 'Fixed Altar', ItemType.MISC, { 
        is_fixed: true, weight: 1000, value: 0 
      });
      
      const mockRoomItems = [
        createMockRoomItem(1, 1, 1, ironSword),
        createMockRoomItem(2, 2, 1, healthPotion, { quantity: 3 }),
        createMockRoomItem(3, 3, 1, fixedAltar)
      ];
      mockItemService.getRoomItems.mockResolvedValue(mockRoomItems);

      // Act
      const result = await service.resolveTargets(
        'all',
        TargetContext.ROOM_ITEMS,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(2); // Fixed items should be filtered out
      expect(result.map(r => r.name)).toContain('Iron Sword');
      expect(result.map(r => r.name)).toContain('Health Potion');
      expect(result.map(r => r.name)).not.toContain('Fixed Altar');
    });

    it('should resolve all inventory items when target is "all" in inventory context', async () => {
      // Arrange
      const healingHerbs = createMockFullItem(4, 'Healing Herbs', ItemType.CONSUMABLE, { 
        weight: 0.5, value: 25, stackable: true, max_stack: 5 
      });
      const magicRing = createMockFullItem(5, 'Magic Ring', ItemType.MISC, { 
        weight: 0.1, value: 500 
      });
      
      const mockInventoryItems = [
        createMockInventoryItem(1, 100, 4, healingHerbs, { quantity: 2 }),
        createMockInventoryItem(2, 100, 5, magicRing, { equipped: true })
      ];
      mockItemService.getCharacterInventory.mockResolvedValue(mockInventoryItems);

      // Act
      const result = await service.resolveTargets(
        'all',
        TargetContext.INVENTORY_ITEMS,
        mockGameContext,
        { includeEquipped: true }
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toContain('Healing Herbs');
      expect(result.map(r => r.name)).toContain('Magic Ring');
      expect(result.every(r => r.location === EntityLocation.INVENTORY)).toBe(true);
    });

    it('should resolve all room characters when target is "all"', async () => {
      // Arrange
      const mockCharacters = [
        createMockCharacter(1, 'Friendly Merchant', { 
          dexterity: 12, intelligence: 15, wisdom: 14, charisma: 16, max_health: 25, current_health: 25,
          sentiment: CharacterSentiment.FRIENDLY, dialogue_response: 'Hello there!'
        }),
        createMockCharacter(2, 'Hostile Goblin', { 
          strength: 14, dexterity: 16, intelligence: 8, wisdom: 9, charisma: 6,
          sentiment: CharacterSentiment.HOSTILE, dialogue_response: 'Grrr!'
        })
      ];
      mockCharacterService.getRoomCharacters.mockResolvedValue(mockCharacters);

      // Act
      const result = await service.resolveTargets(
        'all',
        TargetContext.ROOM_CHARACTERS,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toContain('Friendly Merchant');
      expect(result.map(r => r.name)).toContain('Hostile Goblin');
      expect(result.every(r => r.type === EntityType.CHARACTER)).toBe(true);
    });

    it('should return empty array when "all" context is empty', async () => {
      // Arrange
      mockItemService.getRoomItems.mockResolvedValue([]);

      // Act
      const result = await service.resolveTargets(
        'all',
        TargetContext.ROOM_ITEMS,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('resolveTargets - Character Resolution', () => {
    it('should resolve character by exact name', async () => {
      // Arrange
      const mockCharacters = [
        createMockCharacter(1, 'Merchant Bob', {
          type: CharacterType.NPC,
          sentiment: CharacterSentiment.FRIENDLY
        })
      ];
      mockCharacterService.getRoomCharacters.mockResolvedValue(mockCharacters);

      // Act
      const result = await service.resolveTargets(
        'merchant bob',
        TargetContext.ROOM_CHARACTERS,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Merchant Bob');
      expect(result[0].type).toBe(EntityType.CHARACTER);
      expect(result[0].metadata?.isHostile).toBe(false);
    });

    it('should resolve character by partial name', async () => {
      // Arrange
      const mockCharacters = [
        createMockCharacter(1, 'Wise Old Sage', {
          type: CharacterType.NPC,
          sentiment: CharacterSentiment.FRIENDLY
        })
      ];
      mockCharacterService.getRoomCharacters.mockResolvedValue(mockCharacters);

      // Act
      const result = await service.resolveTargets(
        'sage',
        TargetContext.ROOM_CHARACTERS,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Wise Old Sage');
    });

    it('should identify hostile characters', async () => {
      // Arrange
      const mockCharacters = [
        createMockCharacter(1, 'Evil Wizard', {
          type: CharacterType.NPC,
          sentiment: CharacterSentiment.HOSTILE
        })
      ];
      mockCharacterService.getRoomCharacters.mockResolvedValue(mockCharacters);

      // Act
      const result = await service.resolveTargets(
        'wizard',
        TargetContext.ROOM_CHARACTERS,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].metadata?.isHostile).toBe(true);
    });
  });

  describe('resolveTargets - ANY_ENTITY Context', () => {
    it('should resolve entities from multiple contexts', async () => {
      // Arrange
      const roomSword = createMockFullItem(1, 'Room Sword', ItemType.WEAPON, { is_fixed: false });
      const mockRoomItems = [
        createMockRoomItem(1, 1, 1, roomSword)
      ];
      const inventoryPotion = createMockFullItem(1, 'Inventory Potion', ItemType.CONSUMABLE, { is_fixed: false });
      const mockInventoryItems = [
        createMockInventoryItem(1, 100, 1, inventoryPotion, { equipped: false })
      ];
      const mockCharacters = [
        createMockCharacter(1, 'Room Character', {
          type: CharacterType.NPC,
          sentiment: CharacterSentiment.FRIENDLY
        })
      ];

      mockItemService.getRoomItems.mockResolvedValue(mockRoomItems);
      mockItemService.getCharacterInventory.mockResolvedValue(mockInventoryItems);
      mockCharacterService.getRoomCharacters.mockResolvedValue(mockCharacters);

      // Act
      const result = await service.resolveTargets(
        'all',
        TargetContext.ANY_ENTITY,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map(r => r.name)).toContain('Room Sword');
      expect(result.map(r => r.name)).toContain('Inventory Potion');
      expect(result.map(r => r.name)).toContain('Room Character');
    });
  });

  describe('resolveTargets - Edge Cases', () => {
    it('should handle empty target input', async () => {
      // Act & Assert
      expect(await service.resolveTargets('', TargetContext.ROOM_ITEMS, mockGameContext)).toHaveLength(0);
      expect(await service.resolveTargets('   ', TargetContext.ROOM_ITEMS, mockGameContext)).toHaveLength(0);
    });

    it('should handle case-insensitive matching', async () => {
      // Arrange
      const magicSword = createMockFullItem(1, 'MAGIC SWORD', ItemType.WEAPON, { is_fixed: false });
      const mockRoomItems = [
        createMockRoomItem(1, 1, 1, magicSword)
      ];
      mockItemService.getRoomItems.mockResolvedValue(mockRoomItems);

      // Act
      const result = await service.resolveTargets(
        'magic sword',
        TargetContext.ROOM_ITEMS,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('MAGIC SWORD');
    });

    it('should prefer exact matches over partial matches', async () => {
      // Arrange
      const sword = createMockFullItem(1, 'Sword', ItemType.WEAPON, { is_fixed: false });
      const magicSword = createMockFullItem(2, 'Magic Sword', ItemType.WEAPON, { is_fixed: false });
      const mockRoomItems = [
        createMockRoomItem(1, 1, 1, sword),
        createMockRoomItem(2, 2, 1, magicSword)
      ];
      mockItemService.getRoomItems.mockResolvedValue(mockRoomItems);

      // Act
      const result = await service.resolveTargets(
        'sword',
        TargetContext.ROOM_ITEMS,
        mockGameContext
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sword'); // Exact match preferred
    });
  });

  describe('resolveCharacterTarget', () => {
    it('should resolve character target for give commands', async () => {
      // Arrange
      const mockCharacters = [
        createMockCharacter(1, 'Village Blacksmith', {
          type: CharacterType.NPC,
          sentiment: CharacterSentiment.FRIENDLY
        })
      ];
      mockCharacterService.getRoomCharacters.mockResolvedValue(mockCharacters);

      // Act
      const result = await service.resolveCharacterTarget(
        'blacksmith',
        mockGameContext
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Village Blacksmith');
      expect(result!.type).toBe(EntityType.CHARACTER);
    });

    it('should return null when character not found', async () => {
      // Arrange
      mockCharacterService.getRoomCharacters.mockResolvedValue([]);

      // Act
      const result = await service.resolveCharacterTarget(
        'nonexistent',
        mockGameContext
      );

      // Assert
      expect(result).toBeNull();
    });
  });
});