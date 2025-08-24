import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { ItemService } from '../../src/services/itemService';
import { ItemType, EquipmentSlot } from '../../src/types/item';
import { MockTUI } from '../mocks/mockTUI';

describe('Context-Aware Equip Commands E2E', () => {
  let db: Database;
  let gameController: GameController;
  let itemService: ItemService;
  let mockTUI: MockTUI;
  let gameId: number;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    mockTUI = new MockTUI();
    gameController = new GameController(db, 'test', mockTUI);
    itemService = new ItemService(db);

    // Create a complete game with rooms using the helper function
    const uniqueGameName = `Context Equip E2E Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);
    
    // Load the game
    const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
    await (gameController as any).loadSelectedGame(game, true);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Full Game Integration', () => {
    it('should complete the full workflow: wear, use, equipment', async () => {
      // Get the character ID from the game
      const gameState = await db.get('SELECT * FROM game_state WHERE game_id = ?', [gameId]);
      const characterId = gameState.character_id;

      // Create test items and add directly to inventory (skipping pickup complexity)
      const chainMailId = await itemService.createItem({
        name: 'Chain Mail Armor',
        description: 'Heavy armor for protection',
        type: ItemType.ARMOR,
        weight: 15,
        value: 200,
        stackable: false,
        max_stack: 1,
        equipment_slot: EquipmentSlot.BODY,
        armor_rating: 5
      });

      const ironSwordId = await itemService.createItem({
        name: 'Iron Sword',
        description: 'A sharp iron sword for battle',
        type: ItemType.WEAPON,
        weight: 3,
        value: 150,
        stackable: false,
        max_stack: 1,
        equipment_slot: EquipmentSlot.HAND
      });

      const leatherBootsId = await itemService.createItem({
        name: 'Leather Boots',
        description: 'Comfortable leather boots',
        type: ItemType.ARMOR,
        weight: 2,
        value: 50,
        stackable: false,
        max_stack: 1,
        equipment_slot: EquipmentSlot.FOOT,
        armor_rating: 1
      });

      // Add items directly to character inventory
      await itemService.addItemToCharacter(characterId, chainMailId, 1);
      await itemService.addItemToCharacter(characterId, ironSwordId, 1);
      await itemService.addItemToCharacter(characterId, leatherBootsId, 1);

      // 1. Check inventory
      mockTUI.clearMessages();
      await (gameController as any).processCommand('inventory');
      let messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.includes('Chain Mail Armor'))).toBe(true);
      expect(messages.some(msg => msg.includes('Iron Sword'))).toBe(true);
      expect(messages.some(msg => msg.includes('Leather Boots'))).toBe(true);

      // 2. Use context-aware commands
      mockTUI.clearMessages();
      
      // Wear armor items
      await (gameController as any).processCommand('wear chain mail');
      await (gameController as any).processCommand('wear boots');
      
      // Use weapon
      await (gameController as any).processCommand('use sword');

      messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.includes('You equipped Chain Mail Armor'))).toBe(true);
      expect(messages.some(msg => msg.includes('You equipped Leather Boots'))).toBe(true);
      expect(messages.some(msg => msg.includes('You equipped Iron Sword'))).toBe(true);

      // 3. Check equipment status
      mockTUI.clearMessages();
      await (gameController as any).processCommand('equipment');
      messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.includes('Chain Mail Armor'))).toBe(true);
      expect(messages.some(msg => msg.includes('Iron Sword'))).toBe(true);
      expect(messages.some(msg => msg.includes('Leather Boots'))).toBe(true);

      // 4. Test error cases (need to unequip items first since findEquippableItem only finds unequipped items)
      await (gameController as any).processCommand('unequip sword');
      await (gameController as any).processCommand('unequip boots');
      
      mockTUI.clearMessages();
      
      // Try to wear a weapon
      await (gameController as any).processCommand('wear sword');
      messages = mockTUI.getMessages();
      expect(messages.some(msg => 
        msg.includes("You can't wear a Iron Sword") && 
        msg.includes('Try "equip" or "use" instead')
      )).toBe(true);

      // Try to use armor as weapon
      mockTUI.clearMessages();
      await (gameController as any).processCommand('use boots');
      messages = mockTUI.getMessages();
      expect(messages.some(msg => 
        msg.includes("You can't use a Leather Boots as a weapon") && 
        msg.includes('Try "equip" or "wear" instead')
      )).toBe(true);

      // 5. Test that regular equip still works
      mockTUI.clearMessages();
      await (gameController as any).processCommand('unequip sword');
      await (gameController as any).processCommand('equip sword');
      messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.includes('You equipped Iron Sword'))).toBe(true);
    });

    it('should show helpful error messages for non-existent items', async () => {
      mockTUI.clearMessages();
      
      await (gameController as any).processCommand('wear nonexistent');
      await (gameController as any).processCommand('use missing');
      
      const messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.includes("You don't have a nonexistent"))).toBe(true);
      expect(messages.some(msg => msg.includes("You don't have a missing"))).toBe(true);
    });

    it('should work with partial name matching', async () => {
      const gameState = await db.get('SELECT * FROM game_state WHERE game_id = ?', [gameId]);
      const characterId = gameState.character_id;

      // Create items with long names
      const plateMailId = await itemService.createItem({
        name: 'Enchanted Plate Mail of Protection',
        description: 'Magical plate armor',
        type: ItemType.ARMOR,
        weight: 25,
        value: 500,
        stackable: false,
        max_stack: 1,
        equipment_slot: EquipmentSlot.BODY
      });

      const bastardSwordId = await itemService.createItem({
        name: 'Bastard Sword of Flame',
        description: 'A flaming two-handed sword',
        type: ItemType.WEAPON,
        weight: 6,
        value: 300,
        stackable: false,
        max_stack: 1,
        equipment_slot: EquipmentSlot.HAND
      });

      // Add to inventory
      await itemService.addItemToCharacter(characterId, plateMailId, 1);
      await itemService.addItemToCharacter(characterId, bastardSwordId, 1);

      // Test partial matching
      mockTUI.clearMessages();
      await (gameController as any).processCommand('wear plate');
      await (gameController as any).processCommand('use bastard');

      const messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.includes('You equipped Enchanted Plate Mail of Protection'))).toBe(true);
      expect(messages.some(msg => msg.includes('You equipped Bastard Sword of Flame'))).toBe(true);
    });
  });
});