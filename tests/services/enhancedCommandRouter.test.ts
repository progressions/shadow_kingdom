/**
 * Enhanced Command Router Tests
 * 
 * Tests the new target resolution functionality in CommandRouter
 */

import { CommandRouter, EnhancedCommand } from '../../src/services/commandRouter';
import { TargetContext, EntityType, EntityLocation } from '../../src/types/targetResolution';
import { UnifiedNLPEngine } from '../../src/nlp/unifiedNLPEngine';
import { GrokClient } from '../../src/ai/grokClient';
import { ItemService } from '../../src/services/itemService';
import { CharacterService } from '../../src/services/characterService';
import { GameStateManager } from '../../src/services/gameStateManager';
import Database from '../../src/utils/database';

// Mock all dependencies
const mockNLPEngine = {} as UnifiedNLPEngine;
const mockGrokClient = {} as GrokClient;
const mockDb = {} as Database;
const mockItemService = {
  getRoomItems: jest.fn(),
  getCharacterInventory: jest.fn(),
} as unknown as ItemService;
const mockCharacterService = {
  getRoomCharacters: jest.fn(),
} as unknown as CharacterService;
const mockGameStateManager = {} as GameStateManager;

describe('EnhancedCommandRouter', () => {
  let router: CommandRouter;
  let mockGameContext: any;

  beforeEach(() => {
    router = new CommandRouter(
      mockNLPEngine,
      mockGrokClient,
      mockDb,
      mockItemService,
      mockCharacterService,
      mockGameStateManager
    );

    mockGameContext = {
      gameContext: {
        currentRoom: { id: 1 },
        characterId: 100,
        gameId: 10,
        sessionId: 'test-session'
      },
      recentCommands: []
    };

    jest.clearAllMocks();
  });

  it('should register enhanced commands', () => {
    const mockCommand: EnhancedCommand = {
      name: 'pickup',
      description: 'Pick up items',
      targetContext: TargetContext.ROOM_ITEMS,
      supportsAll: true,
      requiresTarget: true,
      handler: jest.fn()
    };

    router.addEnhancedCommand(mockCommand);
    const commands = router.getCommands();
    expect(commands.get('pickup')).toBe(mockCommand);
  });

  it('should process enhanced command with single target resolution', async () => {
    // Arrange
    const mockHandler = jest.fn();
    const mockCommand: EnhancedCommand = {
      name: 'pickup',
      description: 'Pick up items',
      targetContext: TargetContext.ROOM_ITEMS,
      requiresTarget: true,
      handler: mockHandler
    };

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
    router.addEnhancedCommand(mockCommand);

    // Act
    const result = await router.processCommand('pickup iron sword', mockGameContext);

    // Assert
    expect(result).toBe(true);
    expect(mockHandler).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Iron Sword',
          type: EntityType.ITEM,
          location: EntityLocation.ROOM
        })
      ]),
      mockGameContext.gameContext
    );
  });

  it('should process enhanced command with "all" target resolution', async () => {
    // Arrange
    const mockHandler = jest.fn();
    const mockCommand: EnhancedCommand = {
      name: 'pickup',
      description: 'Pick up items',
      targetContext: TargetContext.ROOM_ITEMS,
      supportsAll: true,
      requiresTarget: true,
      handler: mockHandler
    };

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
      }
    ];

    (mockItemService.getRoomItems as jest.Mock).mockResolvedValue(mockRoomItems);
    router.addEnhancedCommand(mockCommand);

    // Act
    const result = await router.processCommand('pickup all', mockGameContext);

    // Assert
    expect(result).toBe(true);
    expect(mockHandler).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Iron Sword',
          type: EntityType.ITEM,
          location: EntityLocation.ROOM
        }),
        expect.objectContaining({
          name: 'Health Potion',
          type: EntityType.ITEM,
          location: EntityLocation.ROOM
        })
      ]),
      mockGameContext.gameContext
    );
  });

  it('should handle missing required target', async () => {
    // Arrange
    const mockHandler = jest.fn();
    const mockCommand: EnhancedCommand = {
      name: 'pickup',
      description: 'Pick up items',
      targetContext: TargetContext.ROOM_ITEMS,
      requiresTarget: true,
      handler: mockHandler
    };

    router.addEnhancedCommand(mockCommand);

    // Act
    const result = await router.processCommand('pickup', mockGameContext);

    // Assert
    expect(result).toBe(false);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should handle target not found', async () => {
    // Arrange
    const mockHandler = jest.fn();
    const mockCommand: EnhancedCommand = {
      name: 'pickup',
      description: 'Pick up items',
      targetContext: TargetContext.ROOM_ITEMS,
      requiresTarget: true,
      handler: mockHandler
    };

    (mockItemService.getRoomItems as jest.Mock).mockResolvedValue([]);
    router.addEnhancedCommand(mockCommand);

    // Act
    const result = await router.processCommand('pickup nonexistent', mockGameContext);

    // Assert
    expect(result).toBe(false);
    expect(mockHandler).not.toHaveBeenCalled();
  });
});