import { CharacterSentiment, CharacterType, Character, CreateCharacterData, getSentimentValue, isHostileToPlayer, getSentimentDescription } from '../../src/types/character';

describe('Character Sentiment Types', () => {
  describe('Phase 2: TypeScript Type Definitions', () => {
    it('should define CharacterSentiment enum with correct values', () => {
      // Test enum values exist
      expect(CharacterSentiment.HOSTILE).toBe('hostile');
      expect(CharacterSentiment.AGGRESSIVE).toBe('aggressive');
      expect(CharacterSentiment.INDIFFERENT).toBe('indifferent');
      expect(CharacterSentiment.FRIENDLY).toBe('friendly');
      expect(CharacterSentiment.ALLIED).toBe('allied');
    });

    it('should ensure enum has exactly 5 values', () => {
      const sentimentValues = Object.values(CharacterSentiment);
      expect(sentimentValues).toHaveLength(5);
      expect(sentimentValues).toEqual(['hostile', 'aggressive', 'indifferent', 'friendly', 'allied']);
    });

    it('should add sentiment field to Character interface', () => {
      // This test verifies the Character interface has sentiment field
      const testCharacter: Character = {
        id: 1,
        game_id: 1,
        name: 'Test Character',
        type: CharacterType.NPC,
        current_room_id: 1,
        strength: 10,
        dexterity: 10,
        intelligence: 10,
        constitution: 10,
        wisdom: 10,
        charisma: 10,
        max_health: 10,
        current_health: 10,
        sentiment: CharacterSentiment.INDIFFERENT,
        is_hostile: false, // @deprecated field should still exist
        created_at: '2025-08-22 10:00:00'
      };

      expect(testCharacter.sentiment).toBe(CharacterSentiment.INDIFFERENT);
      expect(testCharacter.is_hostile).toBe(false);
    });

    it('should add sentiment field to CreateCharacterData interface', () => {
      // This test verifies the CreateCharacterData interface has sentiment field
      const testData: CreateCharacterData = {
        game_id: 1,
        name: 'Test Character',
        type: CharacterType.NPC,
        sentiment: CharacterSentiment.FRIENDLY,
        is_hostile: false // @deprecated field should still exist
      };

      expect(testData.sentiment).toBe(CharacterSentiment.FRIENDLY);
      expect(testData.is_hostile).toBe(false);
    });

    it('should provide getSentimentValue function for numeric conversion', () => {
      expect(getSentimentValue(CharacterSentiment.HOSTILE)).toBe(-2);
      expect(getSentimentValue(CharacterSentiment.AGGRESSIVE)).toBe(-1);
      expect(getSentimentValue(CharacterSentiment.INDIFFERENT)).toBe(0);
      expect(getSentimentValue(CharacterSentiment.FRIENDLY)).toBe(1);
      expect(getSentimentValue(CharacterSentiment.ALLIED)).toBe(2);
    });

    it('should provide isHostileToPlayer function for behavioral logic', () => {
      expect(isHostileToPlayer(CharacterSentiment.HOSTILE)).toBe(true);
      expect(isHostileToPlayer(CharacterSentiment.AGGRESSIVE)).toBe(true);
      expect(isHostileToPlayer(CharacterSentiment.INDIFFERENT)).toBe(false);
      expect(isHostileToPlayer(CharacterSentiment.FRIENDLY)).toBe(false);
      expect(isHostileToPlayer(CharacterSentiment.ALLIED)).toBe(false);
    });

    it('should provide getSentimentDescription function for UI display', () => {
      expect(getSentimentDescription(CharacterSentiment.HOSTILE)).toBe('Actively aggressive, attacks on sight');
      expect(getSentimentDescription(CharacterSentiment.AGGRESSIVE)).toBe('Will fight if provoked, blocks passage');
      expect(getSentimentDescription(CharacterSentiment.INDIFFERENT)).toBe('Neutral, allows passage');
      expect(getSentimentDescription(CharacterSentiment.FRIENDLY)).toBe('Helpful responses, assists player');
      expect(getSentimentDescription(CharacterSentiment.ALLIED)).toBe('Actively supports and protects player');
    });

    it('should ensure backward compatibility with is_hostile field', () => {
      // Test that both fields can coexist
      const character: Character = {
        id: 1,
        game_id: 1,
        name: 'Backward Compatible Character',
        type: CharacterType.ENEMY,
        current_room_id: 1,
        strength: 10,
        dexterity: 10,
        intelligence: 10,
        constitution: 10,
        wisdom: 10,
        charisma: 10,
        max_health: 10,
        current_health: 10,
        sentiment: CharacterSentiment.AGGRESSIVE, // New field
        is_hostile: true, // @deprecated but still present
        created_at: '2025-08-22 10:00:00'
      };

      expect(character.sentiment).toBe(CharacterSentiment.AGGRESSIVE);
      expect(character.is_hostile).toBe(true);
    });

    it('should support type safety with sentiment enum', () => {
      // This test ensures TypeScript enforces correct sentiment values
      const validSentiments: CharacterSentiment[] = [
        CharacterSentiment.HOSTILE,
        CharacterSentiment.AGGRESSIVE,
        CharacterSentiment.INDIFFERENT,
        CharacterSentiment.FRIENDLY,
        CharacterSentiment.ALLIED
      ];

      validSentiments.forEach(sentiment => {
        const character: Partial<Character> = {
          sentiment: sentiment
        };
        expect(Object.values(CharacterSentiment)).toContain(character.sentiment);
      });
    });
  });
});