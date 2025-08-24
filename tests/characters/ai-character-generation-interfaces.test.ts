/**
 * Tests for AI Character Generation Interfaces
 * Phase 1 verification: Ensure interfaces compile and work correctly
 */

import { GeneratedRoom, GeneratedCharacter } from '../../src/ai/grokClient';

describe('AI Character Generation Interfaces', () => {
  describe('GeneratedCharacter Interface', () => {
    test('should accept valid NPC character data', () => {
      const npc: GeneratedCharacter = {
        name: "Wise Librarian",
        description: "An elderly sage surrounded by ancient tomes",
        type: "npc",
        personality: "Scholarly and helpful",
        initialDialogue: "Welcome, seeker of knowledge!",
        attributes: {
          intelligence: 16,
          wisdom: 14
        }
      };

      expect(npc.name).toBe("Wise Librarian");
      expect(npc.type).toBe("npc");
      expect(npc.attributes?.intelligence).toBe(16);
    });

    test('should accept valid enemy character data', () => {
      const enemy: GeneratedCharacter = {
        name: "Dungeon Guard",
        description: "A heavily armored warrior blocking the passage",
        type: "enemy",
        level: 3,
        isHostile: true,
        attributes: {
          strength: 15,
          constitution: 14
        }
      };

      expect(enemy.name).toBe("Dungeon Guard");
      expect(enemy.type).toBe("enemy");
      expect(enemy.level).toBe(3);
      expect(enemy.isHostile).toBe(true);
    });

    test('should allow minimal character data', () => {
      const minimal: GeneratedCharacter = {
        name: "Mysterious Figure",
        description: "A shadowy presence",
        type: "npc"
      };

      expect(minimal.name).toBe("Mysterious Figure");
      expect(minimal.type).toBe("npc");
      expect(minimal.personality).toBeUndefined();
      expect(minimal.attributes).toBeUndefined();
    });
  });

  describe('GeneratedRoom Interface with Characters', () => {
    test('should accept room with characters array', () => {
      const room: GeneratedRoom = {
        name: "Ancient Library",
        description: "Books line the walls of this mystical chamber",
        items: [
          {
            name: "Glowing Orb",
            description: "A crystal orb pulsing with light",
            isFixed: true
          }
        ],
        characters: [
          {
            name: "Elder Sage",
            description: "A wise keeper of ancient knowledge",
            type: "npc",
            personality: "Cryptic and knowledgeable"
          }
        ]
      };

      expect(room.name).toBe("Ancient Library");
      expect(room.characters).toHaveLength(1);
      expect(room.characters![0].name).toBe("Elder Sage");
      expect(room.characters![0].type).toBe("npc");
    });

    test('should accept room without characters array', () => {
      const room: GeneratedRoom = {
        name: "Empty Chamber",
        description: "A silent, empty room"
      };

      expect(room.name).toBe("Empty Chamber");
      expect(room.characters).toBeUndefined();
    });

    test('should accept room with empty characters array', () => {
      const room: GeneratedRoom = {
        name: "Deserted Hall",
        description: "Once bustling, now empty",
        characters: []
      };

      expect(room.name).toBe("Deserted Hall");
      expect(room.characters).toEqual([]);
    });

    test('should accept room with multiple characters', () => {
      const room: GeneratedRoom = {
        name: "Bustling Tavern",
        description: "A lively tavern filled with patrons",
        characters: [
          {
            name: "Tavern Keeper",
            description: "A friendly innkeeper",
            type: "npc",
            personality: "Cheerful and talkative"
          },
          {
            name: "Rowdy Patron",
            description: "A drunk causing trouble",
            type: "enemy",
            isHostile: false
          }
        ]
      };

      expect(room.characters).toHaveLength(2);
      expect(room.characters![0].type).toBe("npc");
      expect(room.characters![1].type).toBe("enemy");
      expect(room.characters![1].isHostile).toBe(false);
    });
  });
});