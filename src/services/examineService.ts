/**
 * Examine Service
 * 
 * Provides universal examination functionality for all game entities.
 * Allows players to use "look at <target>" or "examine <target>" commands
 * to get detailed information about characters, items, and room features.
 */

import Database from '../utils/database';
import { PrismaService } from './prismaService';
import { PrismaClient } from '../generated/prisma';
import { CharacterService } from './characterService';
import { ItemService } from './itemService';
import { Character } from '../types/character';
import { Item, InventoryItem, RoomItem } from '../types/item';
import { Connection } from './gameStateManager';
import { stripArticles } from '../utils/articleParser';

export interface ExaminableTarget {
  id: string;
  name: string;
  type: 'character' | 'room_item' | 'inventory_item' | 'exit';
  data: Character | RoomItem | InventoryItem | Connection;
}

export class ExamineService {
  private prisma: PrismaClient;

  constructor(
    private db: Database, // Keep for backward compatibility
    private characterService: CharacterService,
    private itemService: ItemService
  ) {
    this.prisma = PrismaService.getInstance().getClient();
  }

  /**
   * Find an examinable target by name in the current context
   */
  async findExaminableTarget(
    roomId: number,
    gameId: number,
    characterId: number,
    targetName: string
  ): Promise<ExaminableTarget | null> {
    const cleanTargetName = stripArticles(targetName.toLowerCase().trim());

    // Search characters first
    const character = await this.findCharacterTarget(roomId, gameId, cleanTargetName);
    if (character) return character;

    // Search inventory items (higher priority than room items)
    const inventoryItem = await this.findInventoryItemTarget(characterId, cleanTargetName);
    if (inventoryItem) return inventoryItem;

    // Search room items
    const roomItem = await this.findRoomItemTarget(roomId, cleanTargetName);
    if (roomItem) return roomItem;

    // Search room exits
    const exit = await this.findExitTarget(roomId, cleanTargetName);
    if (exit) return exit;

    return null;
  }

  /**
   * Generate examination text for a target
   */
  getExaminationText(target: ExaminableTarget): string {
    switch (target.type) {
      case 'character':
        return this.getCharacterExamination(target.data as Character);
      case 'room_item':
        return this.getRoomItemExamination(target.data as RoomItem);
      case 'inventory_item':
        return this.getInventoryItemExamination(target.data as InventoryItem);
      case 'exit':
        return this.getExitExamination(target.data as Connection);
      default:
        return `You examine the ${target.name} closely but don't notice anything special.`;
    }
  }

  /**
   * Find character targets in the current room
   */
  private async findCharacterTarget(
    roomId: number, 
    gameId: number, 
    targetName: string
  ): Promise<ExaminableTarget | null> {
    try {
      const characters = await this.characterService.getRoomCharacters(roomId);
      const character = characters.find((char: Character) => 
        char.name.toLowerCase().includes(targetName)
      );

      if (character) {
        return {
          id: character.id.toString(),
          name: character.name,
          type: 'character',
          data: character
        };
      }
    } catch (error) {
      // If method doesn't exist or fails, continue silently
      console.debug('Character search failed:', error);
    }

    return null;
  }

  /**
   * Find item targets in the current room
   */
  private async findRoomItemTarget(
    roomId: number,
    targetName: string
  ): Promise<ExaminableTarget | null> {
    try {
      const roomItems = await this.itemService.getRoomItems(roomId);
      const roomItem = roomItems.find(item => 
        item.item.name.toLowerCase().includes(targetName)
      );

      if (roomItem) {
        return {
          id: `room_item_${roomItem.id}`,
          name: roomItem.item.name,
          type: 'room_item',
          data: roomItem
        };
      }
    } catch (error) {
      console.debug('Room item search failed:', error);
    }

    return null;
  }

  /**
   * Find item targets in the character's inventory
   */
  private async findInventoryItemTarget(
    characterId: number,
    targetName: string
  ): Promise<ExaminableTarget | null> {
    try {
      const inventoryItems = await this.itemService.getCharacterInventory(characterId);
      const inventoryItem = inventoryItems.find(item => 
        item.item.name.toLowerCase().includes(targetName)
      );

      if (inventoryItem) {
        return {
          id: `inventory_item_${inventoryItem.id}`,
          name: inventoryItem.item.name,
          type: 'inventory_item',
          data: inventoryItem
        };
      }
    } catch (error) {
      console.debug('Inventory item search failed:', error);
    }

    return null;
  }

  /**
   * Find exit targets in the current room
   */
  private async findExitTarget(
    roomId: number,
    targetName: string
  ): Promise<ExaminableTarget | null> {
    try {
      // Get connections from this room
      const connections = await this.prisma.connection.findMany({
        where: { fromRoomId: roomId }
      });

      // Convert to expected format
      const formattedConnections = connections.map(conn => ({
        id: conn.id,
        game_id: conn.gameId,
        from_room_id: conn.fromRoomId,
        to_room_id: conn.toRoomId,
        direction: conn.direction,
        name: conn.name || undefined
      })) as Connection[];

      const connection = formattedConnections.find(conn => {
        const direction = conn.direction.toLowerCase();
        return direction.includes(targetName) || 
               targetName.includes(direction) ||
               (targetName.includes('exit') && direction.includes(targetName.replace(/exit|passage/, '').trim()));
      });

      if (connection) {
        return {
          id: `exit_${connection.id}`,
          name: `${connection.direction} exit`,
          type: 'exit',
          data: connection
        };
      }
    } catch (error) {
      console.debug('Exit search failed:', error);
    }

    return null;
  }

  /**
   * Generate character examination text
   */
  private getCharacterExamination(character: Character): string {
    // Use extended_description if available, otherwise fall back to description
    let description = character.extended_description || character.description || `You see ${character.name}.`;
    
    // If using basic description, add disposition info
    if (!character.extended_description) {
      const dispositionText = character.type === 'enemy' ? 'hostile' : 'neutral';
      description += `\n\nThis ${character.type} appears ${dispositionText} toward you.`;
      
      if (character.type === 'enemy') {
        description += ' They seem ready for combat.';
      } else if (character.type === 'npc') {
        description += ' They might be willing to talk.';
      }
    }

    return description;
  }

  /**
   * Generate room item examination text
   */
  private getRoomItemExamination(roomItem: RoomItem): string {
    const item = roomItem.item;
    
    // Use extended_description if available, otherwise fall back to description
    let description = item.extended_description || item.description || `You examine the ${item.name}.`;

    // If using basic description, add item type and condition information
    if (!item.extended_description) {
      if (item.type) {
        description += `\n\nType: ${item.type}`;
      }

      if (item.is_fixed) {
        description += '\nThis item appears to be permanently fixed in place.';
      }
    }

    return description;
  }

  /**
   * Generate inventory item examination text
   */
  private getInventoryItemExamination(inventoryItem: InventoryItem): string {
    const item = inventoryItem.item;
    
    // Use extended_description if available, otherwise fall back to description
    let description = item.extended_description || item.description || `You examine your ${item.name}.`;

    // If using basic description, add detailed item information since it's in inventory
    if (!item.extended_description) {
      description += `\n\nType: ${item.type}`;
      
      if (item.type === 'weapon' && item.value > 0) {
        description += `\nDamage Bonus: +${item.value}`;
      } else if (item.value > 0) {
        description += `\nEstimated Value: ${item.value} gold`;
      }

      if (item.armor_rating) {
        description += `\nArmor Rating: ${item.armor_rating}`;
      }

      if (inventoryItem.quantity > 1) {
        description += `\nQuantity: ${inventoryItem.quantity}`;
      }
    } else {
      // For extended descriptions, still show equipped status
      if (inventoryItem.equipped) {
        description += `\n\nThis item is currently equipped.`;
      }
    }

    return description;
  }

  /**
   * Generate exit examination text
   */
  private getExitExamination(connection: Connection): string {
    let description = `You examine the ${connection.direction} passage.`;

    // Add contextual information
    if (connection.to_room_id) {
      description += `\n\nThe passage leads ${connection.direction}.`;
    } else {
      description += `\n\nThe passage leads ${connection.direction} into unexplored territory.`;
    }

    return description;
  }
}