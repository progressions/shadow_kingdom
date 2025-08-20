import { GameManagementServicePrisma } from '../../src/services/gameManagementService.prisma';
import { GameStateManagerPrisma } from '../../src/services/gameStateManager.prisma';
import { RegionServicePrisma } from '../../src/services/regionService.prisma';
import { RoomGenerationServicePrisma } from '../../src/services/roomGenerationService.prisma';
import { BackgroundGenerationServicePrisma } from '../../src/services/backgroundGenerationService.prisma';
import { PrismaClient } from '../../src/generated/prisma';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestGame,
  createMockReadline,
  createMockGrokClient,
  assertEntityExists,
  countEntities
} from './setup';

describe.skip('Prisma Services Integration Tests', () => {
  let prisma: PrismaClient;
  let gameManagement: GameManagementServicePrisma;
  let gameStateManager: GameStateManagerPrisma;
  let regionService: RegionServicePrisma;
  let roomGeneration: RoomGenerationServicePrisma;
  let backgroundGeneration: BackgroundGenerationServicePrisma;
  let grokClient: any;
  let rl: any;

  beforeEach(async () => {
    // Setup test database
    prisma = await setupTestDatabase();
    
    // Create mock dependencies
    rl = createMockReadline();
    grokClient = createMockGrokClient();

    // Initialize services with test configuration
    gameManagement = new GameManagementServicePrisma(rl, { enableDebugLogging: false });
    gameStateManager = new GameStateManagerPrisma({ enableDebugLogging: false });
    regionService = new RegionServicePrisma({ enableDebugLogging: false });
    roomGeneration = new RoomGenerationServicePrisma(grokClient, regionService, { enableDebugLogging: false });
    backgroundGeneration = new BackgroundGenerationServicePrisma(roomGeneration, { 
      enableDebugLogging: false,
      disableBackgroundGeneration: true // Prevent hanging in tests
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    rl.close();
  });

  describe('Game Creation and Management Flow', () => {
    it('should create a game and verify all services can access it', async () => {
      // Create game with GameManagementService
      const createResult = await gameManagement.createNewGame();
      
      expect(createResult.success).toBe(true);
      expect(createResult.gameId).toBeDefined();
      expect(createResult.gameName).toBe('Test Prisma Game');

      const gameId = createResult.gameId!;

      // Verify game exists in GameStateManager
      const game = await gameStateManager.getGame(gameId);
      expect(game).toBeDefined();
      expect(game!.name).toBe('Test Prisma Game');

      // Verify regions exist for the game
      const regions = await regionService.getRegionsForGame(gameId);
      expect(regions.length).toBe(1);
      expect(regions[0].name).toBe('Shadow Kingdom Manor');
      expect(regions[0].type).toBe('mansion');

      // Verify game state management
      await gameStateManager.startGameSession(gameId);
      expect(gameStateManager.isInGame()).toBe(true);
      
      const currentRoom = await gameStateManager.getCurrentRoom();
      expect(currentRoom).toBeDefined();
      expect(currentRoom!.name).toBe('Grand Entrance Hall');

      // Verify connections exist
      const connections = await gameStateManager.getCurrentRoomConnections();
      expect(connections.length).toBeGreaterThan(0);
      
      const northConnection = connections.find(c => c.direction === 'north');
      expect(northConnection).toBeDefined();
      expect(northConnection!.name).toBe('through the ornate archway beneath celestial murals');
    });

    it('should handle room generation workflow', async () => {
      // Create game first
      const createResult = await gameManagement.createNewGame();
      const gameId = createResult.gameId!;
      
      await gameStateManager.startGameSession(gameId);
      const currentRoom = await gameStateManager.getCurrentRoom();
      
      // Test room generation
      const generationResult = await roomGeneration.generateSingleRoom({
        gameId,
        fromRoomId: currentRoom!.id,
        direction: 'west'
      });

      expect(generationResult.success).toBe(true);
      expect(generationResult.roomId).toBeDefined();
      expect(generationResult.connectionId).toBeDefined();

      // Verify the new room was created with proper region assignment
      const newRoomId = generationResult.roomId!;
      const regionContext = await regionService.buildRegionContext(newRoomId);
      
      expect(regionContext).toBeDefined();
      expect(regionContext!.region).toBeDefined();
      expect(typeof regionContext!.distanceFromCenter).toBe('number');

      // Verify connections were created
      await gameStateManager.moveToRoom(newRoomId);
      const newRoomConnections = await gameStateManager.getCurrentRoomConnections();
      
      // Debug: Check what connections exist
      if (newRoomConnections.length === 0) {
        console.log('No connections found for new room. Checking all connections...');
        const allConnections = await prisma.connection.findMany({
          where: { gameId }
        });
        console.log('All connections:', allConnections);
      }
      
      expect(newRoomConnections.length).toBeGreaterThan(0);

      // Find the connection back to the original room
      const backConnection = newRoomConnections.find(c => c.to_room_id === currentRoom!.id);
      expect(backConnection).toBeDefined();
    });

    it('should handle background generation correctly', async () => {
      // Create game and start session
      const createResult = await gameManagement.createNewGame();
      const gameId = createResult.gameId!;
      
      await gameStateManager.startGameSession(gameId);
      const currentRoom = await gameStateManager.getCurrentRoom();

      // Test background generation (synchronous in test mode)
      await backgroundGeneration.preGenerateAdjacentRooms(currentRoom!.id, gameId);

      // Verify unfilled connections exist for background generation
      const unfilledConnections = await backgroundGeneration.findUnfilledConnections(gameId);
      expect(unfilledConnections.length).toBeGreaterThan(0);

      // Test nearby unfilled connections finding
      const nearbyConnections = await backgroundGeneration.findNearbyUnfilledConnections(currentRoom!.id, gameId);
      expect(Array.isArray(nearbyConnections)).toBe(true);

      // Verify generation stats
      const stats = backgroundGeneration.getGenerationStats();
      expect(stats).toBeDefined();
      expect(typeof stats.lastGenerationTime).toBe('number');
      expect(typeof stats.activeGenerations).toBe('number');
      expect(Array.isArray(stats.roomsInProgress)).toBe(true);
    });

    it('should maintain data consistency across services', async () => {
      // Create game
      const createResult = await gameManagement.createNewGame();
      const gameId = createResult.gameId!;

      // Start session and generate some rooms
      await gameStateManager.startGameSession(gameId);
      const originalRoom = await gameStateManager.getCurrentRoom();

      // Generate a new room
      const genResult = await roomGeneration.generateSingleRoom({
        gameId,
        fromRoomId: originalRoom!.id,
        direction: 'up'
      });

      // Move to the new room
      await gameStateManager.moveToRoom(genResult.roomId!);
      
      // Verify game state was saved correctly
      const updatedSession = gameStateManager.getCurrentSession();
      expect(updatedSession.roomId).toBe(genResult.roomId);

      // Get region stats and verify consistency
      const regionStats = await regionService.getRegionStats(gameId);
      expect(regionStats.length).toBeGreaterThan(0);
      expect(regionStats[0].roomCount).toBeGreaterThan(1);

      // Verify all games are still retrievable
      const allGames = await gameManagement.getAllGames();
      const ourGame = allGames.find(g => g.id === gameId);
      expect(ourGame).toBeDefined();
      expect(ourGame!.name).toBe('Test Prisma Game');
    });

    it('should handle game deletion correctly', async () => {
      // Create multiple games
      const game1 = await gameManagement.createNewGame();
      rl.question.mockImplementationOnce((prompt: string, callback: (answer: string) => void) => {
        callback('Second Test Game');
      });
      const game2 = await gameManagement.createNewGame();

      expect(game1.success).toBe(true);
      expect(game2.success).toBe(true);

      const gameId1 = game1.gameId!;
      const gameId2 = game2.gameId!;

      // Verify both games exist
      let allGames = await gameManagement.getAllGames();
      expect(allGames.length).toBeGreaterThanOrEqual(2);

      // Delete one game
      const gameToDelete = await gameManagement.getGameById(gameId1);
      expect(gameToDelete).toBeDefined();

      const deleteResult = await gameManagement.deleteGameWithConfirmation(gameToDelete!);
      expect(deleteResult.success).toBe(true);

      // Verify game was deleted
      const deletedGame = await gameManagement.getGameById(gameId1);
      expect(deletedGame).toBeNull();

      // Verify other game still exists
      const remainingGame = await gameManagement.getGameById(gameId2);
      expect(remainingGame).toBeDefined();
      expect(remainingGame!.id).toBe(gameId2);

      // Verify game list is updated
      allGames = await gameManagement.getAllGames();
      const stillExists = allGames.find(g => g.id === gameId1);
      expect(stillExists).toBeUndefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid game operations gracefully', async () => {
      // Try to start session with non-existent game
      await expect(gameStateManager.startGameSession(99999)).rejects.toThrow();

      // Try to get non-existent game
      const nonExistentGame = await gameManagement.getGameById(99999);
      expect(nonExistentGame).toBeNull();

      // Try to get regions for non-existent game
      const regions = await regionService.getRegionsForGame(99999);
      expect(regions).toEqual([]);
    });

    it('should handle room generation errors correctly', async () => {
      // Create game and start session
      const createResult = await gameManagement.createNewGame();
      const gameId = createResult.gameId!;
      
      await gameStateManager.startGameSession(gameId);
      const currentRoom = await gameStateManager.getCurrentRoom();

      // Try to create duplicate connection
      const result1 = await roomGeneration.generateSingleRoom({
        gameId,
        fromRoomId: currentRoom!.id,
        direction: 'test-direction'
      });

      const result2 = await roomGeneration.generateSingleRoom({
        gameId,
        fromRoomId: currentRoom!.id,
        direction: 'test-direction'
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.error?.message).toContain('Connection already exists');
    });
  });

  describe('Direct Database Verification', () => {
    it('should create correct database entities', async () => {
      // Use direct test game creation
      const { game, region, entranceHall, library, garden } = await createTestGame(prisma);

      // Verify entities were created correctly
      await assertEntityExists(prisma, 'game', { id: game.id }, { name: game.name });
      await assertEntityExists(prisma, 'region', { id: region.id }, { type: 'mansion' });
      await assertEntityExists(prisma, 'room', { id: entranceHall.id }, { name: 'Grand Entrance Hall' });

      // Verify counts
      const roomCount = await countEntities(prisma, 'room', { gameId: game.id });
      expect(roomCount).toBe(3);

      const connectionCount = await countEntities(prisma, 'connection', { gameId: game.id });
      expect(connectionCount).toBe(6); // 4 filled + 2 unfilled

      // Verify unfilled connections exist
      const unfilledCount = await countEntities(prisma, 'connection', { 
        gameId: game.id, 
        toRoomId: null 
      });
      expect(unfilledCount).toBe(2);
    });
  });

  describe('Service Configuration', () => {
    it('should respect service options', async () => {
      // Test debug options
      const debugGameState = new GameStateManagerPrisma({ enableDebugLogging: true });
      expect(debugGameState.getSessionStats()).toBeDefined();

      const debugRegion = new RegionServicePrisma({ enableDebugLogging: true });
      expect(debugRegion.getOptions().enableDebugLogging).toBe(true);

      // Test option updates
      debugRegion.updateOptions({ enableDebugLogging: false });
      expect(debugRegion.getOptions().enableDebugLogging).toBe(false);

      // Test background generation options
      const bgService = new BackgroundGenerationServicePrisma(roomGeneration, {
        disableBackgroundGeneration: true
      });
      expect(bgService.getOptions().disableBackgroundGeneration).toBe(true);
    });
  });
});