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
  CharacterSentiment,
  CreateCharacterData, 
  CharacterAttributes,
  getAttributeModifier,
  calculateMaxHealth,
  isValidAttributeValue,
  getDefaultAttributes,
  getSentimentValue,
  isHostileToPlayer as checkHostileToPlayer
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
        game_id, name, description, extended_description, type, current_room_id,
        strength, dexterity, intelligence, constitution, wisdom, charisma,
        max_health, current_health, sentiment, dialogue_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.game_id,
      data.name,
      data.description ?? null,
      data.extended_description ?? null,
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
      data.sentiment ?? (data.type === CharacterType.ENEMY ? CharacterSentiment.AGGRESSIVE : CharacterSentiment.INDIFFERENT), // Default sentiment based on type
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
      'SELECT * FROM characters WHERE current_room_id = ? AND sentiment IN (\'hostile\', \'aggressive\') AND (is_dead IS NULL OR is_dead = 0) ORDER BY name',
      [roomId]
    );
  }

  /**
   * Check if room has any hostile characters
   */
  async hasHostileCharacters(roomId: number): Promise<boolean> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM characters WHERE current_room_id = ? AND sentiment IN (\'hostile\', \'aggressive\') AND (is_dead IS NULL OR is_dead = 0)',
      [roomId]
    );
    return (result?.count ?? 0) > 0;
  }

  /**
   * Get hostile enemies in a room (excludes NPCs, includes only alive enemies)
   * Used for dexterity-based escape system
   */
  async getHostileEnemiesInRoom(roomId: number): Promise<Character[]> {
    return await this.db.all<Character>(`
      SELECT * FROM characters 
      WHERE current_room_id = ? 
      AND sentiment IN ('hostile', 'aggressive')
      AND type = 'enemy'
      AND (is_dead IS NULL OR is_dead = 0)
      ORDER BY dexterity DESC
    `, [roomId]);
  }

  /**
   * Update character hostility
   */
  /**
   * @deprecated Use setSentiment instead
   */
  async setCharacterHostility(characterId: number, isHostile: boolean): Promise<void> {
    // Convert boolean to sentiment
    const sentiment = isHostile ? CharacterSentiment.AGGRESSIVE : CharacterSentiment.INDIFFERENT;
    await this.setSentiment(characterId, sentiment);
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

  // ========== SENTIMENT SYSTEM FUNCTIONS ==========

  /**
   * Get character's current sentiment
   */
  async getSentiment(characterId: number): Promise<CharacterSentiment> {
    const character = await this.getCharacter(characterId);
    if (!character) {
      throw new Error(`Character ${characterId} not found`);
    }
    return character.sentiment;
  }

  /**
   * Get sentiment-based dialogue fallback response for a character
   */
  getSentimentDialogueResponse(sentiment: CharacterSentiment): string {
    const responses = {
      [CharacterSentiment.HOSTILE]: [
        "Get away from me!",
        "*growls menacingly*",
        "*snarls and glares at you*",
        "I'll destroy you!",
        "*hisses with hatred*"
      ],
      [CharacterSentiment.AGGRESSIVE]: [
        "What do you want?!",
        "Get lost!",
        "Leave me alone!",
        "Back off!",
        "*scowls darkly*"
      ],
      [CharacterSentiment.INDIFFERENT]: [
        "Hmm.",
        "Yes?",
        "Perhaps.",
        "I suppose.",
        "Whatever."
      ],
      [CharacterSentiment.FRIENDLY]: [
        "Hello there!",
        "Greetings, friend!",
        "Good day to you!",
        "Welcome!",
        "It's a pleasure to meet you!"
      ],
      [CharacterSentiment.ALLIED]: [
        "My friend! How can I help?",
        "At your service, as always!",
        "How can I assist you?",
        "Together we are strong!",
        "What do you need, ally?"
      ]
    };

    const sentimentResponses = responses[sentiment] || responses[CharacterSentiment.INDIFFERENT];
    const randomIndex = Math.floor(Math.random() * sentimentResponses.length);
    return sentimentResponses[randomIndex];
  }

  /**
   * Get all characters that block movement (hostile or aggressive sentiment)
   * Replaces getHostileCharacters for sentiment-aware blocking
   */
  async getBlockingCharacters(roomId: number): Promise<Character[]> {
    return await this.db.all<Character>(
      `SELECT * FROM characters 
       WHERE current_room_id = ? 
       AND sentiment IN ('hostile', 'aggressive') 
       AND (is_dead IS NULL OR is_dead = 0) 
       ORDER BY name`,
      [roomId]
    );
  }

  /**
   * Check if room has any characters that block movement
   * Uses sentiment system instead of is_hostile
   */
  async hasBlockingCharacters(roomId: number): Promise<boolean> {
    const result = await this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM characters 
       WHERE current_room_id = ? 
       AND sentiment IN ('hostile', 'aggressive') 
       AND (is_dead IS NULL OR is_dead = 0)`,
      [roomId]
    );
    
    return (result?.count || 0) > 0;
  }

  /**
   * Set character's sentiment to a specific value
   */
  async setSentiment(characterId: number, sentiment: CharacterSentiment): Promise<void> {
    const character = await this.getCharacter(characterId);
    if (!character) {
      throw new Error(`Character ${characterId} not found`);
    }

    await this.db.run(
      'UPDATE characters SET sentiment = ? WHERE id = ?',
      [sentiment, characterId]
    );
  }

  /**
   * Change character's sentiment by a delta amount
   * Clamps to valid sentiment bounds (-2 to +2)
   */
  async changeSentiment(characterId: number, delta: number): Promise<CharacterSentiment> {
    const currentSentiment = await this.getSentiment(characterId);
    const currentValue = getSentimentValue(currentSentiment);
    const newValue = Math.max(-2, Math.min(2, currentValue + delta));

    // Convert numeric value back to sentiment enum
    const newSentiment = this.valueToSentiment(newValue);
    
    await this.setSentiment(characterId, newSentiment);
    return newSentiment;
  }

  /**
   * Check if a character is hostile to the player based on sentiment
   */
  async isHostileToPlayer(characterId: number): Promise<boolean> {
    const sentiment = await this.getSentiment(characterId);
    return checkHostileToPlayer(sentiment);
  }

  /**
   * Convert numeric sentiment value back to CharacterSentiment enum
   * Private helper function for sentiment calculations
   */
  private valueToSentiment(value: number): CharacterSentiment {
    switch (value) {
      case -2: return CharacterSentiment.HOSTILE;
      case -1: return CharacterSentiment.AGGRESSIVE;
      case 0: return CharacterSentiment.INDIFFERENT;
      case 1: return CharacterSentiment.FRIENDLY;
      case 2: return CharacterSentiment.ALLIED;
      default: return CharacterSentiment.INDIFFERENT;
    }
  }

  /**
   * Generate behavioral dialogue based on character sentiment and context
   * Phase 15: AI Character Behavioral Prompts
   */
  async generateBehavioralDialogue(
    characterId: number,
    context: {
      playerCommand: string;
      context: string;
      conversationHistory?: Array<{
        speaker: 'player' | 'character';
        message: string;
      }>;
      recentActions?: string[];
      roomContext?: {
        name: string;
        description: string;
        type?: string;
      };
    }
  ): Promise<any> {
    // Get character details
    const character = await this.getCharacter(characterId);
    if (!character) {
      throw new Error(`Character ${characterId} not found`);
    }

    // Import GrokClient and interfaces here to avoid circular dependencies
    const { GrokClient } = await import('../ai/grokClient');
    
    // Create a GrokClient instance (it will auto-detect mock mode from environment)
    const grokClient = new GrokClient({
      mockMode: process.env.AI_MOCK_MODE === 'true'
    });

    // Build comprehensive behavioral context prompt
    let prompt = 'Generate contextual behavioral dialogue for a character in a fantasy text adventure game.\n\n';
    
    prompt += `CHARACTER DETAILS:\n`;
    prompt += `Name: ${character.name}\n`;
    prompt += `Type: ${character.type}\n`;
    prompt += `Current Sentiment: ${character.sentiment}\n`;
    prompt += `Description: ${character.description || 'No additional description'}\n\n`;
    
    prompt += `PLAYER ACTION:\n`;
    prompt += `Command: ${context.playerCommand}\n`;
    prompt += `Context: ${context.context}\n\n`;
    
    if (context.roomContext) {
      prompt += `LOCATION CONTEXT:\n`;
      prompt += `Room: ${context.roomContext.name}\n`;
      prompt += `Description: ${context.roomContext.description}\n`;
      if (context.roomContext.type) {
        prompt += `Type: ${context.roomContext.type}\n`;
      }
      prompt += '\n';
    }
    
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      prompt += `CONVERSATION HISTORY:\n`;
      context.conversationHistory.forEach(entry => {
        prompt += `${entry.speaker === 'player' ? 'Player' : character.name}: ${entry.message}\n`;
      });
      prompt += '\n';
    }
    
    if (context.recentActions && context.recentActions.length > 0) {
      prompt += `RECENT PLAYER ACTIONS:\n`;
      context.recentActions.forEach(action => {
        prompt += `- ${action}\n`;
      });
      prompt += '\n';
    }
    
    prompt += `BEHAVIORAL GUIDELINES:\n`;
    prompt += `Generate dialogue that reflects the character's ${character.sentiment} sentiment:\n`;
    
    switch (character.sentiment) {
      case CharacterSentiment.HOSTILE:
        prompt += '- Hostile (-2): Violent, threatening, aggressive language. Ready for combat.\n';
        prompt += '- Suggest actions: retreat, defend, attack\n';
        break;
      case CharacterSentiment.AGGRESSIVE:
        prompt += '- Aggressive (-1): Suspicious, unfriendly, but might talk. Distrustful tone.\n';
        prompt += '- Suggest actions: explain_purpose, show_credentials, back_away\n';
        break;
      case CharacterSentiment.INDIFFERENT:
        prompt += '- Indifferent (0): Neutral, businesslike, focused on own affairs.\n';
        prompt += '- Suggest actions: state_business, apologize, offer_payment\n';
        break;
      case CharacterSentiment.FRIENDLY:
        prompt += '- Friendly (1): Welcoming, helpful, positive disposition toward player.\n';
        prompt += '- Suggest actions: ask_for_help, trade_items, share_news\n';
        break;
      case CharacterSentiment.ALLIED:
        prompt += '- Allied (2): Devoted, loyal, would sacrifice for player. Trusted companion.\n';
        prompt += '- Suggest actions: request_aid, share_plans, ask_advice\n';
        break;
    }
    
    prompt += '\nConsider:\n';
    prompt += '- Room atmosphere and location modifiers\n';
    prompt += '- Previous conversation context\n';
    prompt += '- Recent player actions and their impact on relationship\n';
    prompt += '- Character type (NPC vs Enemy) behavioral differences\n\n';
    
    prompt += 'Respond in JSON format:\n';
    prompt += '{\n';
    prompt += '  "response": "Character\'s dialogue response",\n';
    prompt += '  "tone": "emotional tone (threatening/suspicious/neutral/welcoming/devoted)",\n';
    prompt += '  "action": "character physical action or body language",\n';
    prompt += '  "sentimentContext": "current sentiment level",\n';
    prompt += '  "sentimentChange": "recently_improved/recently_degraded (if applicable)",\n';
    prompt += '  "locationModifier": "sacred_space/dangerous_area (if applicable)",\n';
    prompt += '  "suggestedPlayerActions": ["action1", "action2", "action3"]\n';
    prompt += '}';

    try {
      // Generate behavioral dialogue using AI
      const result = await grokClient.generateSentimentBasedDialogue(prompt, {
        characterId,
        characterName: character.name,
        sentiment: character.sentiment,
        playerCommand: context.playerCommand,
        context: context.context,
        conversationHistory: context.conversationHistory,
        recentActions: context.recentActions,
        roomContext: context.roomContext
      });

      return result;

    } catch (error) {
      // Return sentiment-appropriate fallback
      return this.getFallbackBehavioralResponse(character.sentiment, context);
    }
  }

  /**
   * Generate fallback behavioral response when AI fails
   */
  private getFallbackBehavioralResponse(sentiment: CharacterSentiment, context: any): any {
    switch (sentiment) {
      case CharacterSentiment.HOSTILE:
        return {
          response: "You approach at your own peril! I'll show no mercy!",
          tone: 'threatening',
          action: 'draws_weapon',
          sentimentContext: 'hostile',
          suggestedPlayerActions: ['retreat', 'defend', 'attack']
        };
      case CharacterSentiment.AGGRESSIVE:
        return {
          response: "What do you want? Speak quickly or move along.",
          tone: 'suspicious',
          action: 'watches_warily',
          sentimentContext: 'aggressive',
          suggestedPlayerActions: ['explain_purpose', 'back_away']
        };
      case CharacterSentiment.FRIENDLY:
        return {
          response: "Hello there, friend! How can I help you?",
          tone: 'welcoming',
          action: 'smiles_warmly',
          sentimentContext: 'friendly',
          suggestedPlayerActions: ['ask_for_help', 'trade_items']
        };
      case CharacterSentiment.ALLIED:
        return {
          response: "My trusted companion! What do you need?",
          tone: 'devoted',
          action: 'stands_ready',
          sentimentContext: 'allied',
          suggestedPlayerActions: ['request_aid', 'ask_advice']
        };
      default: // INDIFFERENT
        return {
          response: "Yes? I'm quite busy. What do you need?",
          tone: 'neutral',
          action: 'continues_working',
          sentimentContext: 'indifferent',
          suggestedPlayerActions: ['state_business', 'offer_payment']
        };
    }
  }
}