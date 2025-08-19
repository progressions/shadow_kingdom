import { ContextResolver, ExtendedGameContext, ContextObject, RoomFeature, ResolvedCommand, CompoundCommand } from '../src/nlp/contextResolver';

// Type guards for test helpers
function isResolvedCommand(result: ResolvedCommand | CompoundCommand | null): result is ResolvedCommand {
  return result !== null && 'action' in result && !('commands' in result);
}

function isCompoundCommand(result: ResolvedCommand | CompoundCommand | null): result is CompoundCommand {
  return result !== null && 'commands' in result;
}

describe('ContextResolver', () => {
  let resolver: ContextResolver;
  let baseContext: ExtendedGameContext;

  beforeEach(() => {
    resolver = new ContextResolver();
    
    baseContext = {
      mode: 'game',
      gameId: 1,
      currentRoom: {
        id: 1,
        name: 'Test Chamber',
        description: 'A test chamber with various objects',
        availableExits: ['north', 'south']
      },
      recentCommands: [],
      availableObjects: [
        {
          name: 'rusty sword',
          type: 'item',
          aliases: ['sword', 'blade'],
          location: 'room',
          properties: []
        },
        {
          name: 'old merchant',
          type: 'npc',
          aliases: ['merchant', 'trader'],
          location: 'room',
          properties: []
        },
        {
          name: 'golden key',
          type: 'item',
          aliases: ['key'],
          location: 'inventory',
          properties: []
        }
      ],
      roomFeatures: [
        {
          name: 'oak door',
          aliases: ['door', 'entrance'],
          type: 'door',
          canInteract: true,
          spatialRelation: 'north'
        },
        {
          name: 'marble fountain',
          aliases: ['fountain', 'basin'],
          type: 'landmark',
          canInteract: true,
          spatialRelation: 'center'
        }
      ]
    };
  });

  describe('Pronoun Resolution', () => {
    test('should resolve "it" to last mentioned object', async () => {
      // First establish a referent
      await resolver.resolveContext('examine sword', baseContext);
      
      // Then use pronoun
      const result = await resolver.resolveContext('take it', baseContext);
      
      expect(result).not.toBeNull();
      expect(isResolvedCommand(result)).toBe(true);
      
      if (isResolvedCommand(result)) {
        expect(result.action).toBe('take');
        expect(result.resolvedObjects).toHaveLength(1);
        expect(result.resolvedObjects[0].originalRef).toBe('it');
        expect(result.resolvedObjects[0].resolvedName).toBe('rusty sword');
        expect(result.resolvedObjects[0].resolutionType).toBe('pronoun');
      }
    });

    test('should handle multiple pronouns in sequence', async () => {
      // Establish referent
      await resolver.resolveContext('examine merchant', baseContext);
      
      // Use pronoun
      const result1 = await resolver.resolveContext('talk to him', baseContext);
      expect(result1?.resolvedObjects[0].resolvedName).toBe('old merchant');
      
      // Switch referent
      await resolver.resolveContext('look at key', baseContext);
      
      // Use different pronoun
      const result2 = await resolver.resolveContext('use it', baseContext);
      expect(result2?.resolvedObjects[0].resolvedName).toBe('golden key');
    });

    test('should return null for unresolved pronouns', async () => {
      const result = await resolver.resolveContext('examine it', baseContext);
      expect(result).toBeNull();
    });
  });

  describe('Spatial Reference Resolution', () => {
    test('should resolve "the door" to room feature', async () => {
      const result = await resolver.resolveContext('open the door', baseContext);
      
      expect(result).not.toBeNull();
      expect(result!.action).toBe('open');
      expect(result!.resolvedObjects).toHaveLength(1);
      expect(result!.resolvedObjects[0].originalRef).toBe('the door');
      expect(result!.resolvedObjects[0].resolvedName).toBe('oak door');
      expect(result!.resolvedObjects[0].resolutionType).toBe('spatial');
    });

    test('should resolve "fountain" without article', async () => {
      const result = await resolver.resolveContext('examine fountain', baseContext);
      
      expect(result).not.toBeNull();
      expect(result!.resolvedObjects[0].resolvedName).toBe('marble fountain');
      expect(result!.resolvedObjects[0].resolutionType).toBe('spatial');
    });

    test('should handle aliases for spatial features', async () => {
      const result = await resolver.resolveContext('look at basin', baseContext);
      
      expect(result).not.toBeNull();
      expect(result!.resolvedObjects[0].resolvedName).toBe('marble fountain');
    });
  });

  describe('Exact Object Resolution', () => {
    test('should resolve exact object names', async () => {
      const result = await resolver.resolveContext('take rusty sword', baseContext);
      
      expect(result).not.toBeNull();
      expect(result!.resolvedObjects[0].originalRef).toBe('rusty sword');
      expect(result!.resolvedObjects[0].resolvedName).toBe('rusty sword');
      expect(result!.resolvedObjects[0].resolutionType).toBe('exact');
      expect(result!.resolvedObjects[0].confidence).toBe(1.0);
    });

    test('should resolve object aliases', async () => {
      const result = await resolver.resolveContext('examine blade', baseContext);
      
      expect(result).not.toBeNull();
      expect(result!.resolvedObjects[0].resolvedName).toBe('rusty sword');
      expect(result!.resolvedObjects[0].resolutionType).toBe('exact');
    });
  });

  describe('Contextual Object Resolution', () => {
    test('should resolve partial object names', async () => {
      const result = await resolver.resolveContext('take sword', baseContext);
      
      expect(result).not.toBeNull();
      expect(result!.resolvedObjects[0].resolvedName).toBe('rusty sword');
      expect(result!.resolvedObjects[0].resolutionType).toBe('contextual');
    });

    test('should handle articles in contextual matching', async () => {
      const result = await resolver.resolveContext('talk to the merchant', baseContext);
      
      expect(result).not.toBeNull();
      if (result && 'resolvedObjects' in result && result.resolvedObjects) {
        expect(result.resolvedObjects[0].resolvedName).toBe('old merchant');
      }
    });
  });

  describe('Compound Commands', () => {
    test('should parse "and" compound commands', async () => {
      const result = await resolver.resolveContext('take sword and examine it', baseContext);
      
      expect(result).not.toBeNull();
      expect('commands' in result!).toBe(true);
      
      const compound = result as any;
      expect(compound.commands).toHaveLength(2);
      expect(compound.connector).toBe('and');
      
      // First command
      expect(compound.commands[0].action).toBe('take');
      expect(compound.commands[0].resolvedObjects[0].resolvedName).toBe('rusty sword');
      
      // Second command with pronoun resolution
      expect(compound.commands[1].action).toBe('examine');
      expect(compound.commands[1].resolvedObjects[0].resolutionType).toBe('pronoun');
    });

    test('should parse "then" compound commands', async () => {
      const result = await resolver.resolveContext('open door then go north', baseContext);
      
      expect(result).not.toBeNull();
      expect('commands' in result!).toBe(true);
      
      const compound = result as any;
      expect(compound.connector).toBe('then');
      expect(compound.commands).toHaveLength(2);
    });

    test('should parse comma-separated compound commands', async () => {
      const result = await resolver.resolveContext('take key, use it', baseContext);
      
      expect(result).not.toBeNull();
      expect('commands' in result!).toBe(true);
      
      const compound = result as any;
      expect(compound.connector).toBe('and');
    });

    test('should handle pronoun chaining in compound commands', async () => {
      const result = await resolver.resolveContext('examine sword and take it', baseContext);
      
      expect(result).not.toBeNull();
      const compound = result as any;
      
      // First command establishes referent
      expect(compound.commands[0].resolvedObjects[0].resolvedName).toBe('rusty sword');
      
      // Second command uses pronoun
      expect(compound.commands[1].resolvedObjects[0].resolutionType).toBe('pronoun');
      expect(compound.commands[1].resolvedObjects[0].resolvedName).toBe('rusty sword');
    });
  });

  describe('Resolution Priority', () => {
    test('should prioritize exact matches over contextual', async () => {
      // Add ambiguous objects
      const ambiguousContext = {
        ...baseContext,
        availableObjects: [
          ...baseContext.availableObjects!,
          {
            name: 'sword',
            type: 'item' as const,
            aliases: ['weapon'],
            location: 'room' as const,
            properties: []
          }
        ]
      };

      const result = await resolver.resolveContext('take sword', ambiguousContext);
      
      expect(result).not.toBeNull();
      // Should pick the exact match "sword" over partial match "rusty sword"
      if (result && 'resolvedObjects' in result && result.resolvedObjects) {
        expect(result.resolvedObjects[0].resolvedName).toBe('sword');
        expect(result.resolvedObjects[0].resolutionType).toBe('exact');
      }
    });

    test('should prioritize pronouns over other resolutions', async () => {
      // Establish pronoun referent
      await resolver.resolveContext('examine key', baseContext);
      
      // Create ambiguous situation where "it" could match something else
      const result = await resolver.resolveContext('use it', baseContext);
      
      expect(result).not.toBeNull();
      if (result && 'resolvedObjects' in result && result.resolvedObjects) {
        expect(result.resolvedObjects[0].resolutionType).toBe('pronoun');
        expect(result.resolvedObjects[0].resolvedName).toBe('golden key');
      }
    });
  });

  describe('Context Management', () => {
    test('should clear context when requested', async () => {
      // Establish referent
      await resolver.resolveContext('examine sword', baseContext);
      
      // Clear context
      resolver.clearContext();
      
      // Pronoun should no longer resolve
      const result = await resolver.resolveContext('take it', baseContext);
      expect(result).toBeNull();
    });

    test('should update available objects', () => {
      const newObjects: ContextObject[] = [
        {
          name: 'magic staff',
          type: 'item',
          aliases: ['staff', 'wand'],
          location: 'room',
          properties: []
        }
      ];

      resolver.updateAvailableObjects(newObjects);
      
      const stats = resolver.getContextStats();
      expect(stats.availableObjects).toBe(1);
    });

    test('should track interaction history', async () => {
      await resolver.resolveContext('examine sword', baseContext);
      await resolver.resolveContext('take key', baseContext);
      
      const stats = resolver.getContextStats();
      expect(stats.recentActions).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty commands gracefully', async () => {
      const result = await resolver.resolveContext('', baseContext);
      expect(result).toBeNull();
    });

    test('should handle commands with no objects', async () => {
      const result = await resolver.resolveContext('look', baseContext);
      expect(result).toBeNull(); // Basic "look" doesn't have objects to resolve
    });

    test('should handle malformed compound commands', async () => {
      const result = await resolver.resolveContext('take and', baseContext);
      expect(result).toBeNull();
    });

    test('should handle context without available objects', async () => {
      const emptyContext = {
        ...baseContext,
        availableObjects: undefined,
        roomFeatures: undefined
      };

      const result = await resolver.resolveContext('take sword', emptyContext);
      expect(result).toBeNull();
    });
  });

  describe('Confidence Calculation', () => {
    test('should assign high confidence to exact matches', async () => {
      const result = await resolver.resolveContext('take rusty sword', baseContext);
      
      expect(result).not.toBeNull();
      if (result && 'resolvedObjects' in result && result.resolvedObjects) {
        expect(result.resolvedObjects[0].confidence).toBe(1.0);
      }
    });

    test('should assign lower confidence to contextual matches', async () => {
      const result = await resolver.resolveContext('take sword', baseContext);
      
      expect(result).not.toBeNull();
      if (result && 'resolvedObjects' in result && result.resolvedObjects) {
        expect(result.resolvedObjects[0].confidence).toBe(0.8);
      }
    });

    test('should assign high confidence to pronoun resolution', async () => {
      await resolver.resolveContext('examine sword', baseContext);
      const result = await resolver.resolveContext('take it', baseContext);
      
      expect(result).not.toBeNull();
      if (result && 'resolvedObjects' in result && result.resolvedObjects) {
        expect(result.resolvedObjects[0].confidence).toBe(0.9);
      }
    });
  });
});