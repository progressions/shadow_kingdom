import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { GrokClient } from '../../src/ai/grokClient';
import { RoomGenerationService } from '../../src/services/roomGenerationService';
import { RegionService } from '../../src/services/regionService';
import { ItemGenerationService } from '../../src/services/itemGenerationService';
import { ItemService } from '../../src/services/itemService';
import { CharacterGenerationService } from '../../src/services/characterGenerationService';
import { CharacterService } from '../../src/services/characterService';
import { FantasyLevelService } from '../../src/services/fantasyLevelService';

describe.skip('Region Name Uniqueness Integration (DISABLED - Phase 9 cleanup removed old region generation)', () => {
  let db: Database;
  let grokClient: GrokClient;
  let regionService: RegionService;
  let roomGenerationService: RoomGenerationService;
  let testGameId: number;
  let testRoomId: number;

  beforeEach(async () => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Create test services with mock mode enabled
    grokClient = new GrokClient({ mockMode: true });
    regionService = new RegionService(db, { enableDebugLogging: false });
    const itemService = new ItemService(db);
    const characterService = new CharacterService(db);
    const itemGenerationService = new ItemGenerationService(db, itemService);
    const characterGenerationService = new CharacterGenerationService(db, characterService);
    const fantasyLevelService = new FantasyLevelService();

    roomGenerationService = new RoomGenerationService(
      db,
      grokClient,
      regionService,
      itemGenerationService,
      characterGenerationService,
      fantasyLevelService,
      { enableDebugLogging: false }
    );

    // Create test game with unique name
    const uniqueGameName = `Test Game ${Date.now()}-${Math.random()}`;
    const gameResult = await db.run(
      'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
      [uniqueGameName, new Date().toISOString(), new Date().toISOString()]
    );
    testGameId = gameResult.lastID!;

    // Create test room
    const roomResult = await db.run(
      'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
      [testGameId, 'Starting Room', 'A test starting room']
    );
    testRoomId = roomResult.lastID!;
  });

  afterEach(async () => {
    await db.close();
  });

  test('should pass existing region names to AI when generating new regions', async () => {
    // Create existing regions with names
    await regionService.createRegion(testGameId, 'mansion', 'A grand mansion', 'Blackwood Manor');
    await regionService.createRegion(testGameId, 'forest', 'Dense woods', 'Whispering Woods');
    await regionService.createRegion(testGameId, 'cave', 'Underground caves', 'Crystal Caverns');

    // Spy on the GrokClient's generateRegion method to verify it receives existing region names
    const generateRegionSpy = jest.spyOn(grokClient, 'generateRegion');
    // Force new region creation by mocking shouldCreateNewRegion
    const shouldCreateNewRegionSpy = jest.spyOn(regionService, 'shouldCreateNewRegion').mockResolvedValue(true);

    // Set up room with region assignment to trigger new region creation
    await db.run(
      'UPDATE rooms SET region_id = ?, region_distance = ? WHERE id = ?',
      [1, 5, testRoomId] // High distance to trigger new region creation
    );

    // Generate a new room which should create a new region
    await roomGenerationService.generateSingleRoom({
      gameId: testGameId,
      fromRoomId: testRoomId,
      direction: 'north'
    });

    // Verify that generateRegion was called with existing regions
    expect(generateRegionSpy).toHaveBeenCalled();
    const callArgs = generateRegionSpy.mock.calls[0][0];
    expect(callArgs.existingRegions).toEqual(['Blackwood Manor', 'Whispering Woods', 'Crystal Caverns']);

    // Restore mocks
    shouldCreateNewRegionSpy.mockRestore();
  });

  test('should handle empty existing regions list', async () => {
    // No existing regions
    const generateRegionSpy = jest.spyOn(grokClient, 'generateRegion');

    // Generate a new room which should create the first region
    await roomGenerationService.generateSingleRoom({
      gameId: testGameId,
      fromRoomId: testRoomId,
      direction: 'north'
    });

    // Verify that generateRegion was called with empty regions list
    expect(generateRegionSpy).toHaveBeenCalled();
    const callArgs = generateRegionSpy.mock.calls[0][0];
    expect(callArgs.existingRegions).toBeUndefined();
  });

  test('should only include regions from the current game', async () => {
    // Create regions in current game
    await regionService.createRegion(testGameId, 'mansion', 'A grand mansion', 'Shadow Manor');

    // Create another game with different regions
    const otherGameResult = await db.run(
      'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
      [`Other Game ${Date.now()}`, new Date().toISOString(), new Date().toISOString()]
    );
    const otherGameId = otherGameResult.lastID!;
    await regionService.createRegion(otherGameId, 'tower', 'A tall tower', 'Ivory Tower');

    const generateRegionSpy = jest.spyOn(grokClient, 'generateRegion');
    // Force new region creation by mocking shouldCreateNewRegion
    const shouldCreateNewRegionSpy = jest.spyOn(regionService, 'shouldCreateNewRegion').mockResolvedValue(true);

    // Set up room to trigger new region creation
    await db.run(
      'UPDATE rooms SET region_id = ?, region_distance = ? WHERE id = ?',
      [1, 5, testRoomId]
    );

    await roomGenerationService.generateSingleRoom({
      gameId: testGameId,
      fromRoomId: testRoomId,
      direction: 'north'
    });

    // Verify only current game's regions are included
    expect(generateRegionSpy).toHaveBeenCalled();
    const callArgs = generateRegionSpy.mock.calls[0][0];
    expect(callArgs.existingRegions).toEqual(['Shadow Manor']);
    expect(callArgs.existingRegions).not.toContain('Ivory Tower');

    // Restore mocks
    shouldCreateNewRegionSpy.mockRestore();
  });

  test('should exclude regions without names from existing regions list', async () => {
    // Create mix of named and unnamed regions
    await regionService.createRegion(testGameId, 'mansion', 'A grand mansion', 'Named Manor');
    await regionService.createRegion(testGameId, 'forest', 'Dense woods'); // No name
    await regionService.createRegion(testGameId, 'cave', 'Underground caves', 'Crystal Caverns');

    const generateRegionSpy = jest.spyOn(grokClient, 'generateRegion');
    // Force new region creation by mocking shouldCreateNewRegion
    const shouldCreateNewRegionSpy = jest.spyOn(regionService, 'shouldCreateNewRegion').mockResolvedValue(true);

    // Set up room to trigger new region creation
    await db.run(
      'UPDATE rooms SET region_id = ?, region_distance = ? WHERE id = ?',
      [1, 5, testRoomId]
    );

    await roomGenerationService.generateSingleRoom({
      gameId: testGameId,
      fromRoomId: testRoomId,
      direction: 'north'
    });

    // Verify only named regions are included
    expect(generateRegionSpy).toHaveBeenCalled();
    const callArgs = generateRegionSpy.mock.calls[0][0];
    expect(callArgs.existingRegions).toEqual(['Named Manor', 'Crystal Caverns']);
    expect(callArgs.existingRegions).toHaveLength(2);

    // Restore mocks
    shouldCreateNewRegionSpy.mockRestore();
  });
});