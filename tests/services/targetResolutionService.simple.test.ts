/**
 * Simple Target Resolution Service Tests - TDD Red Phase
 */

import { TargetResolutionService } from '../../src/services/targetResolutionService';
import { TargetContext, EntityType, EntityLocation } from '../../src/types/targetResolution';
import { ItemService } from '../../src/services/itemService';
import { CharacterService } from '../../src/services/characterService';
import { GameStateManager } from '../../src/services/gameStateManager';
import Database from '../../src/utils/database';

// Simple mocks
const mockDb = {} as Database;
const mockItemService = {
  getRoomItems: jest.fn(),
  getCharacterInventory: jest.fn(),
} as unknown as ItemService;

const mockCharacterService = {
  getRoomCharacters: jest.fn(),
} as unknown as CharacterService;

const mockGameStateManager = {} as GameStateManager;

describe('TargetResolutionService - Basic TDD', () => {
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

    jest.clearAllMocks();
  });

  it('should exist', () => {
    expect(service).toBeDefined();
  });

  it('should return empty array for empty target input', async () => {
    const result = await service.resolveTargets('', TargetContext.ROOM_ITEMS, mockGameContext);
    expect(result).toEqual([]);
  });

  it('should return empty array for whitespace-only target input', async () => {
    const result = await service.resolveTargets('   ', TargetContext.ROOM_ITEMS, mockGameContext);
    expect(result).toEqual([]);
  });

  it('should resolve a single room item by exact name', async () => {
    // Arrange
    const mockRoomItem = {
      id: 1,
      item_id: 123,
      room_id: 1,
      quantity: 1,
      created_at: '2025-01-01',
      item: {
        id: 123,
        name: 'Iron Sword',
        description: 'A sturdy iron sword',
        type: 'weapon' as any,
        weight: 3,
        value: 100,
        stackable: false,
        max_stack: 1,
        is_fixed: false,
        created_at: '2025-01-01'
      }
    };

    (mockItemService.getRoomItems as jest.Mock).mockResolvedValue([mockRoomItem]);

    // Act
    const result = await service.resolveTargets('iron sword', TargetContext.ROOM_ITEMS, mockGameContext);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Iron Sword');
    expect(result[0].type).toBe(EntityType.ITEM);
    expect(result[0].location).toBe(EntityLocation.ROOM);
    expect(result[0].metadata?.canPickup).toBe(true);
  });

  it('should return empty array when no targets found', async () => {
    // Arrange
    (mockItemService.getRoomItems as jest.Mock).mockResolvedValue([]);

    // Act
    const result = await service.resolveTargets('nonexistent sword', TargetContext.ROOM_ITEMS, mockGameContext);

    // Assert
    expect(result).toEqual([]);
  });

  it('should resolve all room items when target is "all"', async () => {
    // Arrange
    const mockRoomItems = [
      {
        id: 1,
        item_id: 123,
        room_id: 1,
        quantity: 1,
        created_at: '2025-01-01',
        item: {
          id: 123,
          name: 'Iron Sword',
          description: 'A sturdy iron sword',
          type: 'weapon' as any,
          weight: 3,
          value: 100,
          stackable: false,
          max_stack: 1,
          is_fixed: false,
          created_at: '2025-01-01'
        }
      },
      {
        id: 2,
        item_id: 124,
        room_id: 1,
        quantity: 1,
        created_at: '2025-01-01',
        item: {
          id: 124,
          name: 'Health Potion',
          description: 'A healing potion',
          type: 'consumable' as any,
          weight: 0.5,
          value: 25,
          stackable: true,
          max_stack: 10,
          is_fixed: false,
          created_at: '2025-01-01'
        }
      },
      // Fixed item that should be filtered out
      {
        id: 3,
        item_id: 125,
        room_id: 1,
        quantity: 1,
        created_at: '2025-01-01',
        item: {
          id: 125,
          name: 'Ancient Altar',
          description: 'A fixed altar',
          type: 'misc' as any,
          weight: 1000,
          value: 0,
          stackable: false,
          max_stack: 1,
          is_fixed: true,
          created_at: '2025-01-01'
        }
      }
    ];

    (mockItemService.getRoomItems as jest.Mock).mockResolvedValue(mockRoomItems);

    // Act
    const result = await service.resolveTargets('all', TargetContext.ROOM_ITEMS, mockGameContext);

    // Assert
    expect(result).toHaveLength(2); // Should exclude fixed items
    expect(result.map(r => r.name)).toContain('Iron Sword');
    expect(result.map(r => r.name)).toContain('Health Potion');
    expect(result.map(r => r.name)).not.toContain('Ancient Altar');
    expect(result.every(r => r.type === EntityType.ITEM)).toBe(true);
    expect(result.every(r => r.location === EntityLocation.ROOM)).toBe(true);
  });
});