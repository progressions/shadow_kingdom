/**
 * Article Parser Utility Tests
 * 
 * Comprehensive tests for article stripping and command parsing functionality
 */

import { stripArticles, parseGiveCommand, parseTalkCommand } from '../../src/utils/articleParser';

describe('stripArticles', () => {
  describe('Leading articles', () => {
    it('should remove "the" at the beginning', () => {
      expect(stripArticles('the sword')).toBe('sword');
      expect(stripArticles('the ancient key')).toBe('ancient key');
      expect(stripArticles('the wraith')).toBe('wraith');
    });

    it('should remove "a" at the beginning', () => {
      expect(stripArticles('a hammer')).toBe('hammer');
      expect(stripArticles('a goblin warrior')).toBe('goblin warrior');
      expect(stripArticles('a healing herb')).toBe('healing herb');
    });

    it('should remove "an" at the beginning', () => {
      expect(stripArticles('an apple')).toBe('apple');
      expect(stripArticles('an iron sword')).toBe('iron sword');
      expect(stripArticles('an ancient guardian')).toBe('ancient guardian');
    });
  });

  describe('Case insensitivity', () => {
    it('should handle uppercase articles', () => {
      expect(stripArticles('THE SWORD')).toBe('SWORD');
      expect(stripArticles('A Hammer')).toBe('Hammer');
      expect(stripArticles('AN Apple')).toBe('Apple');
    });

    it('should handle mixed case articles', () => {
      expect(stripArticles('The Ancient Key')).toBe('Ancient Key');
      expect(stripArticles('A Goblin Warrior')).toBe('Goblin Warrior');
      expect(stripArticles('An Iron Sword')).toBe('Iron Sword');
    });
  });

  describe('Middle articles', () => {
    it('should remove articles in the middle of phrases', () => {
      expect(stripArticles('sword of the ancients')).toBe('sword of ancients');
      expect(stripArticles('keeper of a secret')).toBe('keeper of secret');
      expect(stripArticles('guardian of an ancient temple')).toBe('guardian of ancient temple');
    });

    it('should handle multiple middle articles', () => {
      expect(stripArticles('keeper of the ancient a secret')).toBe('keeper of ancient secret');
      expect(stripArticles('sword of a the mighty an warrior')).toBe('sword of mighty warrior');
    });
  });

  describe('Complex cases', () => {
    it('should handle both leading and middle articles', () => {
      expect(stripArticles('the sword of the ancients')).toBe('sword of ancients');
      expect(stripArticles('a keeper of the sacred an flame')).toBe('keeper of sacred flame');
    });

    it('should handle multiple consecutive articles', () => {
      expect(stripArticles('the the sword')).toBe('sword');
      expect(stripArticles('a an ancient the key')).toBe('ancient key');
    });

    it('should normalize whitespace', () => {
      expect(stripArticles('the  sword   of    the   ancients')).toBe('sword of ancients');
      expect(stripArticles('  a    hammer  ')).toBe('hammer');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty or null inputs', () => {
      expect(stripArticles('')).toBe('');
      expect(stripArticles('   ')).toBe('');
      expect(stripArticles(null as any)).toBe('');
      expect(stripArticles(undefined as any)).toBe('');
    });

    it('should handle non-string inputs', () => {
      expect(stripArticles(123 as any)).toBe('');
      expect(stripArticles({} as any)).toBe('');
      expect(stripArticles([] as any)).toBe('');
    });

    it('should handle strings with only articles', () => {
      expect(stripArticles('the')).toBe('');
      expect(stripArticles('a')).toBe('');
      expect(stripArticles('an')).toBe('');
      expect(stripArticles('the a an')).toBe('');
    });

    it('should preserve strings without articles', () => {
      expect(stripArticles('sword')).toBe('sword');
      expect(stripArticles('goblin warrior')).toBe('goblin warrior');
      expect(stripArticles('iron hammer')).toBe('iron hammer');
    });

    it('should preserve articles that are part of larger words', () => {
      expect(stripArticles('theater')).toBe('theater'); // "the" in "theater"
      expect(stripArticles('anchor')).toBe('anchor');   // "an" in "anchor"
      expect(stripArticles('awake')).toBe('awake');     // "a" in "awake"
    });
  });

  describe('Real-world examples', () => {
    it('should handle typical game commands', () => {
      expect(stripArticles('the goblin warrior')).toBe('goblin warrior');
      expect(stripArticles('a healing potion')).toBe('healing potion');
      expect(stripArticles('an ancient scroll')).toBe('ancient scroll');
      expect(stripArticles('the keeper of the sacred flame')).toBe('keeper of sacred flame');
    });

    it('should preserve character names with articles', () => {
      // These would still match character names like "The Magnificent"
      expect(stripArticles('the magnificent')).toBe('magnificent');
      expect(stripArticles('a perfect gem')).toBe('perfect gem');
    });
  });
});

describe('parseGiveCommand', () => {
  describe('Simple give commands', () => {
    it('should parse "give item to target"', () => {
      const result = parseGiveCommand(['sword', 'to', 'knight']);
      expect(result).toEqual({ item: 'sword', target: 'knight' });
    });

    it('should parse with articles', () => {
      const result = parseGiveCommand(['the', 'sword', 'to', 'the', 'knight']);
      expect(result).toEqual({ item: 'sword', target: 'knight' });
    });

    it('should handle mixed articles', () => {
      const result = parseGiveCommand(['a', 'healing', 'potion', 'to', 'an', 'injured', 'warrior']);
      expect(result).toEqual({ item: 'healing potion', target: 'injured warrior' });
    });
  });

  describe('Complex give commands', () => {
    it('should handle multi-word items and targets', () => {
      const result = parseGiveCommand(['the', 'ancient', 'iron', 'sword', 'to', 'the', 'goblin', 'warrior']);
      expect(result).toEqual({ item: 'ancient iron sword', target: 'goblin warrior' });
    });

    it('should handle items with "of" phrases', () => {
      const result = parseGiveCommand(['the', 'sword', 'of', 'the', 'ancients', 'to', 'a', 'brave', 'knight']);
      expect(result).toEqual({ item: 'sword of ancients', target: 'brave knight' });
    });
  });

  describe('Edge cases', () => {
    it('should handle commands without "to"', () => {
      const result = parseGiveCommand(['the', 'sword']);
      expect(result).toEqual({ item: 'sword', target: '' });
    });

    it('should handle empty commands', () => {
      const result = parseGiveCommand([]);
      expect(result).toEqual({ item: '', target: '' });
    });

    it('should handle commands with only "to"', () => {
      const result = parseGiveCommand(['to']);
      expect(result).toEqual({ item: '', target: '' });
    });

    it('should handle multiple "to" occurrences', () => {
      // Should split on the first "to"
      const result = parseGiveCommand(['letter', 'to', 'the', 'messenger', 'to', 'deliver']);
      expect(result).toEqual({ item: 'letter', target: 'messenger to deliver' });
    });
  });
});

describe('parseTalkCommand', () => {
  describe('Direct talk commands', () => {
    it('should parse "talk character"', () => {
      expect(parseTalkCommand(['merchant'])).toBe('merchant');
      expect(parseTalkCommand(['the', 'merchant'])).toBe('merchant');
      expect(parseTalkCommand(['a', 'guard'])).toBe('guard');
    });

    it('should handle multi-word character names', () => {
      expect(parseTalkCommand(['the', 'ancient', 'guardian'])).toBe('ancient guardian');
      expect(parseTalkCommand(['goblin', 'warrior'])).toBe('goblin warrior');
    });
  });

  describe('Talk to commands', () => {
    it('should parse "talk to character"', () => {
      expect(parseTalkCommand(['to', 'merchant'])).toBe('merchant');
      expect(parseTalkCommand(['to', 'the', 'merchant'])).toBe('merchant');
      expect(parseTalkCommand(['to', 'a', 'guard'])).toBe('guard');
    });

    it('should handle "talk to" with complex names', () => {
      expect(parseTalkCommand(['to', 'the', 'ancient', 'guardian'])).toBe('ancient guardian');
      expect(parseTalkCommand(['to', 'a', 'wise', 'old', 'wizard'])).toBe('wise old wizard');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty commands', () => {
      expect(parseTalkCommand([])).toBe('');
      expect(parseTalkCommand(['to'])).toBe('');
    });

    it('should handle commands with only articles', () => {
      expect(parseTalkCommand(['the'])).toBe('');
      expect(parseTalkCommand(['to', 'the'])).toBe('');
    });
  });
});