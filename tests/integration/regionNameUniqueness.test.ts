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

  test.skip('should pass existing region names to AI when generating new regions (DISABLED - Phase 9 cleanup)', async () => {
    // NOTE: shouldCreateNewRegion method removed in Phase 9 cleanup
    // This test relied on probability-based region creation which was simplified
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

  test.skip('should only include regions from the current game (DISABLED - Phase 9 cleanup)', async () => {
    // NOTE: shouldCreateNewRegion method removed in Phase 9 cleanup
  });

  test.skip('should exclude regions without names from existing regions list (DISABLED - Phase 9 cleanup)', async () => {
    // NOTE: shouldCreateNewRegion method removed in Phase 9 cleanup
  });
});