import Database from '../../src/utils/database';
import { initializeTestDatabase } from '../testUtils';
import { GameController } from '../../src/gameController';
import { ItemService } from '../../src/services/itemService';
import { ItemType, EquipmentSlot } from '../../src/types/item';
import { MockTUI } from '../mocks/mockTUI';

describe('Context-Aware Equip Commands', () => {
  let db: Database;
  let gameController: GameController;
  let itemService: ItemService;
  let mockTUI: MockTUI;
  let gameId: number;
  let characterId: number;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    
    mockTUI = new MockTUI();
    gameController = new GameController(db, 'test', mockTUI);
    itemService = new ItemService(db);

    // Create test game
    const gameResult = await db.run(
      'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
      ['Test Game', new Date().toISOString(), new Date().toISOString()]
    );
    gameId = gameResult.lastID;

    // Create test character
    const characterResult = await db.run(
      'INSERT INTO characters (game_id, name, type) VALUES (?, ?, ?)',
      [gameId, 'Test Player', 'player']
    );
    characterId = characterResult.lastID;

    // Create starting room
    const roomResult = await db.run(
      'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
      [gameId, 'Test Room', 'A test room.']
    );
    const roomId = roomResult.lastID;

    // Set up game state
    await db.run(
      'INSERT INTO game_state (game_id, current_room_id, character_id) VALUES (?, ?, ?)',
      [gameId, roomId, characterId]
    );

    // Load the game
    const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
    await (gameController as any).loadSelectedGame(game, true);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Item Type Detection', () => {
    describe('isArmorItem', () => {
      it('should identify armor type items', async () => {
        // Create armor item
        const armorId = await itemService.createItem({
          name: 'Chain Mail',
          description: 'A sturdy chain mail armor',
          type: ItemType.ARMOR,
          weight: 10,
          value: 100,
          stackable: false,
          max_stack: 1
        });
        
        const armor = await itemService.getItem(armorId);
        expect(armor).toBeTruthy();
        expect((gameController as any).isArmorItem(armor!)).toBe(true);
      });

      it('should identify helmet items by name', async () => {
        const helmetId = await itemService.createItem({
          name: 'Iron Helmet',
          description: 'A protective iron helmet',
          type: ItemType.MISC,
          weight: 2,
          value: 50,
          stackable: false,
          max_stack: 1
        });
        
        const helmet = await itemService.getItem(helmetId);
        expect((gameController as any).isArmorItem(helmet!)).toBe(true);
      });

      it('should identify armor by description keywords', async () => {
        const cloakId = await itemService.createItem({
          name: 'Mystic Robe',
          description: 'A magical robe you can wear for protection',
          type: ItemType.MISC,
          weight: 1,
          value: 75,
          stackable: false,
          max_stack: 1
        });
        
        const cloak = await itemService.getItem(cloakId);
        expect((gameController as any).isArmorItem(cloak!)).toBe(true);
      });

      it('should not identify weapon items as armor', async () => {
        const swordId = await itemService.createItem({
          name: 'Iron Sword',
          description: 'A sharp iron sword',
          type: ItemType.WEAPON,
          weight: 3,
          value: 80,
          stackable: false,
          max_stack: 1
        });
        
        const sword = await itemService.getItem(swordId);
        expect((gameController as any).isArmorItem(sword!)).toBe(false);
      });
    });

    describe('isWeaponItem', () => {
      it('should identify weapon type items', async () => {
        const swordId = await itemService.createItem({
          name: 'Iron Sword',
          description: 'A sharp iron sword',
          type: ItemType.WEAPON,
          weight: 3,
          value: 80,
          stackable: false,
          max_stack: 1
        });
        
        const sword = await itemService.getItem(swordId);
        expect((gameController as any).isWeaponItem(sword!)).toBe(true);
      });

      it('should identify weapons by name keywords', async () => {
        const axeId = await itemService.createItem({
          name: 'Battle Axe',
          description: 'A heavy battle axe',
          type: ItemType.MISC,
          weight: 5,
          value: 120,
          stackable: false,
          max_stack: 1
        });
        
        const axe = await itemService.getItem(axeId);
        expect((gameController as any).isWeaponItem(axe!)).toBe(true);
      });

      it('should identify weapons by description keywords', async () => {
        const staffId = await itemService.createItem({
          name: 'Wooden Rod',
          description: 'A magical rod you can wield as a weapon',
          type: ItemType.MISC,
          weight: 2,
          value: 60,
          stackable: false,
          max_stack: 1
        });
        
        const staff = await itemService.getItem(staffId);
        expect((gameController as any).isWeaponItem(staff!)).toBe(true);
      });

      it('should not identify armor items as weapons', async () => {
        const armorId = await itemService.createItem({
          name: 'Chain Mail',
          description: 'A sturdy chain mail armor',
          type: ItemType.ARMOR,
          weight: 10,
          value: 100,
          stackable: false,
          max_stack: 1
        });
        
        const armor = await itemService.getItem(armorId);
        expect((gameController as any).isWeaponItem(armor!)).toBe(false);
      });
    });
  });

  describe('Wear Command', () => {
    beforeEach(async () => {
      // Create armor items in inventory
      const chainMailId = await itemService.createItem({
        name: 'Chain Mail',
        description: 'A sturdy chain mail armor',
        type: ItemType.ARMOR,
        weight: 10,
        value: 100,
        stackable: false,
        max_stack: 1,
        equipment_slot: EquipmentSlot.BODY
      });

      const bootsId = await itemService.createItem({
        name: 'Leather Boots',
        description: 'Comfortable leather boots',
        type: ItemType.ARMOR,
        weight: 2,
        value: 30,
        stackable: false,
        max_stack: 1,
        equipment_slot: EquipmentSlot.FOOT
      });

      const swordId = await itemService.createItem({
        name: 'Iron Sword',
        description: 'A sharp iron sword',
        type: ItemType.WEAPON,
        weight: 3,
        value: 80,
        stackable: false,
        max_stack: 1,
        equipment_slot: EquipmentSlot.HAND
      });

      // Add items to character inventory
      await itemService.addItemToCharacter(characterId, chainMailId, 1);
      await itemService.addItemToCharacter(characterId, bootsId, 1);
      await itemService.addItemToCharacter(characterId, swordId, 1);
    });

    it('should equip armor items successfully', async () => {
      mockTUI.clearMessages();
      
      await (gameController as any).processCommand('wear chain mail');
      
      const messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.includes('You equipped Chain Mail'))).toBe(true);
    });

    it('should work with partial names', async () => {
      mockTUI.clearMessages();
      
      await (gameController as any).processCommand('wear boots');
      
      const messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.includes('You equipped Leather Boots'))).toBe(true);
    });

    it('should reject weapon items', async () => {
      mockTUI.clearMessages();
      
      await (gameController as any).processCommand('wear sword');
      
      const messages = mockTUI.getMessages();
      expect(messages.some(msg => 
        msg.includes("You can't wear a Iron Sword") && 
        msg.includes('Try "equip" or "use" instead')
      )).toBe(true);
    });

    it('should handle missing items', async () => {
      mockTUI.clearMessages();
      
      await (gameController as any).processCommand('wear nonexistent');
      
      const messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.includes("You don't have a nonexistent"))).toBe(true);
    });
  });

  describe('Use Command', () => {
    beforeEach(async () => {
      // Create weapon items in inventory
      const swordId = await itemService.createItem({
        name: 'Iron Sword',
        description: 'A sharp iron sword',
        type: ItemType.WEAPON,
        weight: 3,
        value: 80,
        stackable: false,
        max_stack: 1,
        equipment_slot: EquipmentSlot.HAND
      });

      const staffId = await itemService.createItem({
        name: 'Wooden Staff',
        description: 'A magical wooden staff',
        type: ItemType.WEAPON,
        weight: 2,
        value: 60,
        stackable: false,
        max_stack: 1,
        equipment_slot: EquipmentSlot.HAND
      });

      const bootsId = await itemService.createItem({
        name: 'Leather Boots',
        description: 'Comfortable leather boots',
        type: ItemType.ARMOR,
        weight: 2,
        value: 30,
        stackable: false,
        max_stack: 1,
        equipment_slot: EquipmentSlot.FOOT
      });

      // Add items to character inventory
      await itemService.addItemToCharacter(characterId, swordId, 1);
      await itemService.addItemToCharacter(characterId, staffId, 1);
      await itemService.addItemToCharacter(characterId, bootsId, 1);
    });

    it('should equip weapon items successfully', async () => {
      mockTUI.clearMessages();
      
      await (gameController as any).processCommand('use sword');
      
      const messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.includes('You equipped Iron Sword'))).toBe(true);
    });

    it('should work with partial names', async () => {
      mockTUI.clearMessages();
      
      await (gameController as any).processCommand('use staff');
      
      const messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.includes('You equipped Wooden Staff'))).toBe(true);
    });

    it('should reject armor items', async () => {
      mockTUI.clearMessages();
      
      await (gameController as any).processCommand('use boots');
      
      const messages = mockTUI.getMessages();
      expect(messages.some(msg => 
        msg.includes("You can't use a Leather Boots as a weapon") && 
        msg.includes('Try "equip" or "wear" instead')
      )).toBe(true);
    });

    it('should handle missing items', async () => {
      mockTUI.clearMessages();
      
      await (gameController as any).processCommand('use missing');
      
      const messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.includes("You don't have a missing"))).toBe(true);
    });
  });
});