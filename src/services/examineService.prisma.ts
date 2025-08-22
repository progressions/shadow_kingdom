/**
 * ExamineService - Prisma Version
 * 
 * Universal examine system that allows players to examine characters, items, and exits
 * using natural language queries with fuzzy matching and comprehensive search.
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';
import { CharacterServicePrisma } from './characterService.prisma';
import { ItemServicePrisma } from './itemService.prisma';
import { Character } from '../types/character';
import { InventoryItem, RoomItem } from '../types/item';

export interface ExamineTarget {
  type: 'character' | 'room_item' | 'inventory_item' | 'exit' | 'room';
  id?: number;
  name: string;
  description: string;
  metadata?: any;
}

export class ExamineServicePrisma {
  private prisma: PrismaClient;

  constructor(
    private characterService: CharacterServicePrisma,
    private itemService: ItemServicePrisma,
    prismaClient?: PrismaClient
  ) {
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Find and return an examinable target based on search terms
   * @param searchTerms The terms to search for
   * @param currentRoomId The room the character is in
   * @param characterId The character performing the examination
   * @returns ExamineTarget or null if not found
   */
  async findExaminableTarget(
    searchTerms: string,
    currentRoomId: number,
    characterId: number
  ): Promise<ExamineTarget | null> {
    const lowerSearchTerms = searchTerms.toLowerCase().trim();
    
    if (!lowerSearchTerms) {
      return null;
    }

    // Priority order: characters > room items > inventory items > exits
    // This matches the most likely player intent
    
    // 1. Check for characters in the room
    const characterTarget = await this.findCharacterTarget(lowerSearchTerms, currentRoomId);
    if (characterTarget) {
      return characterTarget;
    }

    // 2. Check for items in the room
    const roomItemTarget = await this.findRoomItemTarget(lowerSearchTerms, currentRoomId);
    if (roomItemTarget) {
      return roomItemTarget;
    }

    // 3. Check for items in character's inventory
    const inventoryTarget = await this.findInventoryItemTarget(lowerSearchTerms, characterId);
    if (inventoryTarget) {
      return inventoryTarget;
    }

    // 4. Check for exits/connections
    const exitTarget = await this.findExitTarget(lowerSearchTerms, currentRoomId);
    if (exitTarget) {
      return exitTarget;
    }

    return null;
  }

  /**
   * Find character targets in the current room
   */
  private async findCharacterTarget(searchTerms: string, roomId: number): Promise<ExamineTarget | null> {
    try {
      const characters = await this.characterService.getRoomCharacters(roomId);
      
      // Find exact name match first
      let match = characters.find(char => 
        char.name.toLowerCase() === searchTerms
      );
      
      // If no exact match, try partial matching
      if (!match) {
        match = characters.find(char => 
          char.name.toLowerCase().includes(searchTerms) ||
          searchTerms.includes(char.name.toLowerCase())
        );
      }

      if (match) {
        return {
          type: 'character',
          id: match.id,
          name: match.name,
          description: match.description || `You see ${match.name}.`,
          metadata: {
            character: match,
            isHostile: match.is_hostile,
            isDead: match.is_dead
          }
        };
      }

      return null;
    } catch (error) {
      console.debug('Character search failed:', error);
      return null;
    }
  }

  /**
   * Find item targets in the current room
   */
  private async findRoomItemTarget(searchTerms: string, roomId: number): Promise<ExamineTarget | null> {
    try {
      const roomItems = await this.itemService.getRoomItems(roomId);
      
      // Find exact name match first
      let match = roomItems.find(roomItem => 
        roomItem.item.name.toLowerCase() === searchTerms
      );
      
      // If no exact match, try partial matching
      if (!match) {
        match = roomItems.find(roomItem => 
          roomItem.item.name.toLowerCase().includes(searchTerms) ||
          searchTerms.includes(roomItem.item.name.toLowerCase())
        );
      }

      if (match) {
        return {
          type: 'room_item',
          id: match.item.id,
          name: match.item.name,
          description: match.item.description,
          metadata: {
            item: match.item,
            quantity: match.quantity,
            location: 'room'
          }
        };
      }

      return null;
    } catch (error) {
      console.debug('Room item search failed:', error);
      return null;
    }
  }

  /**
   * Find item targets in character's inventory
   */
  private async findInventoryItemTarget(searchTerms: string, characterId: number): Promise<ExamineTarget | null> {
    try {
      const inventoryItems = await this.itemService.getInventoryItems(characterId);
      
      // Find exact name match first
      let match = inventoryItems.find(invItem => 
        invItem.item.name.toLowerCase() === searchTerms
      );
      
      // If no exact match, try partial matching
      if (!match) {
        match = inventoryItems.find(invItem => 
          invItem.item.name.toLowerCase().includes(searchTerms) ||
          searchTerms.includes(invItem.item.name.toLowerCase())
        );
      }

      if (match) {
        return {
          type: 'inventory_item',
          id: match.item.id,
          name: match.item.name,
          description: match.item.description,
          metadata: {
            item: match.item,
            quantity: match.quantity,
            location: 'inventory'
          }
        };
      }

      return null;
    } catch (error) {
      console.debug('Inventory item search failed:', error);
      return null;
    }
  }

  /**
   * Find exit/connection targets from the current room
   */
  private async findExitTarget(searchTerms: string, roomId: number): Promise<ExamineTarget | null> {
    try {
      const connections = await this.prisma.connection.findMany({
        where: { from_room_id: roomId }
      });
      
      // Find exact match by direction or name first
      let match = connections.find(conn => 
        (conn.direction && conn.direction.toLowerCase() === searchTerms) ||
        conn.name.toLowerCase() === searchTerms
      );
      
      // If no exact match, try partial matching
      if (!match) {
        match = connections.find(conn => 
          (conn.direction && conn.direction.toLowerCase().includes(searchTerms)) ||
          conn.name.toLowerCase().includes(searchTerms) ||
          searchTerms.includes(conn.name.toLowerCase())
        );
      }

      if (match) {
        return {
          type: 'exit',
          id: match.id,
          name: match.name,
          description: `A ${match.name} leading ${match.direction || 'somewhere'}.`,
          metadata: {
            connection: match,
            direction: match.direction,
            isLocked: false // Would need to implement locking system
          }
        };
      }

      return null;
    } catch (error) {
      console.debug('Exit search failed:', error);
      return null;
    }
  }

  /**
   * Generate detailed examination text for a target
   */
  generateExaminationText(target: ExamineTarget): string {
    let text = `**${target.name}**\n\n${target.description}`;

    // Add type-specific details
    switch (target.type) {
      case 'character':
        if (target.metadata?.character) {
          const char = target.metadata.character as Character;
          if (char.is_hostile) {
            text += '\n\n*This character appears hostile.*';
          }
          if (char.is_dead) {
            text += '\n\n*This character is dead.*';
          }
        }
        break;

      case 'room_item':
      case 'inventory_item':
        if (target.metadata?.item) {
          const item = target.metadata.item;
          if (target.metadata.quantity > 1) {
            text += `\n\n*Quantity: ${target.metadata.quantity}*`;
          }
          if (item.type) {
            text += `\n*Type: ${item.type}*`;
          }
          if (item.weight) {
            text += `\n*Weight: ${item.weight} lbs*`;
          }
          if (item.value) {
            text += `\n*Value: ${item.value} gold*`;
          }
        }
        break;

      case 'exit':
        if (target.metadata?.direction) {
          text += `\n\n*Direction: ${target.metadata.direction}*`;
        }
        break;
    }

    return text;
  }

  /**
   * Check if a target name matches search terms (utility method)
   */
  private matchesSearchTerms(targetName: string, searchTerms: string): boolean {
    const target = targetName.toLowerCase();
    const search = searchTerms.toLowerCase();
    
    // Exact match
    if (target === search) return true;
    
    // Contains match
    if (target.includes(search) || search.includes(target)) return true;
    
    // Word boundary matching for better partial matches
    const targetWords = target.split(/\s+/);
    const searchWords = search.split(/\s+/);
    
    return searchWords.some(searchWord => 
      targetWords.some(targetWord => 
        targetWord.startsWith(searchWord) || searchWord.startsWith(targetWord)
      )
    );
  }
}