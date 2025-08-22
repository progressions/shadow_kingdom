/**
 * CharacterGenerationService - Prisma Version
 * 
 * Handles the creation of characters (NPCs and enemies) from AI-generated room descriptions.
 * Processes character specifications from room generation and creates them in the database.
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';
import { CharacterServicePrisma } from './characterService.prisma';
import { CharacterType } from '../types/character';
import { GeneratedCharacter } from '../ai/grokClient';

export interface CharacterGenerationConfig {
  enabled: boolean;
  generationRate: number;
  maxCharactersPerRoom: number;
  enableDebugLogging?: boolean;
}

export class CharacterGenerationServicePrisma {
  private prisma: PrismaClient;
  private config: CharacterGenerationConfig;

  constructor(
    private characterService: CharacterServicePrisma,
    options: { enableDebugLogging?: boolean } = {},
    prismaClient?: PrismaClient
  ) {
    this.prisma = prismaClient || getPrismaClient();
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
   * @returns Array of created character IDs
   */
  async createCharactersFromGeneration(
    gameId: number, 
    roomId: number, 
    characters: GeneratedCharacter[]
  ): Promise<number[]> {
    if (!this.config.enabled) {
      if (this.config.enableDebugLogging) {
        console.log('🚫 Character generation disabled by configuration');
      }
      return [];
    }

    const createdCharacterIds: number[] = [];

    try {
      if (this.config.enableDebugLogging) {
        console.log(`👥 Processing ${characters.length} generated characters for room ${roomId}`);
      }

      // Limit the number of characters to avoid overcrowding
      const charactersToCreate = characters.slice(0, this.config.maxCharactersPerRoom);

      for (const character of charactersToCreate) {
        try {
          const characterId = await this.characterService.createCharacter({
            game_id: gameId,
            name: character.name,
            description: character.description,
            type: this.determineCharacterType(character),
            current_room_id: roomId,
            strength: this.generateAttribute(),
            dexterity: this.generateAttribute(),
            intelligence: this.generateAttribute(),
            constitution: this.generateAttribute(),
            wisdom: this.generateAttribute(),
            charisma: this.generateAttribute(),
            is_hostile: character.isHostile || false,
            dialogue_response: character.dialogueResponse || null
          });

          if (this.config.enableDebugLogging) {
            console.log(`✅ Created character: ${character.name} (ID: ${characterId})`);
          }

          createdCharacterIds.push(characterId);

        } catch (error) {
          if (this.config.enableDebugLogging) {
            console.error(`❌ Failed to create character ${character.name}:`, error);
          }
        }
      }

      if (this.config.enableDebugLogging) {
        console.log(`👥 Successfully created ${createdCharacterIds.length}/${charactersToCreate.length} characters`);
      }

    } catch (error) {
      if (this.config.enableDebugLogging) {
        console.error('❌ Character generation failed:', error);
      }
    }

    return createdCharacterIds;
  }

  /**
   * Generate random attribute value (8-15 range for balanced NPCs)
   */
  private generateAttribute(): number {
    return 8 + Math.floor(Math.random() * 8); // 8-15
  }

  /**
   * Determine character type based on generation context
   */
  private determineCharacterType(character: GeneratedCharacter): CharacterType {
    // Use the character's hostility and context to determine type
    if (character.isHostile) {
      return CharacterType.ENEMY;
    }
    
    // Default to NPC for friendly characters
    return CharacterType.NPC;
  }

  /**
   * Check if room should have characters generated
   * Uses probability-based generation
   */
  shouldGenerateCharacters(): boolean {
    if (!this.config.enabled) return false;
    return Math.random() < this.config.generationRate;
  }

  /**
   * Get current configuration
   */
  getConfig(): CharacterGenerationConfig {
    return { ...this.config };
  }

  /**
   * Update generation configuration
   */
  updateConfig(updates: Partial<CharacterGenerationConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}