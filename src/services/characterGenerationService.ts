/**
 * CharacterGenerationService
 * 
 * Handles the creation of characters (NPCs and enemies) from AI-generated room descriptions.
 * Processes character specifications from room generation and creates them in the database.
 */

import Database from '../utils/database';
import { CharacterService } from './characterService';
import { CharacterType } from '../types/character';
import { GeneratedCharacter } from '../ai/grokClient';

export interface CharacterGenerationConfig {
  enabled: boolean;
  generationRate: number;
  maxCharactersPerRoom: number;
  enableDebugLogging?: boolean;
}

export class CharacterGenerationService {
  private config: CharacterGenerationConfig;

  constructor(
    private db: Database,
    private characterService: CharacterService,
    options: { enableDebugLogging?: boolean } = {}
  ) {
    this.config = {
      enabled: process.env.AI_CHARACTER_GENERATION_ENABLED !== 'false',
      generationRate: parseFloat(process.env.AI_CHARACTER_GENERATION_RATE || '0.3'),
      maxCharactersPerRoom: parseInt(process.env.MAX_CHARACTERS_PER_ROOM || '2'),
      enableDebugLogging: options.enableDebugLogging
    };
  }

  /**
   * Create characters from room generation output
   * @param gameId The game ID for character association
   * @param roomId The room to place characters in
   * @param characters The characters specified by AI during room generation
   */
  async createCharactersFromRoomGeneration(
    gameId: number,
    roomId: number,
    characters?: GeneratedCharacter[]
  ): Promise<void> {
    if (process.env.AI_DEBUG_LOGGING === 'true') {
      console.log(`🧙 CharacterGenerationService called for room ${roomId} with ${characters?.length || 0} characters`);
    }

    // Skip if character generation is disabled
    if (!this.config.enabled) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('⚠️ Character generation is disabled');
      }
      return;
    }

    // Skip if no characters provided
    if (!characters || characters.length === 0) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('⚠️ No characters provided to generate');
      }
      return;
    }

    // Limit characters to max configured
    const charactersToCreate = characters.slice(0, this.config.maxCharactersPerRoom);

    for (const character of charactersToCreate) {
      try {
        await this.createAndPlaceCharacter(gameId, roomId, character);
      } catch (error) {
        // Log but don't fail room generation if character creation fails
        if (process.env.AI_DEBUG_LOGGING === 'true') {
          console.error(`Failed to create character "${character.name}":`, error);
        }
      }
    }
  }

  /**
   * Create a single character and place it in a room
   */
  private async createAndPlaceCharacter(
    gameId: number,
    roomId: number,
    character: GeneratedCharacter
  ): Promise<void> {
    // Validate character data
    if (!character.name || !character.description || !character.type) {
      throw new Error('Invalid character data: missing name, description, or type');
    }

    // Convert character type to database enum
    let characterType: CharacterType;
    if (character.type === 'npc') {
      characterType = CharacterType.NPC;
    } else if (character.type === 'enemy') {
      characterType = CharacterType.ENEMY;
    } else {
      throw new Error(`Invalid character type: ${character.type}`);
    }

    // Create the character in database with attributes
    const characterId = await this.characterService.createCharacter({
      game_id: gameId,
      name: character.name,
      description: character.description,
      type: characterType,
      current_room_id: roomId,
      // Use provided attributes or defaults
      strength: character.attributes?.strength ?? 10,
      dexterity: character.attributes?.dexterity ?? 10,
      intelligence: character.attributes?.intelligence ?? 10,
      constitution: character.attributes?.constitution ?? 10,
      wisdom: character.attributes?.wisdom ?? 10,
      charisma: character.attributes?.charisma ?? 10,
      is_hostile: characterType === CharacterType.ENEMY, // Enemies are hostile by default
      dialogue_response: character.initialDialogue
    });

    if (process.env.AI_DEBUG_LOGGING === 'true') {
      console.log(`✅ Created ${character.type}: ${character.name} (ID: ${characterId}) in room ${roomId}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CharacterGenerationConfig {
    return { ...this.config };
  }
}