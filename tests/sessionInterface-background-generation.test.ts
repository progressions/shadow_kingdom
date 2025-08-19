import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { shouldUseSessionMode, runSessionMode } from '../src/sessionInterface';

describe('SessionInterface Background Generation', () => {
  let db: Database;
  let testGameId: number;

  beforeEach(async () => {
    // Use test database
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Create a test game with rooms (unique name for each test)
    const uniqueName = `Test Game for SessionInterface BG ${Date.now()}_${Math.random()}`;
    testGameId = await createGameWithRooms(db, uniqueName);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Visit-to-Lock Mechanism', () => {
    test('should mark rooms as processed when visited via sessionInterface', async () => {
      // Check initial state - rooms should be unprocessed
      const initialRooms = await db.all(
        'SELECT id, name, generation_processed FROM rooms WHERE game_id = ? ORDER BY id',
        [testGameId]
      );
      
      expect(initialRooms.length).toBeGreaterThan(0);
      // All rooms should start unprocessed
      initialRooms.forEach(room => {
        expect(room.generation_processed).toBe(0);
      });

      // Mock console output to avoid cluttering test output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      try {
        // Use a persistent database file for session testing
        const sessionDb = new Database('test_session.db');
        await sessionDb.connect();
        await initializeDatabase(sessionDb);
        
        // Create the same game structure in session db
        const sessionGameId = await createGameWithRooms(sessionDb, `Session Test Game ${Date.now()}_${Math.random()}`);
        await sessionDb.close();

        // Visit a room using sessionInterface - this should mark it as processed
        process.argv = ['node', 'script.js', '--cmd', 'look', '--game-id', sessionGameId.toString()];
        
        // Execute the session command
        await runSessionMode(['--cmd', 'look', '--game-id', sessionGameId.toString()]);

        // Check if the room was marked as processed
        const updatedSessionDb = new Database('test_session.db');
        await updatedSessionDb.connect();
        
        const processedRooms = await updatedSessionDb.all(
          'SELECT id, name, generation_processed FROM rooms WHERE game_id = ? AND generation_processed = 1',
          [sessionGameId]
        );
        
        await updatedSessionDb.close();

        // At least one room should be marked as processed
        expect(processedRooms.length).toBeGreaterThan(0);

      } finally {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        
        // Clean up test session database
        try {
          const fs = require('fs');
          if (fs.existsSync('test_session.db')) {
            fs.unlinkSync('test_session.db');
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    test('should not change processed rooms when revisited', async () => {
      // Mock console output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      try {
        // Create session database
        const sessionDb = new Database('test_revisit.db');
        await sessionDb.connect();
        await initializeDatabase(sessionDb);
        
        const sessionGameId = await createGameWithRooms(sessionDb, 'Revisit Test Game');
        
        // Get initial room state
        const startingRoom = await sessionDb.get(
          'SELECT * FROM rooms WHERE game_id = ? ORDER BY id LIMIT 1',
          [sessionGameId]
        );
        
        // Mark room as processed manually to simulate first visit
        await sessionDb.run(
          'UPDATE rooms SET generation_processed = TRUE WHERE id = ?',
          [startingRoom.id]
        );
        
        // Get connections before "revisit"
        const connectionsBefore = await sessionDb.all(
          'SELECT * FROM connections WHERE from_room_id = ? ORDER BY id',
          [startingRoom.id]
        );
        
        await sessionDb.close();

        // "Revisit" the room using sessionInterface
        await runSessionMode(['--cmd', 'look', '--game-id', sessionGameId.toString()]);

        // Check if connections remained the same
        const sessionDbAfter = new Database('test_revisit.db');
        await sessionDbAfter.connect();
        
        const connectionsAfter = await sessionDbAfter.all(
          'SELECT * FROM connections WHERE from_room_id = ? ORDER BY id',
          [startingRoom.id]
        );
        
        await sessionDbAfter.close();

        // Connections should be identical (visit-to-lock working)
        expect(connectionsAfter).toEqual(connectionsBefore);

      } finally {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        
        // Clean up
        try {
          const fs = require('fs');
          if (fs.existsSync('test_revisit.db')) {
            fs.unlinkSync('test_revisit.db');
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Background Generation Integration', () => {
    test('should include background generation service in sessionInterface', async () => {
      // This test verifies that sessionInterface includes background generation
      // by checking that the service is imported and called
      
      const sessionInterfaceCode = require('fs').readFileSync(
        './src/sessionInterface.ts', 
        'utf8'
      );
      
      // Verify background generation service is imported
      expect(sessionInterfaceCode).toContain('BackgroundGenerationService');
      
      // Verify background generation is called in setupGameCommands
      expect(sessionInterfaceCode).toContain('backgroundGenerationService.preGenerateAdjacentRooms');
      
      // Verify both look and go commands trigger background generation
      expect(sessionInterfaceCode).toContain('await backgroundGenerationService.preGenerateAdjacentRooms(session.roomId!, session.gameId!)');
    });

    test('should properly await background generation to prevent database closure issues', async () => {
      const sessionInterfaceCode = require('fs').readFileSync(
        './src/sessionInterface.ts', 
        'utf8'
      );
      
      // Verify background generation is awaited (not fire-and-forget)
      const lookCommandMatch = sessionInterfaceCode.match(
        /name: 'look'[\s\S]*?handler: async \(\) => \{[\s\S]*?\}/
      );
      const goCommandMatch = sessionInterfaceCode.match(
        /name: 'go'[\s\S]*?handler: async \(args: string\[\]\) => \{[\s\S]*?\}/
      );
      
      expect(lookCommandMatch).toBeTruthy();
      expect(goCommandMatch).toBeTruthy();
      
      if (lookCommandMatch && goCommandMatch) {
        // Both commands should await background generation
        expect(lookCommandMatch[0]).toContain('await backgroundGenerationService.preGenerateAdjacentRooms');
        expect(goCommandMatch[0]).toContain('await backgroundGenerationService.preGenerateAdjacentRooms');
      }
    });
  });

  describe('Service Integration', () => {
    test('should create all required services for background generation', async () => {
      const sessionInterfaceCode = require('fs').readFileSync(
        './src/sessionInterface.ts', 
        'utf8'
      );
      
      // Verify all required services are imported and created
      const requiredServices = [
        'CommandRouter',
        'GameStateManager', 
        'RoomDisplayService',
        'RegionService',
        'RoomGenerationService',
        'BackgroundGenerationService',
        'GrokClient',
        'UnifiedNLPEngine'
      ];
      
      requiredServices.forEach(service => {
        expect(sessionInterfaceCode).toContain(service);
      });
      
      // Verify setupGameCommands receives backgroundGenerationService
      expect(sessionInterfaceCode).toContain(
        'await setupGameCommands(commandRouter, gameStateManager, roomDisplayService, regionService, backgroundGenerationService, db)'
      );
    });
  });

  describe('Architecture Compliance', () => {
    test('should NOT import or use GameController', async () => {
      const sessionInterfaceCode = require('fs').readFileSync(
        './src/sessionInterface.ts', 
        'utf8'
      );
      
      // SessionInterface should NOT use GameController
      expect(sessionInterfaceCode).not.toContain('GameController');
      expect(sessionInterfaceCode).not.toContain('new GameController');
      expect(sessionInterfaceCode).not.toContain('sessionMode');
    });

    test('should maintain separate service architecture', async () => {
      const sessionInterfaceCode = require('fs').readFileSync(
        './src/sessionInterface.ts', 
        'utf8'
      );
      
      // Should create its own service instances
      expect(sessionInterfaceCode).toContain('new GrokClient()');
      expect(sessionInterfaceCode).toContain('new GameStateManager(db');
      expect(sessionInterfaceCode).toContain('new CommandRouter(nlpEngine');
      expect(sessionInterfaceCode).toContain('new RoomDisplayService({');
      expect(sessionInterfaceCode).toContain('new RegionService(db');
      expect(sessionInterfaceCode).toContain('new RoomGenerationService(db, grokClient, regionService');
      expect(sessionInterfaceCode).toContain('new BackgroundGenerationService(db, roomGenerationService');
    });
  });
});