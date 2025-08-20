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


  describe('Spatial Reference Resolution', () => {
    test('should resolve "the door" to room feature', async () => {
      const result = await resolver.resolveContext('open the door', baseContext);
      
      expect(result).not.toBeNull();
      if (result && 'action' in result && 'resolvedObjects' in result) {
        expect(result.action).toBe('open');
        expect(result.resolvedObjects).toHaveLength(1);
        expect(result.resolvedObjects[0].originalRef).toBe('the door');
        expect(result.resolvedObjects[0].resolvedName).toBe('oak door');
        expect(result.resolvedObjects[0].resolutionType).toBe('spatial');
      } else {
        fail('Expected ResolvedCommand with action and resolvedObjects');
      }
    });

    test('should resolve "fountain" without article', async () => {
      const result = await resolver.resolveContext('examine fountain', baseContext);
      
      expect(result).not.toBeNull();
      if (result && 'resolvedObjects' in result) {
        expect(result.resolvedObjects[0].resolvedName).toBe('marble fountain');
        expect(result.resolvedObjects[0].resolutionType).toBe('spatial');
      } else {
        fail('Expected ResolvedCommand with resolvedObjects');
      }
    });

    test('should handle aliases for spatial features', async () => {
      const result = await resolver.resolveContext('look at basin', baseContext);
      
      expect(result).not.toBeNull();
      if (result && 'resolvedObjects' in result) {
        expect(result.resolvedObjects[0].resolvedName).toBe('marble fountain');
      }
    });
  });


  describe('Contextual Object Resolution', () => {
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
      expect(isCompoundCommand(result)).toBe(true);
      
      if (isCompoundCommand(result)) {
        expect(result.commands).toHaveLength(2);
        expect(result.connector).toBe('and');
        
        // First command
        expect(result.commands[0].action).toBe('take');
        expect(result.commands[0].resolvedObjects[0].resolvedName).toBe('rusty sword');
        
        // Second command with pronoun resolution
        expect(result.commands[1].action).toBe('examine');
        expect(result.commands[1].resolvedObjects[0].resolutionType).toBe('pronoun');
      }
    });

    test('should parse "then" compound commands', async () => {
      const result = await resolver.resolveContext('open door then go north', baseContext);
      
      expect(result).not.toBeNull();
      expect(isCompoundCommand(result)).toBe(true);
      
      if (isCompoundCommand(result)) {
        expect(result.connector).toBe('then');
        expect(result.commands).toHaveLength(2);
      }
    });

    test('should parse comma-separated compound commands', async () => {
      const result = await resolver.resolveContext('take key, use it', baseContext);
      
      expect(result).not.toBeNull();
      expect(isCompoundCommand(result)).toBe(true);
      
      if (isCompoundCommand(result)) {
        expect(result.connector).toBe('and');
      }
    });

  });


  describe('Context Management', () => {
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

  });

});