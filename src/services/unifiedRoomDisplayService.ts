import { OutputInterface } from '../interfaces/outputInterface';
import { MessageType } from '../ui/MessageFormatter';
import { Room, Connection } from './gameStateManager';
import { ItemService } from './itemService';
import { CharacterService } from './characterService';
import { BackgroundGenerationService } from './backgroundGenerationService';
import { Character, CharacterType, CharacterSentiment, getSentimentDescription } from '../types/character';
import { sortDirections } from '../utils/directionSorter';

export interface RoomDisplayServices {
  itemService: ItemService;
  characterService: CharacterService;
  backgroundGenerationService: BackgroundGenerationService;
}

/**
 * UnifiedRoomDisplayService provides a single implementation for displaying room information
 * across different output interfaces (TUI, console, etc.). This eliminates code duplication
 * for the GameController.
 */
export class UnifiedRoomDisplayService {
  
  /**
   * Display complete room information including name, description, exits, items, and characters
   * @param room The room to display
   * @param connections The available connections from this room
   * @param gameId The current game ID
   * @param outputInterface The interface to use for display
   * @param services Required services for retrieving room data
   */
  async displayRoomComplete(
    room: Room,
    connections: Connection[],
    gameId: number,
    outputInterface: OutputInterface,
    services: RoomDisplayServices
  ): Promise<void> {
    try {
      // Display basic room information
      const exitNames = this.formatExitNames(connections);
      outputInterface.displayRoom(room.name, room.description, exitNames);

      // Display items in the room
      await this.displayRoomItems(room.id, outputInterface, services.itemService);

      // Display characters in the room
      await this.displayRoomCharacters(room.id, outputInterface, services.characterService);

      // Trigger background generation
      await this.triggerBackgroundGeneration(room.id, gameId, services.backgroundGenerationService);

    } catch (error) {
      outputInterface.display(`Error displaying room: ${(error as Error)?.message}`, MessageType.ERROR);
    }
  }

  /**
   * Format connection names for display
   * @param connections Array of connections from current room
   * @returns Array of formatted exit names
   */
  private formatExitNames(connections: Connection[]): string[] {
    // Sort connections by direction priority (cardinals first, then alphabetical)
    const directions = connections.map(c => c.direction);
    const sortedDirections = sortDirections(directions);
    
    const sortedConnections = sortedDirections.map(direction => 
      connections.find(c => c.direction === direction)!
    );

    return sortedConnections.map(c => {
      // If name is same as direction, just show direction
      if (c.name === c.direction) {
        return c.direction;
      }
      // Otherwise show thematic name with direction in parentheses
      return `${c.name} (${c.direction})`;
    });
  }

  /**
   * Format character display with sentiment indicators according to Phase 8 spec
   * @param characters Array of characters to format
   * @returns Formatted string for character display
   */
  public formatCharacterDisplay(characters: Character[]): string {
    if (characters.length === 0) {
      return '';
    }

    const lines: string[] = [];
    
    characters.forEach(character => {
      let displayLine = '';
      
      if (character.is_dead) {
        // Dead characters always show skull icon
        displayLine = `💀 ${character.name} 💀 (dead)`;
      } else {
        // Format according to Phase 8 specification
        const sentiment = character.sentiment || CharacterSentiment.INDIFFERENT;
        
        switch (sentiment) {
          case CharacterSentiment.HOSTILE:
            displayLine = `⚔️ ${character.name} ⚔️ (hostile)`;
            break;
          case CharacterSentiment.AGGRESSIVE:
            displayLine = `🗡️ ${character.name} (aggressive)`;
            break;
          case CharacterSentiment.INDIFFERENT:
            displayLine = `👤 ${character.name} (indifferent)`;
            break;
          case CharacterSentiment.FRIENDLY:
            displayLine = `😊 ${character.name} (friendly)`;
            break;
          case CharacterSentiment.ALLIED:
            displayLine = `🤝 ${character.name} (allied)`;
            break;
          default:
            displayLine = `👤 ${character.name} (indifferent)`;
            break;
        }

        // Legacy hostile indicator is no longer needed as is_hostile column has been removed
      }
      
      lines.push(displayLine);
      
      if (character.description) {
        lines.push(`  ${character.description}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Display items present in the room
   * @param roomId The room ID to get items for
   * @param outputInterface The interface to use for display
   * @param itemService Service for retrieving item data
   */
  private async displayRoomItems(
    roomId: number,
    outputInterface: OutputInterface,
    itemService: ItemService
  ): Promise<void> {
    try {
      const roomItems = await itemService.getRoomItems(roomId);
      
      if (roomItems.length > 0) {
        outputInterface.display('', MessageType.NORMAL); // Add spacing
        outputInterface.display('You see:', MessageType.SYSTEM);
        
        roomItems.forEach(roomItem => {
          const quantityText = roomItem.quantity > 1 ? ` x${roomItem.quantity}` : '';
          outputInterface.display(`• ${roomItem.item.name}${quantityText}`, MessageType.NORMAL);
        });
      }
    } catch (error) {
      // Log error but don't break room display
      console.error('Error displaying room items:', error);
    }
  }

  /**
   * Display characters present in the room
   * @param roomId The room ID to get characters for
   * @param outputInterface The interface to use for display
   * @param characterService Service for retrieving character data
   */
  private async displayRoomCharacters(
    roomId: number,
    outputInterface: OutputInterface,
    characterService: CharacterService
  ): Promise<void> {
    try {
      const roomCharacters = await characterService.getRoomCharacters(roomId, CharacterType.PLAYER);
      
      if (roomCharacters.length > 0) {
        outputInterface.display('', MessageType.NORMAL); // Add spacing
        outputInterface.display('Characters present:', MessageType.SYSTEM);
        
        // Use the standardized character display formatting
        const characterDisplayText = this.formatCharacterDisplay(roomCharacters);
        const displayLines = characterDisplayText.split('\n');
        
        displayLines.forEach(line => {
          if (line.trim()) {
            outputInterface.display(line, MessageType.NORMAL);
          }
        });
      }
    } catch (error) {
      // Log error but don't break room display
      console.error('Error displaying room characters:', error);
    }
  }

  /**
   * Trigger background room generation for this room
   * @param roomId The current room ID
   * @param gameId The current game ID
   * @param backgroundGenerationService Service for triggering background generation
   */
  private async triggerBackgroundGeneration(
    roomId: number,
    gameId: number,
    backgroundGenerationService: BackgroundGenerationService
  ): Promise<void> {
    try {
      // Trigger automatic room generation on entry (new auto-generation feature)
      await backgroundGenerationService.generateForRoomEntry(roomId, gameId);
      
      // Trigger background generation for unfilled connections (existing system)
      // Background generation will mark TARGET rooms as processed after expanding them
      await backgroundGenerationService.preGenerateAdjacentRooms(roomId, gameId);
    } catch (error) {
      // Log error but don't break room display
      console.error('Error triggering background generation:', error);
    }
  }
}