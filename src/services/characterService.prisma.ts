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
  CharacterSentiment,
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
        gameId: data.game_id,
        name: data.name,
        description: data.description || null,
        type: data.type || CharacterType.PLAYER,
        currentRoomId: data.current_room_id || null,
        strength: attributes.strength,
        dexterity: attributes.dexterity,
        intelligence: attributes.intelligence,
        constitution: attributes.constitution,
        wisdom: attributes.wisdom,
        charisma: attributes.charisma,
        maxHealth: maxHealth,
        currentHealth: maxHealth, // Start at full health
        isHostile: (data as any).is_hostile ?? (data.type === CharacterType.ENEMY ? true : false), // Enemies are hostile by default
        dialogueResponse: (data as any).dialogue_response || null
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
      game_id: character.gameId,
      name: character.name,
      description: character.description || undefined,
      type: character.type as CharacterType,
      current_room_id: character.currentRoomId,
      strength: character.strength,
      dexterity: character.dexterity,
      intelligence: character.intelligence,
      constitution: character.constitution,
      wisdom: character.wisdom,
      charisma: character.charisma,
      max_health: character.maxHealth,
      current_health: character.currentHealth,
      is_hostile: character.isHostile,
      is_dead: character.isDead,
      dialogue_response: character.dialogueResponse || undefined,
      created_at: character.createdAt.toISOString(),
      sentiment: CharacterSentiment.INDIFFERENT // Add default sentiment
    };
  }

  /**
   * Get all characters in a game
   */
  async getGameCharacters(gameId: number, type?: CharacterType): Promise<Character[]> {
    const characters = await this.prisma.character.findMany({
      where: {
        gameId: gameId,
        ...(type && { type })
      },
      orderBy: { createdAt: 'asc' }
    });

    return characters.map(character => ({
      id: character.id,
      game_id: character.gameId,
      name: character.name,
      description: character.description || undefined,
      type: character.type as CharacterType,
      current_room_id: character.currentRoomId,
      strength: character.strength,
      dexterity: character.dexterity,
      intelligence: character.intelligence,
      constitution: character.constitution,
      wisdom: character.wisdom,
      charisma: character.charisma,
      max_health: character.maxHealth,
      current_health: character.currentHealth,
      is_hostile: character.isHostile,
      is_dead: character.isDead,
      dialogue_response: character.dialogueResponse || undefined,
      created_at: character.createdAt.toISOString(),
      sentiment: CharacterSentiment.INDIFFERENT // Add default sentiment
    }));
  }

  /**
   * Get the player character for a game
   */
  async getPlayerCharacter(gameId: number): Promise<Character | null> {
    const character = await this.prisma.character.findFirst({
      where: {
        gameId: gameId,
        type: CharacterType.PLAYER
      }
    });

    if (!character) return null;

    return {
      id: character.id,
      game_id: character.gameId,
      name: character.name,
      description: character.description || undefined,
      type: character.type as CharacterType,
      current_room_id: character.currentRoomId,
      strength: character.strength,
      dexterity: character.dexterity,
      intelligence: character.intelligence,
      constitution: character.constitution,
      wisdom: character.wisdom,
      charisma: character.charisma,
      max_health: character.maxHealth,
      current_health: character.currentHealth,
      is_hostile: character.isHostile,
      is_dead: character.isDead,
      dialogue_response: character.dialogueResponse || undefined,
      created_at: character.createdAt.toISOString(),
      sentiment: CharacterSentiment.INDIFFERENT // Add default sentiment
    };
  }

  /**
   * Get all characters in a specific room
   */
  async getRoomCharacters(roomId: number, excludeType?: CharacterType): Promise<Character[]> {
    const characters = await this.prisma.character.findMany({
      where: {
        currentRoomId: roomId,
        ...(excludeType && { type: { not: excludeType } })
      },
      orderBy: { name: 'asc' }
    });

    return characters.map(character => ({
      id: character.id,
      game_id: character.gameId,
      name: character.name,
      description: character.description || undefined,
      type: character.type as CharacterType,
      current_room_id: character.currentRoomId,
      strength: character.strength,
      dexterity: character.dexterity,
      intelligence: character.intelligence,
      constitution: character.constitution,
      wisdom: character.wisdom,
      charisma: character.charisma,
      max_health: character.maxHealth,
      current_health: character.currentHealth,
      is_hostile: character.isHostile,
      is_dead: character.isDead,
      dialogue_response: character.dialogueResponse || undefined,
      created_at: character.createdAt.toISOString(),
      sentiment: CharacterSentiment.INDIFFERENT // Add default sentiment
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
      data: { currentRoomId: roomId }
    });
  }

  /**
   * Get hostile characters in a room
   */
  async getHostileCharacters(roomId: number): Promise<Character[]> {
    const characters = await this.prisma.character.findMany({
      where: {
        currentRoomId: roomId,
        isHostile: true
      }
    });

    return characters.map(character => ({
      id: character.id,
      game_id: character.gameId,
      name: character.name,
      description: character.description || undefined,
      type: character.type as CharacterType,
      current_room_id: character.currentRoomId,
      strength: character.strength,
      dexterity: character.dexterity,
      intelligence: character.intelligence,
      constitution: character.constitution,
      wisdom: character.wisdom,
      charisma: character.charisma,
      max_health: character.maxHealth,
      current_health: character.currentHealth,
      is_hostile: character.isHostile,
      is_dead: character.isDead,
      dialogue_response: character.dialogueResponse || undefined,
      created_at: character.createdAt.toISOString(),
      sentiment: CharacterSentiment.INDIFFERENT // Add default sentiment
    }));
  }

  /**
   * Check if a room has hostile characters
   */
  async hasHostileCharacters(roomId: number): Promise<boolean> {
    const count = await this.prisma.character.count({
      where: {
        currentRoomId: roomId,
        isHostile: true
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
      data: { isHostile: isHostile }
    });
  }

  /**
   * Update character health
   */
  async updateCharacterHealth(characterId: number, currentHealth: number): Promise<void> {
    await this.prisma.character.update({
      where: { id: characterId },
      data: { currentHealth: currentHealth }
    });
  }

  /**
   * Get character health information
   */
  async getCharacterHealth(characterId: number): Promise<{ current: number; max: number; percentage: number } | null> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: {
        currentHealth: true,
        maxHealth: true
      }
    });

    if (!character) return null;

    const current = character.currentHealth || 0;
    const max = character.maxHealth || 0;
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
        isDead: true,
        currentHealth: 0
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
        gameId: gameId,
        ...(type && { type })
      }
    });
  }
}