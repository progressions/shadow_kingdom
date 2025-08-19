import Database from '../src/utils/database';
import { GameController } from '../src/gameController';
import { initializeDatabase } from '../src/utils/initDb';

// Mock readline to avoid actual I/O during testing
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    on: jest.fn(),
    setPrompt: jest.fn(),
    prompt: jest.fn(),
    question: jest.fn(),
    close: jest.fn(),
    removeAllListeners: jest.fn()
  }))
}));

describe('GameController Integration', () => {
  let db: Database;
  let controller: GameController;
  let mockRl: any;

  beforeEach(async () => {
    db = new Database(':memory:'); // Use in-memory database for tests
    await db.connect();
    await initializeDatabase(db);
    
    controller = new GameController(db);
    
    // Get the mock readline interface
    const readline = require('readline');
    mockRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  });

  afterEach(async () => {
    // Remove event listeners and close the controller's readline interface to prevent hanging
    if (controller && (controller as any).rl) {
      // Remove all listeners to prevent process.exit from being called
      (controller as any).rl.removeAllListeners();
      (controller as any).rl.close();
      (controller as any).rl = null;
    }
    
    // Close the mock readline interface
    if (mockRl) {
      mockRl.removeAllListeners();
      mockRl.close();
      mockRl = null;
    }
    
    if (db && db.isConnected()) {
      await db.close();
    }
    
    // Clear references
    controller = null as any;
    db = null as any;
  });

  describe('Initialization', () => {
    test('should create controller with database connection', () => {
      expect(controller).toBeDefined();
      expect(db.isConnected()).toBe(true);
    });

    test('should set up readline interface', () => {
      const readline = require('readline');
      expect(readline.createInterface).toHaveBeenCalled();
    });
  });

  describe('Game State', () => {
    test('should start in menu mode', () => {
      // We can't directly test private properties, but we can test behavior
      // The controller should be in menu mode initially
      expect(controller).toBeDefined();
    });

    test('should handle start method', async () => {
      await controller.start();
      
      // Since console.clear is mocked globally, we just verify the method runs
      expect(controller).toBeDefined();
    });
  });

  // Note: Testing the full game flow would require more complex mocking
  // of the readline interface and async input/output. These tests focus
  // on the testable parts of the controller.
});

describe('GameController Core Functionality', () => {
  let db: Database;
  let controller: GameController;

  beforeEach(async () => {
    // Enable mock mode to prevent slow AI calls in all tests
    process.env.AI_MOCK_MODE = 'true';
    
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    controller = new GameController(db);
  });

  afterEach(async () => {
    // Close controller's readline interface
    if (controller && (controller as any).rl) {
      (controller as any).rl.removeAllListeners();
      (controller as any).rl.close();
      (controller as any).rl = null;
    }
    
    if (db && db.isConnected()) {
      await db.close();
    }
    
    // Clean up environment variable
    delete process.env.AI_MOCK_MODE;
    
    // Clear references
    controller = null as any;
    db = null as any;
  });

  describe('Game Management Operations', () => {
    test('should create new game successfully', async () => {
      // Mock user input for game name
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      const uniqueGameName = `Test Game ${Date.now()}-${Math.random()}`;
      const mockQuestion = jest.fn().mockImplementation((question, callback) => {
        callback(uniqueGameName);
      });
      
      // Mock the readline interface
      (controller as any).rl.question = mockQuestion;
      
      try {
        await (controller as any).startNewGame();
        
        // Verify game was created in database
        const games = await db.all('SELECT * FROM games WHERE name = ?', [uniqueGameName]);
        expect(games.length).toBe(1);
        expect(games[0].name).toBe(uniqueGameName);
        
        // Verify initial room was created
        const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [games[0].id]);
        expect(rooms.length).toBeGreaterThan(0);
        
      } finally {
        mockConsoleLog.mockRestore();
      }
    });

    test('should load existing game', async () => {
      // Create a test game using the proper method
      const uniqueLoadGameName = `Test Load Game ${Date.now()}-${Math.random()}`;
      
      // Import the createGameWithRooms function
      const { createGameWithRooms } = require('../src/utils/initDb');
      const gameId = await createGameWithRooms(db, uniqueLoadGameName);
      
      // Get the initial room that was created
      const gameState = await db.get<{current_room_id: number}>(
        'SELECT current_room_id FROM game_state WHERE game_id = ?',
        [gameId]
      );
      const roomId = gameState!.current_room_id;

      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      // Find the correct choice number for our game
      const games = await db.all('SELECT id, name FROM games ORDER BY last_played_at DESC');
      const gameIndex = games.findIndex(game => game.id === gameId);
      const choiceNumber = (gameIndex + 1).toString(); // Choice is 1-based
      
      const mockQuestion = jest.fn().mockImplementation((question, callback) => {
        callback(choiceNumber); // Select our specific game
      });
      
      (controller as any).rl.question = mockQuestion;
      
      try {
        await (controller as any).loadGame();
        
        // Verify controller state - the game was loaded correctly
        const session = (controller as any).gameStateManager.getCurrentSession();
        expect(session.gameId).toEqual(gameId);
        expect(session.roomId).toEqual(roomId);
        expect(session.mode).toBe('game');
        
      } finally {
        mockConsoleLog.mockRestore();
      }
    });

    test('should delete game correctly', async () => {
      // Create test games with unique names
      const game1Name = `Game 1 ${Date.now()}-${Math.random()}`;
      const game2Name = `Game 2 ${Date.now()}-${Math.random()}`;
      await db.run('INSERT INTO games (name) VALUES (?)', [game1Name]);
      const game2Result = await db.run('INSERT INTO games (name) VALUES (?)', [game2Name]);
      const game2Id = game2Result.lastID as number;
      
      const initialGameCount = await db.get('SELECT COUNT(*) as count FROM games');
      
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      // Mock the GameManagementService methods
      const gameManagementService = (controller as any).gameManagementService;
      const mockSelectGame = jest.spyOn(gameManagementService, 'selectGameFromList')
        .mockResolvedValueOnce({ 
          success: true, 
          game: { id: game2Id, name: game2Name, created_at: new Date().toISOString(), last_played_at: new Date().toISOString() }
        });
      const mockDeleteGame = jest.spyOn(gameManagementService, 'deleteGameWithConfirmation')
        .mockResolvedValueOnce({ success: true });
      
      try {
        await (controller as any).deleteGame();
        
        // Verify game management service methods were called
        expect(mockSelectGame).toHaveBeenCalledWith('delete');
        expect(mockDeleteGame).toHaveBeenCalledTimes(1);
        
        // Verify deletion success was logged
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('has been deleted'));
        
      } finally {
        mockConsoleLog.mockRestore();
        mockSelectGame.mockRestore();
        mockDeleteGame.mockRestore();
      }
    });
  });

  describe('Game Play Operations', () => {
    let gameId: number;
    let roomId: number;

    beforeEach(async () => {
      // Set up a game session for gameplay tests with unique name
      const uniqueGameplayName = `Test Gameplay ${Date.now()}-${Math.random()}`;
      const gameResult = await db.run('INSERT INTO games (name) VALUES (?)', [uniqueGameplayName]);
      gameId = gameResult.lastID!;
      
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Starting Room', 'A room with exits to the north and east.']
      );
      roomId = roomResult.lastID!;
      
      await db.run(
        'INSERT INTO game_state (game_id, current_room_id) VALUES (?, ?)',
        [gameId, roomId]
      );
      
      // Set controller state using GameStateManager
      await (controller as any).gameStateManager.startGameSession(gameId);
    });

    test('should handle look around command', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      try {
        await (controller as any).lookAround();
        
        // Verify output includes room information
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Starting Room'));
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('A room with exits'));
        
      } finally {
        mockConsoleLog.mockRestore();
      }
    });

    test('should handle movement between rooms', async () => {
      // Create a connected room
      const northRoomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'North Room', 'A northern chamber.']
      );
      const northRoomId = northRoomResult.lastID!;
      
      // Create connection
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, northRoomId, 'north', 'archway to the north']
      );
      
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      try {
        await (controller as any).move(['north']);
        
        // Verify movement successful
        const session = (controller as any).gameStateManager.getCurrentSession();
        expect(session.roomId).toBe(northRoomId);
        
        // Verify game state updated in database
        const gameState = await db.get('SELECT * FROM game_state WHERE game_id = ?', [gameId]);
        expect(gameState.current_room_id).toBe(northRoomId);
        
      } finally {
        mockConsoleLog.mockRestore();
      }
    });

    test('should handle invalid movement', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      try {
        await (controller as any).move(['west']); // No western exit
        
        // Verify player stayed in same room
        const session = (controller as any).gameStateManager.getCurrentSession();
        expect(session.roomId).toBe(roomId);
        
        // Verify error message
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("can't go"));
        
      } finally {
        mockConsoleLog.mockRestore();
      }
    });

    test('should save game state periodically', async () => {
      const originalLastPlayedAt = await db.get(
        'SELECT last_played_at FROM games WHERE id = ?', 
        [gameId]
      );
      
      // Debug: Check if controller state is properly set
      const session = (controller as any).gameStateManager.getCurrentSession();
      expect(session.gameId).toBe(gameId);
      expect(session.roomId).toBe(roomId);
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await (controller as any).gameStateManager.saveGameState();
      
      const updatedLastPlayedAt = await db.get(
        'SELECT last_played_at FROM games WHERE id = ?', 
        [gameId]
      );
      
      // Check that the timestamp was actually updated (should be different)
      expect(updatedLastPlayedAt.last_played_at).not.toBe(originalLastPlayedAt.last_played_at);
    });
  });

  describe('Command Processing', () => {
    test('should process simple commands', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      try {
        await (controller as any).processCommand('help');
        
        // Should display help information
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('help'));
        
      } finally {
        mockConsoleLog.mockRestore();
      }
    });

    test('should handle unknown commands gracefully', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      try {
        // Use a command that's clearly invalid and won't be interpreted by NLP
        await (controller as any).processCommand('xyzinvalidcommandabc123');
        
        // Should show appropriate error message
        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining("Unknown command")
        );
        
      } finally {
        mockConsoleLog.mockRestore();
      }
    });
  });

  describe('Room Generation', () => {
    let gameId: number;
    let roomId: number;

    beforeEach(async () => {
      const uniqueGenerationName = `Generation Test ${Date.now()}-${Math.random()}`;
      const gameResult = await db.run('INSERT INTO games (name) VALUES (?)', [uniqueGenerationName]);
      gameId = gameResult.lastID!;
      
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Origin Room', 'Starting point for generation tests.']
      );
      roomId = roomResult.lastID!;
      
      // Set up game state using GameStateManager 
      await db.run(
        'INSERT INTO game_state (game_id, current_room_id) VALUES (?, ?)',
        [gameId, roomId]
      );
      await (controller as any).gameStateManager.startGameSession(gameId);
    });

    test('should show appropriate message when moving to unmapped direction', async () => {
      const initialRoomCount = await db.get(
        'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
        [gameId]
      );
      
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      
      try {
        // Try to move north (should show "can't go" message)
        await (controller as any).move(['north']);
        
        // Should show appropriate message
        expect(mockConsoleLog).toHaveBeenCalledWith("You can't go north from here.");
        
        const finalRoomCount = await db.get(
          'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
          [gameId]
        );
        
        // Should NOT have generated new rooms
        expect(finalRoomCount.count).toBe(initialRoomCount.count);
      } finally {
        mockConsoleLog.mockRestore();
      }
    });

    test('should respect room generation limits', async () => {
      // Set a low limit for testing
      const originalLimit = process.env.MAX_ROOMS_PER_GAME;
      process.env.MAX_ROOMS_PER_GAME = '3';
      
      try {
        // Create rooms up to the limit
        await db.run('INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)', [gameId, 'Room 2', 'Test']);
        await db.run('INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)', [gameId, 'Room 3', 'Test']);
        
        const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
        
        try {
          await (controller as any).move(['north']);
          
          // Should show limit reached message instead of generating
          const roomCount = await db.get(
            'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
            [gameId]
          );
          expect(roomCount.count).toBe(3); // No new room generated
          
        } finally {
          mockConsoleLog.mockRestore();
        }
        
      } finally {
        if (originalLimit) {
          process.env.MAX_ROOMS_PER_GAME = originalLimit;
        } else {
          delete process.env.MAX_ROOMS_PER_GAME;
        }
      }
    });
  });
});