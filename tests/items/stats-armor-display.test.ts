import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { MockTUI } from '../mocks/mockTUI';
import { ItemService } from '../../src/services/itemService';
import { EquipmentService } from '../../src/services/equipmentService';
import { ItemType, EquipmentSlot } from '../../src/types/item';

describe('Stats Command Armor Display', () => {
  let db: Database;
  let gameController: GameController;
  let mockTUI: MockTUI;
  let itemService: ItemService;
  let equipmentService: EquipmentService;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    mockTUI = new MockTUI();
    gameController = new GameController(db, 'test', mockTUI);
    
    // Get services from controller
    const controllerAny = gameController as any;
    itemService = controllerAny.itemService;
    equipmentService = controllerAny.equipmentService;
  });

  afterEach(async () => {
    await db.close();
  });

  test('stats command should display total armor bonus', async () => {
    // Create a new game with starter items
    const gameId = await createGameWithRooms(db, `Stats Test ${Date.now()}`);
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    const entranceHallId = rooms.find(r => r.name === 'Grand Entrance Hall')?.id;
    
    // Load the game
    const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
    await (gameController as any).loadSelectedGame(game, true);

    // Get the character ID from game state
    const gameState = await (gameController as any).gameStateManager.getGameState(gameId);
    const characterId = gameState.character_id;

    // Find Chain Mail and Leather Boots in entrance hall
    const entranceItems = await itemService.getRoomItems(entranceHallId);
    const chainMail = entranceItems.find(ri => ri.item.name === 'Chain Mail');
    const leatherBoots = entranceItems.find(ri => ri.item.name === 'Leather Boots');

    // Pick up and equip both armor pieces
    if (chainMail) {
      await itemService.transferItemToInventory(characterId, chainMail.item_id, entranceHallId, 1);
      await equipmentService.equipItem(characterId, chainMail.item_id);
    }
    
    if (leatherBoots) {
      await itemService.transferItemToInventory(characterId, leatherBoots.item_id, entranceHallId, 1);
      await equipmentService.equipItem(characterId, leatherBoots.item_id);
    }

    // Clear messages and run stats command
    mockTUI.clearMessages();
    await (gameController as any).processCommand('stats');

    const messages = mockTUI.getMessages();
    
    // Should display armor section
    expect(messages.some((msg: string) => msg.includes('--- ARMOR ---'))).toBe(true);
    expect(messages.some((msg: string) => msg.includes('Total Armor: 3 (damage reduction)'))).toBe(true);
  });
});