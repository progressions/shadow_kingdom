/**
 * Drop All Command Demonstration
 * 
 * This test demonstrates how easy it is to add "drop all" support 
 * using the new Target Disambiguation Service and Enhanced Command Router.
 */

import { CommandRouter, EnhancedCommand } from '../../src/services/commandRouter';
import { TargetContext, EntityType, EntityLocation, ResolvedTarget } from '../../src/types/targetResolution';
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
const mockGameStateManager = {
  getCurrentCharacterId: jest.fn().mockResolvedValue(100),
  getCurrentSession: jest.fn().mockReturnValue({ gameId: 10, roomId: 1 })
} as unknown as GameStateManager;

describe('Drop All Command Demonstration', () => {
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
        sessionId: 'demo-session'
      },
      recentCommands: []
    };

    jest.clearAllMocks();
  });

  it('should easily add drop all functionality using enhanced commands', async () => {
    // This is how easy it is to add "drop all" with the new system!
    
    const mockDroppedItems: string[] = [];
    
    // Define the enhanced drop command with target resolution
    const dropCommand: EnhancedCommand = {
      name: 'drop',
      description: 'Drop items from your inventory',
      targetContext: TargetContext.INVENTORY_ITEMS,  // Look in inventory
      supportsAll: true,                             // Support "drop all"
      requiresTarget: true,                          // Must specify what to drop
      handler: async (targets: ResolvedTarget[]) => {
        // Handler receives pre-resolved targets - no resolution logic needed!
        for (const target of targets) {
          mockDroppedItems.push(target.name);
          // In real implementation: await itemService.moveItemToRoom(target.entity.id, currentRoomId);
        }
      }
    };

    // Mock inventory items
    const mockInventoryItems = [
      {
        id: 1,
        character_id: 100,
        item_id: 201,
        quantity: 1,
        equipped: false,
        created_at: '2025-01-01',
        item: {
          id: 201,
          name: 'Iron Sword',
          description: 'A heavy sword',
          type: 'weapon' as any,
          weight: 5,
          value: 100,
          stackable: false,
          max_stack: 1,
          is_fixed: false,
          created_at: '2025-01-01'
        }
      },
      {
        id: 2,
        character_id: 100,
        item_id: 202,
        quantity: 1,
        equipped: false,
        created_at: '2025-01-01',
        item: {
          id: 202,
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
      {
        id: 3,
        character_id: 100,
        item_id: 203,
        quantity: 1,
        equipped: true, // This should be excluded from "all" by default
        created_at: '2025-01-01',
        item: {
          id: 203,
          name: 'Magic Ring',
          description: 'An equipped ring',
          type: 'jewelry' as any,
          weight: 0.1,
          value: 500,
          stackable: false,
          max_stack: 1,
          is_fixed: false,
          created_at: '2025-01-01'
        }
      }
    ];

    (mockItemService.getCharacterInventory as jest.Mock).mockResolvedValue(mockInventoryItems);
    router.addEnhancedCommand(dropCommand);

    // Test single item drop
    const singleResult = await router.processCommand('drop iron sword', mockGameContext);
    expect(singleResult).toBe(true);
    expect(mockDroppedItems).toContain('Iron Sword');

    // Test drop all - the magic happens here!
    mockDroppedItems.length = 0; // Clear previous results
    const allResult = await router.processCommand('drop all', mockGameContext);
    
    expect(allResult).toBe(true);
    expect(mockDroppedItems).toHaveLength(2); // Should exclude equipped ring
    expect(mockDroppedItems).toContain('Iron Sword');
    expect(mockDroppedItems).toContain('Health Potion');
    expect(mockDroppedItems).not.toContain('Magic Ring'); // Equipped items excluded
  });

  it('should demonstrate the minimal code required for drop all vs old approach', async () => {
    // This test shows the difference between the old way and new way
    
    // OLD WAY (what we would have needed before):
    // - Duplicate target resolution logic
    // - Manual "all" keyword checking
    // - Manual inventory filtering
    // - Article stripping
    // - Error handling for each scenario
    // TOTAL: ~50+ lines of complex logic per command

    // NEW WAY (what we actually need):
    const dropCommand: EnhancedCommand = {
      name: 'drop',
      description: 'Drop items',
      targetContext: TargetContext.INVENTORY_ITEMS,
      supportsAll: true,
      requiresTarget: true,
      handler: async (targets: ResolvedTarget[]) => {
        // Just handle the action - resolution is done automatically!
        targets.map(target => target.name);
      }
    };
    // TOTAL: ~10 lines of clean action logic

    expect(dropCommand).toBeDefined();
    expect(dropCommand.supportsAll).toBe(true);
    expect(dropCommand.targetContext).toBe(TargetContext.INVENTORY_ITEMS);
  });

  it('should show how to add other bulk commands easily', async () => {
    // With the new system, adding bulk commands is trivial:

    const examineAllCommand: EnhancedCommand = {
      name: 'examine',
      description: 'Examine entities',
      targetContext: TargetContext.ANY_ENTITY,  // Can examine anything
      supportsAll: true,
      requiresTarget: true,
      handler: async (targets: ResolvedTarget[]) => {
        // In real implementation, display examination results
        targets.forEach(t => {
          console.log(`You examine ${t.name}: ${t.entity.description || 'Nothing special.'}`);
        });
      }
    };

    const attackAllCommand: EnhancedCommand = {
      name: 'attack',
      description: 'Attack characters',
      targetContext: TargetContext.ROOM_CHARACTERS,  // Only characters
      supportsAll: false, // Maybe we don't want "attack all" for game balance
      requiresTarget: true,
      maxTargets: 1, // Limit to single target
      handler: async (targets: ResolvedTarget[]) => {
        // In real implementation, perform attack
        console.log(`You attack ${targets[0].name}!`);
      }
    };

    // These commands now automatically get:
    // - Target resolution
    // - Partial name matching  
    // - Article stripping
    // - Context-appropriate filtering
    // - Error handling
    // - Consistent behavior

    expect(examineAllCommand.supportsAll).toBe(true);
    expect(attackAllCommand.supportsAll).toBe(false);
    expect(attackAllCommand.maxTargets).toBe(1);
  });
});