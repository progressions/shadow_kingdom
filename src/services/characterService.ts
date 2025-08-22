/**
 * CharacterService
 * 
 * Manages character operations for the unified character system.
 * Handles players, NPCs, and enemies with the same underlying structure.
 */

import Database from '../utils/database';
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

export class CharacterService {
  constructor(private db: Database) {}

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

    const result = await this.db.run(`
      INSERT INTO characters (
        game_id, name, description, type, current_room_id,
        strength, dexterity, intelligence, constitution, wisdom, charisma,
        max_health, current_health, is_hostile, dialogue_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.game_id,
      data.name,
      data.description ?? null,
      data.type ?? CharacterType.PLAYER,
      data.current_room_id ?? null,
      attributes.strength,
      attributes.dexterity,
      attributes.intelligence,
      attributes.constitution,
      attributes.wisdom,
      attributes.charisma,
      maxHealth,
      maxHealth, // Start at full health
      data.is_hostile ?? (data.type === CharacterType.ENEMY ? true : false), // Enemies are hostile by default
      data.dialogue_response ?? null
    ]);

    return result.lastID as number;
  }

  /**
   * Get a character by ID
   */
  async getCharacter(characterId: number): Promise<Character | null> {
    const character = await this.db.get<Character>(
      'SELECT * FROM characters WHERE id = ?',
      [characterId]
    );

    return character || null;
  }

  /**
   * Get all characters in a game
   */
  async getGameCharacters(gameId: number, type?: CharacterType): Promise<Character[]> {
    const query = type 
      ? 'SELECT * FROM characters WHERE game_id = ? AND type = ? ORDER BY created_at'
      : 'SELECT * FROM characters WHERE game_id = ? ORDER BY created_at';
    
    const params = type ? [gameId, type] : [gameId];
    
    return await this.db.all<Character>(query, params);
  }

  /**
   * Get the player character for a game
   */
  async getPlayerCharacter(gameId: number): Promise<Character | null> {
    const character = await this.db.get<Character>(
      'SELECT * FROM characters WHERE game_id = ? AND type = ? LIMIT 1',
      [gameId, CharacterType.PLAYER]
    );

    return character || null;
  }

  /**
   * Get all characters in a specific room
   */
  async getRoomCharacters(roomId: number, excludeType?: CharacterType): Promise<Character[]> {
    const query = excludeType
      ? 'SELECT * FROM characters WHERE current_room_id = ? AND type != ? ORDER BY name'
      : 'SELECT * FROM characters WHERE current_room_id = ? ORDER BY name';
    
    const params = excludeType ? [roomId, excludeType] : [roomId];
    
    return await this.db.all<Character>(query, params);
  }

  /**
   * Update character attributes
   */
  async updateCharacterAttributes(characterId: number, attributes: Partial<CharacterAttributes>): Promise<void> {
    // Validate provided attributes
    for (const [attrName, value] of Object.entries(attributes)) {
      if (value !== undefined && !isValidAttributeValue(value)) {
        throw new Error(`Invalid ${attrName} value: ${value}. Must be between 1 and 20.`);
      }
    }

    // Build dynamic query for provided attributes
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      return; // Nothing to update
    }

    // If constitution changed, recalculate max health
    if (attributes.constitution !== undefined) {
      const newMaxHealth = calculateMaxHealth(attributes.constitution);
      updateFields.push('max_health = ?');
      updateValues.push(newMaxHealth);

      // Also update current health if it would exceed new max
      updateFields.push('current_health = CASE WHEN current_health > ? THEN ? ELSE current_health END');
      updateValues.push(newMaxHealth, newMaxHealth);
    }

    updateValues.push(characterId);

    await this.db.run(
      `UPDATE characters SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
  }

  /**
   * Move character to a different room
   */
  async moveCharacter(characterId: number, roomId: number | null): Promise<void> {
    await this.db.run(
      'UPDATE characters SET current_room_id = ? WHERE id = ?',
      [roomId, characterId]
    );
  }

  /**
   * Get all hostile characters in a room (alive only)
   */
  async getHostileCharacters(roomId: number): Promise<Character[]> {
    return await this.db.all<Character>(
      'SELECT * FROM characters WHERE current_room_id = ? AND is_hostile = 1 AND (is_dead IS NULL OR is_dead = 0) ORDER BY name',
      [roomId]
    );
  }

  /**
   * Check if room has any hostile characters
   */
  async hasHostileCharacters(roomId: number): Promise<boolean> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM characters WHERE current_room_id = ? AND is_hostile = 1 AND (is_dead IS NULL OR is_dead = 0)',
      [roomId]
    );
    return (result?.count ?? 0) > 0;
  }

  /**
   * Update character hostility
   */
  async setCharacterHostility(characterId: number, isHostile: boolean): Promise<void> {
    await this.db.run(
      'UPDATE characters SET is_hostile = ? WHERE id = ?',
      [isHostile ? 1 : 0, characterId]
    );
  }

  /**
   * Update character health
   */
  async updateCharacterHealth(characterId: number, currentHealth: number): Promise<void> {
    // Get character to validate health bounds
    const character = await this.getCharacter(characterId);
    if (!character) {
      throw new Error(`Character ${characterId} not found`);
    }

    const maxHealth = character.max_health || calculateMaxHealth(character.constitution);
    const clampedHealth = Math.max(0, Math.min(currentHealth, maxHealth));

    await this.db.run(
      'UPDATE characters SET current_health = ? WHERE id = ?',
      [clampedHealth, characterId]
    );
  }

  /**
   * Get character's current health status
   */
  async getCharacterHealth(characterId: number): Promise<{ current: number; max: number; percentage: number } | null> {
    const character = await this.getCharacter(characterId);
    if (!character) {
      return null;
    }

    const maxHealth = character.max_health || calculateMaxHealth(character.constitution);
    const currentHealth = character.current_health ?? maxHealth;
    const percentage = Math.round((currentHealth / maxHealth) * 100);

    return {
      current: currentHealth,
      max: maxHealth,
      percentage
    };
  }

  /**
   * Get character's attribute modifiers
   */
  getCharacterModifiers(character: Character): Record<keyof CharacterAttributes, number> {
    return {
      strength: getAttributeModifier(character.strength),
      dexterity: getAttributeModifier(character.dexterity),
      intelligence: getAttributeModifier(character.intelligence),
      constitution: getAttributeModifier(character.constitution),
      wisdom: getAttributeModifier(character.wisdom),
      charisma: getAttributeModifier(character.charisma)
    };
  }

  /**
   * Get character modifiers including status effects
   */
  async getCharacterModifiersWithEffects(characterId: number): Promise<Record<keyof CharacterAttributes, number>> {
    // Get base character
    const character = await this.getCharacter(characterId);
    if (!character) {
      throw new Error(`Character ${characterId} not found`);
    }

    // Start with base modifiers
    const modifiers = this.getCharacterModifiers(character);

    // Get active status effects
    const statusEffects = await this.db.all(`
      SELECT * FROM character_status_effects 
      WHERE character_id = ? 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    `, [characterId]);

    // Apply status effect bonuses
    for (const effect of statusEffects) {
      try {
        const effectData = JSON.parse(effect.effect_data || '{}');
        
        // Apply attribute bonuses from status effects
        if (effectData.strength_bonus) modifiers.strength += effectData.strength_bonus;
        if (effectData.dexterity_bonus) modifiers.dexterity += effectData.dexterity_bonus;
        if (effectData.intelligence_bonus) modifiers.intelligence += effectData.intelligence_bonus;
        if (effectData.constitution_bonus) modifiers.constitution += effectData.constitution_bonus;
        if (effectData.wisdom_bonus) modifiers.wisdom += effectData.wisdom_bonus;
        if (effectData.charisma_bonus) modifiers.charisma += effectData.charisma_bonus;
        
        // Handle penalties
        if (effectData.strength_penalty) modifiers.strength -= effectData.strength_penalty;
        if (effectData.dexterity_penalty) modifiers.dexterity -= effectData.dexterity_penalty;
        if (effectData.intelligence_penalty) modifiers.intelligence -= effectData.intelligence_penalty;
        if (effectData.constitution_penalty) modifiers.constitution -= effectData.constitution_penalty;
        if (effectData.wisdom_penalty) modifiers.wisdom -= effectData.wisdom_penalty;
        if (effectData.charisma_penalty) modifiers.charisma -= effectData.charisma_penalty;
        
        // Handle all_stats bonuses/penalties
        if (effectData.all_stats_bonus) {
          modifiers.strength += effectData.all_stats_bonus;
          modifiers.dexterity += effectData.all_stats_bonus;
          modifiers.intelligence += effectData.all_stats_bonus;
          modifiers.constitution += effectData.all_stats_bonus;
          modifiers.wisdom += effectData.all_stats_bonus;
          modifiers.charisma += effectData.all_stats_bonus;
        }
        if (effectData.all_stats_penalty) {
          modifiers.strength -= effectData.all_stats_penalty;
          modifiers.dexterity -= effectData.all_stats_penalty;
          modifiers.intelligence -= effectData.all_stats_penalty;
          modifiers.constitution -= effectData.all_stats_penalty;
          modifiers.wisdom -= effectData.all_stats_penalty;
          modifiers.charisma -= effectData.all_stats_penalty;
        }
      } catch (error) {
        console.error('Error parsing status effect data:', effect.effect_data);
      }
    }

    return modifiers;
  }

  /**
   * Set character as dead
   */
  async setCharacterDead(characterId: number): Promise<void> {
    await this.db.run(
      'UPDATE characters SET is_dead = ? WHERE id = ?',
      [true, characterId]
    );
  }

  /**
   * Delete a character
   */
  async deleteCharacter(characterId: number): Promise<void> {
    await this.db.run('DELETE FROM characters WHERE id = ?', [characterId]);
  }

  /**
   * Get character count for a game by type
   */
  async getCharacterCount(gameId: number, type?: CharacterType): Promise<number> {
    const query = type
      ? 'SELECT COUNT(*) as count FROM characters WHERE game_id = ? AND type = ?'
      : 'SELECT COUNT(*) as count FROM characters WHERE game_id = ?';
    
    const params = type ? [gameId, type] : [gameId];
    const result = await this.db.get<{ count: number }>(query, params);
    
    return result?.count || 0;
  }
}