import { ContextResolver, ExtendedGameContext } from '../../src/nlp/contextResolver';

describe('ContextResolver - Core Functionality', () => {
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
        }
      ],
      roomFeatures: [
        {
          name: 'oak door',
          aliases: ['door', 'entrance'],
          type: 'door',
          canInteract: true,
          spatialRelation: 'north'
        }
      ]
    };
  });

  describe('Basic Resolution', () => {
    test('should resolve simple commands', async () => {
      const result = await resolver.resolveContext('take sword', baseContext);
      
      expect(result).not.toBeNull();
      expect('action' in result!).toBe(true);
    });

    test('should handle compound commands', async () => {
      const result = await resolver.resolveContext('take sword and examine it', baseContext);
      
      expect(result).not.toBeNull();
      expect('commands' in result!).toBe(true);
    });

    test('should return null for invalid commands', async () => {
      const result = await resolver.resolveContext('xyz invalid', baseContext);
      expect(result).toBeNull();
    });

    test('should handle empty commands', async () => {
      const result = await resolver.resolveContext('', baseContext);
      expect(result).toBeNull();
    });
  });

  describe('Context Management', () => {
    test('should update available objects', () => {
      const newObjects = [
        {
          name: 'magic staff',
          type: 'item' as const,
          aliases: ['staff'],
          location: 'room' as const,
          properties: []
        }
      ];

      resolver.updateAvailableObjects(newObjects);
      
      const stats = resolver.getContextStats();
      expect(stats.availableObjects).toBe(1);
    });

    test('should clear context', () => {
      resolver.clearContext();
      
      const stats = resolver.getContextStats();
      expect(stats.recentActions).toBe(0);
    });

    test('should provide statistics', () => {
      const stats = resolver.getContextStats();
      
      expect(stats).toHaveProperty('availableObjects');
      expect(stats).toHaveProperty('recentActions');
      expect(stats).toHaveProperty('pronounReferents');
    });
  });

  describe('Error Handling', () => {
    test('should handle context without objects', async () => {
      const emptyContext = {
        ...baseContext,
        availableObjects: undefined,
        roomFeatures: undefined
      };

      const result = await resolver.resolveContext('take something', emptyContext);
      // Should parse the command but not resolve the object
      if (result && 'action' in result) {
        expect(result.action).toBe('take');
        expect(result.resolvedObjects).toHaveLength(0);
      }
    });

    test('should handle malformed compound commands', async () => {
      const result = await resolver.resolveContext('take and examine', baseContext);
      expect(result).toBeNull();
    });
  });
});