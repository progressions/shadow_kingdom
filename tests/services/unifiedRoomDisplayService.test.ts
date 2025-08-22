import { UnifiedRoomDisplayService, RoomDisplayServices } from '../../src/services/unifiedRoomDisplayService';
import { OutputInterface } from '../../src/interfaces/outputInterface';
import { MessageType } from '../../src/ui/MessageFormatter';
import { Room, Connection } from '../../src/services/gameStateManager';
import { ItemService } from '../../src/services/itemService';
import { CharacterService } from '../../src/services/characterService';
import { BackgroundGenerationService } from '../../src/services/backgroundGenerationService';
import { RoomItem, ItemType } from '../../src/types/item';
import { Character, CharacterType, CharacterSentiment } from '../../src/types/character';

// Mock output interface to capture calls
class MockOutputInterface implements OutputInterface {
  public displayCalls: Array<{ message: string; type?: MessageType }> = [];
  public displayRoomCalls: Array<{ name: string; description: string; exits: string[] }> = [];

  display(message: string, type?: MessageType): void {
    this.displayCalls.push({ message, type });
  }

  displayRoom(name: string, description: string, exits: string[]): void {
    this.displayRoomCalls.push({ name, description, exits });
  }

  reset(): void {
    this.displayCalls = [];
    this.displayRoomCalls = [];
  }
}

describe('UnifiedRoomDisplayService', () => {
  let service: UnifiedRoomDisplayService;
  let mockOutput: MockOutputInterface;
  let mockItemService: jest.Mocked<ItemService>;
  let mockCharacterService: jest.Mocked<CharacterService>;
  let mockBackgroundService: jest.Mocked<BackgroundGenerationService>;
  let services: RoomDisplayServices;

  const testRoom: Room = {
    id: 1,
    name: 'Test Chamber',
    description: 'A mysterious chamber filled with ancient artifacts.',
    game_id: 1
  };

  const testConnections: Connection[] = [
    {
      id: 1,
      game_id: 1,
      from_room_id: 1,
      to_room_id: 2,
      direction: 'north',
      name: 'Glowing Portal'
    },
    {
      id: 2,
      game_id: 1,
      from_room_id: 1,
      to_room_id: 3,
      direction: 'east',
      name: 'east'
    }
  ];

  beforeEach(() => {
    service = new UnifiedRoomDisplayService();
    mockOutput = new MockOutputInterface();

    // Create mocked services
    mockItemService = {
      getRoomItems: jest.fn()
    } as any;

    mockCharacterService = {
      getRoomCharacters: jest.fn()
    } as any;

    mockBackgroundService = {
      preGenerateAdjacentRooms: jest.fn(),
      generateForRoomEntry: jest.fn()
    } as any;

    services = {
      itemService: mockItemService,
      characterService: mockCharacterService,
      backgroundGenerationService: mockBackgroundService
    };

    // Setup default return values
    mockItemService.getRoomItems.mockResolvedValue([]);
    mockCharacterService.getRoomCharacters.mockResolvedValue([]);
    mockBackgroundService.preGenerateAdjacentRooms.mockResolvedValue();
    mockBackgroundService.generateForRoomEntry.mockResolvedValue();
  });

  describe('displayRoomComplete', () => {
    test('should display basic room information correctly', async () => {
      await service.displayRoomComplete(testRoom, testConnections, 1, mockOutput, services);

      expect(mockOutput.displayRoomCalls).toHaveLength(1);
      const roomCall = mockOutput.displayRoomCalls[0];
      
      expect(roomCall.name).toBe('Test Chamber');
      expect(roomCall.description).toBe('A mysterious chamber filled with ancient artifacts.');
      expect(roomCall.exits).toEqual(['Glowing Portal (north)', 'east']);
    });

    test('should format exit names correctly', async () => {
      const connections: Connection[] = [
        {
          id: 1,
          game_id: 1,
          from_room_id: 1,
          to_room_id: 2,
          direction: 'north',
          name: 'Crystal Archway'
        },
        {
          id: 2,
          game_id: 1,
          from_room_id: 1,
          to_room_id: 3,
          direction: 'south',
          name: 'south'  // Same as direction
        }
      ];

      await service.displayRoomComplete(testRoom, connections, 1, mockOutput, services);

      const roomCall = mockOutput.displayRoomCalls[0];
      expect(roomCall.exits).toEqual(['Crystal Archway (north)', 'south']);
    });

    test('should display room items when present', async () => {
      const roomItems: RoomItem[] = [
        {
          id: 1,
          room_id: 1,
          item_id: 1,
          quantity: 1,
          created_at: '2024-01-01T00:00:00Z',
          item: {
            id: 1,
            name: 'Ancient Scroll',
            description: 'A scroll with mystical writings',
            weight: 0.5,
            type: ItemType.MISC,
            value: 10,
            stackable: false,
            max_stack: 1,
            created_at: '2024-01-01T00:00:00Z'
          }
        },
        {
          id: 2,
          room_id: 1,
          item_id: 2,
          quantity: 3,
          created_at: '2024-01-01T00:00:00Z',
          item: {
            id: 2,
            name: 'Golden Coin',
            description: 'A shiny golden coin',
            weight: 0.1,
            type: ItemType.MISC,
            value: 1,
            stackable: true,
            max_stack: 100,
            created_at: '2024-01-01T00:00:00Z'
          }
        }
      ];

      mockItemService.getRoomItems.mockResolvedValue(roomItems);

      await service.displayRoomComplete(testRoom, testConnections, 1, mockOutput, services);

      // Check that item display messages were called
      const displayCalls = mockOutput.displayCalls;
      
      // Should have: spacing, "You see:", item 1, item 2
      expect(displayCalls).toContainEqual({ message: '', type: MessageType.NORMAL });
      expect(displayCalls).toContainEqual({ message: 'You see:', type: MessageType.SYSTEM });
      expect(displayCalls).toContainEqual({ message: '• Ancient Scroll', type: MessageType.NORMAL });
      expect(displayCalls).toContainEqual({ message: '• Golden Coin x3', type: MessageType.NORMAL });
    });

    test('should display room characters when present', async () => {
      const roomCharacters: Character[] = [
        {
          id: 1,
          name: 'Friendly Merchant',
          description: 'A jovial merchant with a wide smile',
          type: CharacterType.NPC,
          current_room_id: 1,
          game_id: 1,
          current_health: 100,
          max_health: 100,
          strength: 10,
          dexterity: 12,
          constitution: 11,
          intelligence: 14,
          wisdom: 13,
          charisma: 16,
          sentiment: CharacterSentiment.FRIENDLY,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          name: 'Goblin Warrior',
          description: 'A snarling goblin with rusty weapons',
          type: CharacterType.ENEMY,
          current_room_id: 1,
          game_id: 1,
          current_health: 25,
          max_health: 25,
          strength: 14,
          dexterity: 13,
          constitution: 12,
          intelligence: 8,
          wisdom: 10,
          charisma: 6,
          sentiment: CharacterSentiment.AGGRESSIVE,
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockCharacterService.getRoomCharacters.mockResolvedValue(roomCharacters);

      await service.displayRoomComplete(testRoom, testConnections, 1, mockOutput, services);

      // Check that character display messages were called
      const displayCalls = mockOutput.displayCalls;
      
      expect(displayCalls).toContainEqual({ message: '', type: MessageType.NORMAL });
      expect(displayCalls).toContainEqual({ message: 'Characters present:', type: MessageType.SYSTEM });
      expect(displayCalls).toContainEqual({ message: '👤 Friendly Merchant 😊 (friendly)', type: MessageType.NORMAL });
      expect(displayCalls).toContainEqual({ message: '  A jovial merchant with a wide smile', type: MessageType.NORMAL });
      expect(displayCalls).toContainEqual({ message: '⚔️ Goblin Warrior 😠 (aggressive)', type: MessageType.NORMAL });
      expect(displayCalls).toContainEqual({ message: '  A snarling goblin with rusty weapons', type: MessageType.NORMAL });
    });

    test('should not display items section when room is empty', async () => {
      mockItemService.getRoomItems.mockResolvedValue([]);

      await service.displayRoomComplete(testRoom, testConnections, 1, mockOutput, services);

      const displayCalls = mockOutput.displayCalls;
      
      // Should not contain "You see:" message
      expect(displayCalls).not.toContainEqual(
        expect.objectContaining({ message: 'You see:' })
      );
    });

    test('should not display characters section when no characters present', async () => {
      mockCharacterService.getRoomCharacters.mockResolvedValue([]);

      await service.displayRoomComplete(testRoom, testConnections, 1, mockOutput, services);

      const displayCalls = mockOutput.displayCalls;
      
      // Should not contain "Characters present:" message
      expect(displayCalls).not.toContainEqual(
        expect.objectContaining({ message: 'Characters present:' })
      );
    });

    test('should trigger background generation', async () => {
      await service.displayRoomComplete(testRoom, testConnections, 1, mockOutput, services);

      expect(mockBackgroundService.generateForRoomEntry).toHaveBeenCalledWith(1, 1);
      expect(mockBackgroundService.generateForRoomEntry).toHaveBeenCalledTimes(1);
      expect(mockBackgroundService.preGenerateAdjacentRooms).toHaveBeenCalledWith(1, 1);
      expect(mockBackgroundService.preGenerateAdjacentRooms).toHaveBeenCalledTimes(1);
    });

    test('should handle item service errors gracefully', async () => {
      mockItemService.getRoomItems.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.displayRoomComplete(testRoom, testConnections, 1, mockOutput, services);

      // Should still display room and not throw
      expect(mockOutput.displayRoomCalls).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith('Error displaying room items:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should handle character service errors gracefully', async () => {
      mockCharacterService.getRoomCharacters.mockRejectedValue(new Error('Character fetch failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.displayRoomComplete(testRoom, testConnections, 1, mockOutput, services);

      // Should still display room and not throw
      expect(mockOutput.displayRoomCalls).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith('Error displaying room characters:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should handle background generation errors gracefully', async () => {
      mockBackgroundService.preGenerateAdjacentRooms.mockRejectedValue(new Error('Generation failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.displayRoomComplete(testRoom, testConnections, 1, mockOutput, services);

      // Should still display room and not throw
      expect(mockOutput.displayRoomCalls).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith('Error triggering background generation:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should handle complete service failure gracefully', async () => {
      // Make room display itself fail
      const faultyOutput: OutputInterface = {
        display: jest.fn(),
        displayRoom: jest.fn().mockImplementation(() => {
          throw new Error('Display failed');
        })
      };

      await service.displayRoomComplete(testRoom, testConnections, 1, faultyOutput, services);

      // Should call display with error message
      expect(faultyOutput.display).toHaveBeenCalledWith(
        'Error displaying room: Display failed',
        MessageType.ERROR
      );
    });
  });
});