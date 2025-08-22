import { GameContext } from './types';
import Database from '../utils/database';
import { ItemService } from '../services/itemService';
import { CharacterService } from '../services/characterService';
import { CharacterType } from '../types/character';

export interface EntityResolutionResult {
  resolved: boolean;
  resolvedParams: string[];
  reason?: string;
}

/**
 * EntityResolver handles resolving natural language references to actual game entities
 */
export class EntityResolver {
  private itemService: ItemService;
  private characterService: CharacterService;

  constructor(private db: Database) {
    this.itemService = new ItemService(db);
    this.characterService = new CharacterService(db);
  }

  /**
   * Try to resolve command parameters to actual entities in the room
   */
  async resolveEntities(action: string, params: string[], context: GameContext): Promise<EntityResolutionResult> {
    if (!context.currentRoom) {
      return { resolved: true, resolvedParams: params }; // No room context, can't resolve
    }

    // For commands that need entity resolution
    if (['talk', 'examine', 'get', 'give', 'attack'].includes(action)) {
      return await this.resolveTargetEntity(params, context);
    }

    // For other commands, pass through as-is
    return { resolved: true, resolvedParams: params };
  }

  /**
   * Resolve a target entity (character, item, etc.)
   */
  private async resolveTargetEntity(params: string[], context: GameContext): Promise<EntityResolutionResult> {
    if (params.length === 0) {
      return { resolved: false, resolvedParams: params, reason: 'No target specified' };
    }

    const targetPhrase = params.join(' ').toLowerCase();
    
    // Get room entities
    const [roomItems, roomCharacters] = await Promise.all([
      this.itemService.getRoomItems(context.currentRoom!.id),
      this.characterService.getRoomCharacters(context.currentRoom!.id, CharacterType.PLAYER)
    ]);

    // Try to resolve to character
    const character = this.findBestMatch(targetPhrase, roomCharacters.map(c => c.name.toLowerCase()));
    if (character) {
      const actualCharacter = roomCharacters.find(c => c.name.toLowerCase() === character);
      return { resolved: true, resolvedParams: [actualCharacter!.name] };
    }

    // Try to resolve to item
    const item = this.findBestMatch(targetPhrase, roomItems.map(i => i.item.name.toLowerCase()));
    if (item) {
      const actualItem = roomItems.find(i => i.item.name.toLowerCase() === item);
      return { resolved: true, resolvedParams: [actualItem!.item.name] };
    }

    // Try to resolve to exit
    if (context.currentRoom!.availableExits) {
      const exit = this.findBestMatch(targetPhrase, context.currentRoom!.availableExits.map(e => e.toLowerCase()));
      if (exit) {
        return { resolved: true, resolvedParams: [exit] };
      }
    }

    // No match found
    return { 
      resolved: false, 
      resolvedParams: params, 
      reason: `Could not resolve "${targetPhrase}" to any entity in the room` 
    };
  }

  /**
   * Find best match for a target phrase among available entities
   * Handles demonstratives like "that spirit" -> "Chef's Spirit"
   */
  private findBestMatch(targetPhrase: string, candidates: string[]): string | null {
    const cleanTarget = this.cleanTargetPhrase(targetPhrase);

    // Exact match
    const exactMatch = candidates.find(candidate => candidate === cleanTarget);
    if (exactMatch) return exactMatch;

    // Handle demonstratives like "that spirit", "the keeper"
    if (cleanTarget.startsWith('that ') || cleanTarget.startsWith('the ')) {
      const noun = cleanTarget.replace(/^(that|the)\s+/, '');
      const partialMatch = candidates.find(candidate => 
        candidate.toLowerCase().includes(noun) ||
        noun.split(' ').some(word => candidate.includes(word))
      );
      if (partialMatch) return partialMatch;
    }

    // Partial match (any word in target appears in candidate)
    const words = cleanTarget.split(' ');
    const partialMatch = candidates.find(candidate =>
      words.some(word => word.length > 2 && candidate.includes(word))
    );
    
    return partialMatch || null;
  }

  /**
   * Clean target phrase for matching
   */
  private cleanTargetPhrase(phrase: string): string {
    return phrase
      .toLowerCase()
      .replace(/^(to|with|at|on|in)\s+/, '') // Remove prepositions
      .replace(/^(a|an)\s+/, '') // Remove articles
      .trim();
  }
}