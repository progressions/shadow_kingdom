import Database from '../../src/utils/database';
import { createGameWithRooms } from '../../src/utils/initDb';
import { initializeTestDatabase } from '../testUtils';
import { GameController } from '../../src/gameController';
import { CharacterService } from '../../src/services/characterService';
import { CharacterSentiment, CharacterType } from '../../src/types/character';
import * as readline from 'readline';

describe('Attack Command Sentiment Update', () => {
  let db: Database;
  let controller: GameController;
  let characterService: CharacterService;
  let mockRl: readline.Interface;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let gameId: number;
  let playerRoomId: number;
  let characterId: number;
  let outputSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Ensure we use legacy services
    process.env.USE_PRISMA = 'false';
    process.env.NODE_ENV = 'test';
    
    // Silence console output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Create in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);

    // Create a unique test game
    const uniqueGameName = `Attack Sentiment Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);

    // Get the starting room ID
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    playerRoomId = rooms[0].id;

    // Create mock readline interface
    mockRl = {
      question: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      setMaxListeners: jest.fn(),
      getMaxListeners: jest.fn(),
      listeners: jest.fn(),
      rawListeners: jest.fn(),
      emit: jest.fn(),
      listenerCount: jest.fn(),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      eventNames: jest.fn(),
      setPrompt: jest.fn(),
      prompt: jest.fn()
    } as any;

    // Create GameController in test mode
    controller = new GameController(db);
    // Replace the readline interface
    (controller as any).rl = mockRl;
    
    characterService = new CharacterService(db);
    
    // Mock the TUI display method to capture output
    outputSpy = jest.spyOn((controller as any).tui, 'display').mockImplementation((...args: unknown[]) => {
      // Store the message for testing
      (controller as any).lastDisplayMessage = args[0];
    });

    // Start game session
    const gameStateManager = (controller as any).gameStateManager;
    await gameStateManager.startGameSession(gameId);
    await gameStateManager.moveToRoom(playerRoomId);

    // Create a test character in the room
    characterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Test Guardian',
      description: 'A peaceful guardian',
      type: CharacterType.NPC,
      current_room_id: playerRoomId,
      sentiment: CharacterSentiment.FRIENDLY
    });
  });

  afterEach(async () => {
    if (controller) {
      await controller.cleanup();
      controller.removeEventListeners();
    }
    if (db) {
      await db.close();
    }
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    outputSpy?.mockRestore();
  });

  describe('Phase 5: Attack Command Sentiment Update', () => {
    it('should change character sentiment to hostile after successful attack', async () => {
      // Mock Math.random for D20 system - guaranteed hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);
      
      // Verify initial sentiment
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.FRIENDLY);
      expect(await characterService.isHostileToPlayer(characterId)).toBe(false);

      // Attack the character
      await (controller as any).processCommand('attack test guardian');

      // Check that sentiment changed to hostile
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.HOSTILE);
      expect(await characterService.isHostileToPlayer(characterId)).toBe(true);
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should change indifferent character to hostile when attacked', async () => {
      // Mock Math.random for D20 system - guaranteed hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);
      
      // Set character to indifferent first
      await characterService.setSentiment(characterId, CharacterSentiment.INDIFFERENT);
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.INDIFFERENT);

      // Attack the character
      await (controller as any).processCommand('attack test guardian');

      // Check that sentiment changed to hostile
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.HOSTILE);
      expect(await characterService.isHostileToPlayer(characterId)).toBe(true);
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should change allied character to hostile when attacked', async () => {
      // Mock Math.random for D20 system - guaranteed hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);
      
      // Set character to allied first
      await characterService.setSentiment(characterId, CharacterSentiment.ALLIED);
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.ALLIED);

      // Attack the character
      await (controller as any).processCommand('attack test guardian');

      // Check that sentiment changed to hostile
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.HOSTILE);
      expect(await characterService.isHostileToPlayer(characterId)).toBe(true);
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should keep already hostile character as hostile when attacked', async () => {
      // Set character to hostile first
      await characterService.setSentiment(characterId, CharacterSentiment.HOSTILE);
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.HOSTILE);

      // Attack the character
      await (controller as any).processCommand('attack test guardian');

      // Check that sentiment remains hostile
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.HOSTILE);
      expect(await characterService.isHostileToPlayer(characterId)).toBe(true);
    });

    it('should keep aggressive character as hostile after attack (not revert to aggressive)', async () => {
      // Mock Math.random for D20 system - guaranteed hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);
      
      // Set character to aggressive first
      await characterService.setSentiment(characterId, CharacterSentiment.AGGRESSIVE);
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.AGGRESSIVE);

      // Attack the character
      await (controller as any).processCommand('attack test guardian');

      // Check that sentiment changed to hostile (escalated)
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.HOSTILE);
      expect(await characterService.isHostileToPlayer(characterId)).toBe(true);
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should update sentiment even if character dies from attack', async () => {
      // Mock Math.random for D20 system - guaranteed hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);
      
      // Create a low-health character
      const lowHealthCharacterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Weak Enemy',
        description: 'An enemy with low health',
        type: CharacterType.ENEMY,
        current_room_id: playerRoomId,
        constitution: 8, // This will give less health
        sentiment: CharacterSentiment.AGGRESSIVE
      });

      // Ensure character has very low health
      await characterService.updateCharacterHealth(lowHealthCharacterId, 1); // 1 HP

      // Attack the character (should kill it)
      await (controller as any).processCommand('attack weak enemy');

      // Check that sentiment still changed to hostile even though character died
      expect(await characterService.getSentiment(lowHealthCharacterId)).toBe(CharacterSentiment.HOSTILE);
      
      // Verify character is dead
      const deadCharacter = await characterService.getCharacter(lowHealthCharacterId);
      expect(deadCharacter?.is_dead).toBe(1); // SQLite returns 1 for true
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should not update sentiment when attack fails (character not found)', async () => {
      // Verify initial sentiment
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.FRIENDLY);

      // Try to attack non-existent character (should not throw, just fail gracefully)
      await (controller as any).processCommand('attack nonexistent character');

      // Sentiment should remain unchanged
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.FRIENDLY);
    }, 30000); // 30 second timeout

    it('should not update sentiment when attacking dead character', async () => {
      // Kill the character first
      await characterService.setCharacterDead(characterId);

      // Set character to friendly
      await characterService.setSentiment(characterId, CharacterSentiment.FRIENDLY);

      // Try to attack dead character
      await (controller as any).processCommand('attack test guardian');

      // Sentiment should remain unchanged since attack didn't succeed
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.FRIENDLY);
    });

    it('should update sentiment for multiple characters when attacking each', async () => {
      // Create second character
      const secondCharacterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Test Merchant',
        description: 'A friendly merchant',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.INDIFFERENT
      });

      // Verify initial sentiments
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.FRIENDLY);
      expect(await characterService.getSentiment(secondCharacterId)).toBe(CharacterSentiment.INDIFFERENT);

      // Mock Math.random for D20 system - guaranteed hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);
      
      // Attack first character
      await (controller as any).processCommand('attack test guardian');
      
      // Attack second character
      await (controller as any).processCommand('attack test merchant');

      // Both should now be hostile
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.HOSTILE);
      expect(await characterService.getSentiment(secondCharacterId)).toBe(CharacterSentiment.HOSTILE);
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });
  });
});