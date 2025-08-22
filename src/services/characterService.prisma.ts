/**
 * CharacterService - Prisma Version
 * 
 * Manages character operations for the unified character system.
 * Handles players, NPCs, and enemies with the same underlying structure.
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';
import { 
  Character, 
  CharacterType, 
  CreateCharacterData, 
  CharacterAttributes,
  getAttributeModifier,
  calculateMaxHealth,
  isValidAttributeValue,
  getDefaultAttributes
} from '../types/character';

export class CharacterServicePrisma {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Create a new character (player, NPC, or enemy)
   */
  async createCharacter(data: CreateCharacterData): Promise<number> {
    // Validate attributes if provided
    const attributes = {
      strength: data.strength ?? 10,
      dexterity: data.dexterity ?? 10,
      intelligence: data.intelligence ?? 10,
      constitution: data.constitution ?? 10,
      wisdom: data.wisdom ?? 10,
      charisma: data.charisma ?? 10
    };

    // Validate all attributes
    for (const [attrName, value] of Object.entries(attributes)) {
      if (!isValidAttributeValue(value)) {
        throw new Error(`Invalid ${attrName} value: ${value}. Must be between 1 and 20.`);
      }
    }

    // Calculate initial health
    const maxHealth = calculateMaxHealth(attributes.constitution);

    const result = await this.prisma.character.create({
      data: {
        game_id: data.game_id,
        name: data.name,
        description: data.description || null,
        type: data.type || CharacterType.PLAYER,
        current_room_id: data.current_room_id || null,
        strength: attributes.strength,
        dexterity: attributes.dexterity,
        intelligence: attributes.intelligence,
        constitution: attributes.constitution,
        wisdom: attributes.wisdom,
        charisma: attributes.charisma,
        max_health: maxHealth,
        current_health: maxHealth, // Start at full health
        is_hostile: data.is_hostile ?? (data.type === CharacterType.ENEMY ? true : false), // Enemies are hostile by default
        dialogue_response: data.dialogue_response || null
      }
    });

    return result.id;
  }

  /**
   * Get a character by ID
   */
  async getCharacter(characterId: number): Promise<Character | null> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId }
    });

    if (!character) return null;

    return {
      id: character.id,
      game_id: character.game_id,
      name: character.name,
      description: character.description,
      type: character.type as CharacterType,
      current_room_id: character.current_room_id,
      strength: character.strength,
      dexterity: character.dexterity,
      intelligence: character.intelligence,
      constitution: character.constitution,
      wisdom: character.wisdom,
      charisma: character.charisma,
      max_health: character.max_health,
      current_health: character.current_health,
      is_hostile: character.is_hostile,
      is_dead: character.is_dead,
      dialogue_response: character.dialogue_response,
      created_at: character.created_at.toISOString()
    };
  }

  /**
   * Get all characters in a game
   */
  async getGameCharacters(gameId: number, type?: CharacterType): Promise<Character[]> {
    const characters = await this.prisma.character.findMany({
      where: {
        game_id: gameId,
        ...(type && { type })
      },
      orderBy: { created_at: 'asc' }
    });

    return characters.map(character => ({
      id: character.id,
      game_id: character.game_id,
      name: character.name,
      description: character.description,
      type: character.type as CharacterType,
      current_room_id: character.current_room_id,
      strength: character.strength,
      dexterity: character.dexterity,
      intelligence: character.intelligence,
      constitution: character.constitution,
      wisdom: character.wisdom,
      charisma: character.charisma,
      max_health: character.max_health,
      current_health: character.current_health,
      is_hostile: character.is_hostile,
      is_dead: character.is_dead,
      dialogue_response: character.dialogue_response,
      created_at: character.created_at.toISOString()
    }));
  }

  /**
   * Get the player character for a game
   */
  async getPlayerCharacter(gameId: number): Promise<Character | null> {
    const character = await this.prisma.character.findFirst({
      where: {
        game_id: gameId,
        type: CharacterType.PLAYER
      }
    });

    if (!character) return null;

    return {
      id: character.id,
      game_id: character.game_id,
      name: character.name,
      description: character.description,
      type: character.type as CharacterType,
      current_room_id: character.current_room_id,
      strength: character.strength,
      dexterity: character.dexterity,
      intelligence: character.intelligence,
      constitution: character.constitution,
      wisdom: character.wisdom,
      charisma: character.charisma,
      max_health: character.max_health,
      current_health: character.current_health,
      is_hostile: character.is_hostile,
      is_dead: character.is_dead,
      dialogue_response: character.dialogue_response,
      created_at: character.created_at.toISOString()
    };
  }

  /**
   * Get all characters in a specific room
   */
  async getRoomCharacters(roomId: number, excludeType?: CharacterType): Promise<Character[]> {
    const characters = await this.prisma.character.findMany({
      where: {
        current_room_id: roomId,
        ...(excludeType && { type: { not: excludeType } })
      },
      orderBy: { name: 'asc' }
    });

    return characters.map(character => ({
      id: character.id,
      game_id: character.game_id,
      name: character.name,
      description: character.description,
      type: character.type as CharacterType,
      current_room_id: character.current_room_id,
      strength: character.strength,
      dexterity: character.dexterity,
      intelligence: character.intelligence,
      constitution: character.constitution,
      wisdom: character.wisdom,
      charisma: character.charisma,
      max_health: character.max_health,
      current_health: character.current_health,
      is_hostile: character.is_hostile,
      is_dead: character.is_dead,
      dialogue_response: character.dialogue_response,
      created_at: character.created_at.toISOString()
    }));
  }

  /**
   * Update character attributes
   */
  async updateCharacterAttributes(characterId: number, attributes: Partial<CharacterAttributes>): Promise<void> {
    // Validate all provided attributes
    for (const [attrName, value] of Object.entries(attributes)) {
      if (value !== undefined && !isValidAttributeValue(value)) {
        throw new Error(`Invalid ${attrName} value: ${value}. Must be between 1 and 20.`);
      }
    }

    const updateData: any = {};
    if (attributes.strength !== undefined) updateData.strength = attributes.strength;
    if (attributes.dexterity !== undefined) updateData.dexterity = attributes.dexterity;
    if (attributes.intelligence !== undefined) updateData.intelligence = attributes.intelligence;
    if (attributes.constitution !== undefined) updateData.constitution = attributes.constitution;
    if (attributes.wisdom !== undefined) updateData.wisdom = attributes.wisdom;
    if (attributes.charisma !== undefined) updateData.charisma = attributes.charisma;

    await this.prisma.character.update({
      where: { id: characterId },
      data: updateData
    });
  }

  /**
   * Move a character to a room
   */
  async moveCharacter(characterId: number, roomId: number | null): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: { current_room_id: roomId }
    });
  }

  /**
   * Get hostile characters in a room
   */
  async getHostileCharacters(roomId: number): Promise<Character[]> {
    const characters = await this.prisma.character.findMany({
      where: {
        current_room_id: roomId,
        is_hostile: true
      }
    });

    return characters.map(character => ({
      id: character.id,
      game_id: character.game_id,
      name: character.name,
      description: character.description,
      type: character.type as CharacterType,
      current_room_id: character.current_room_id,
      strength: character.strength,
      dexterity: character.dexterity,
      intelligence: character.intelligence,
      constitution: character.constitution,
      wisdom: character.wisdom,
      charisma: character.charisma,
      max_health: character.max_health,
      current_health: character.current_health,
      is_hostile: character.is_hostile,
      is_dead: character.is_dead,
      dialogue_response: character.dialogue_response,
      created_at: character.created_at.toISOString()
    }));
  }

  /**
   * Check if a room has hostile characters
   */
  async hasHostileCharacters(roomId: number): Promise<boolean> {
    const count = await this.prisma.character.count({
      where: {
        current_room_id: roomId,
        is_hostile: true
      }
    });

    return count > 0;
  }

  /**
   * Set character hostility
   */
  async setCharacterHostility(characterId: number, isHostile: boolean): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: { is_hostile: isHostile }
    });
  }

  /**
   * Update character health
   */
  async updateCharacterHealth(characterId: number, currentHealth: number): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: { current_health: currentHealth }
    });
  }

  /**
   * Get character health information
   */
  async getCharacterHealth(characterId: number): Promise<{ current: number; max: number; percentage: number } | null> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: {
        current_health: true,
        max_health: true
      }
    });

    if (!character) return null;

    const current = character.current_health || 0;
    const max = character.max_health || 0;
    const percentage = max > 0 ? Math.round((current / max) * 100) : 0;

    return { current, max, percentage };
  }

  /**
   * Get character modifiers with status effects
   */
  async getCharacterModifiersWithEffects(characterId: number): Promise<Record<keyof CharacterAttributes, number>> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: {
        strength: true,
        dexterity: true,
        intelligence: true,
        constitution: true,
        wisdom: true,
        charisma: true
      }
    });

    if (!character) {
      throw new Error('Character not found');
    }

    // Get status effects from database
    const statusEffects = await this.prisma.$queryRaw`
      SELECT attribute_name, modifier_value 
      FROM character_status_effects 
      WHERE character_id = ${characterId} AND is_active = TRUE
    ` as Array<{ attribute_name: string; modifier_value: number }>;

    // Calculate base modifiers
    const baseModifiers = {
      strength: getAttributeModifier(character.strength),
      dexterity: getAttributeModifier(character.dexterity),
      intelligence: getAttributeModifier(character.intelligence),
      constitution: getAttributeModifier(character.constitution),
      wisdom: getAttributeModifier(character.wisdom),
      charisma: getAttributeModifier(character.charisma)
    };

    // Apply status effect modifiers
    for (const effect of statusEffects) {
      const attributeName = effect.attribute_name as keyof CharacterAttributes;
      if (attributeName in baseModifiers) {
        baseModifiers[attributeName] += effect.modifier_value;
      }
    }

    return baseModifiers;
  }

  /**
   * Set character as dead
   */
  async setCharacterDead(characterId: number): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        is_dead: true,
        current_health: 0
      }
    });
  }

  /**
   * Delete a character
   */
  async deleteCharacter(characterId: number): Promise<void> {
    await this.prisma.character.delete({
      where: { id: characterId }
    });
  }

  /**
   * Get character count for a game
   */
  async getCharacterCount(gameId: number, type?: CharacterType): Promise<number> {
    return await this.prisma.character.count({
      where: {
        game_id: gameId,
        ...(type && { type })
      }
    });
  }
}