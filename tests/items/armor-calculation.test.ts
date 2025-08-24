import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { EquipmentService } from '../../src/services/equipmentService';
import { ItemService } from '../../src/services/itemService';
import { CharacterService } from '../../src/services/characterService';
import { ItemType, EquipmentSlot } from '../../src/types/item';
import { CharacterType, CharacterSentiment } from '../../src/types/character';

describe('Armor Calculation Unit Test', () => {
  let db: Database;
  let equipmentService: EquipmentService;
  let itemService: ItemService;
  let characterService: CharacterService;
  let gameId: number;
  let characterId: number;
  let roomId: number;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Create game and room
    gameId = await createGameWithRooms(db, `Armor Bug Test ${Date.now()}`);
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    roomId = rooms[0].id;

    // Initialize services
    equipmentService = new EquipmentService(db);
    itemService = new ItemService(db);
    characterService = new CharacterService(db);

    // Create player character
    characterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Test Player',
      description: 'A test player character',
      type: CharacterType.PLAYER,
      current_room_id: roomId,
      sentiment: CharacterSentiment.INDIFFERENT
    });
  });

  afterEach(async () => {
    await db.close();
  });

  test('should calculate 3 total armor points from Chain Mail (value 2) and boots (value 1)', async () => {
    // Create Chain Mail with value 2
    const chainMailId = await itemService.createItem({
      name: 'Chain Mail',
      description: 'Protective chain mail armor',
      type: ItemType.ARMOR,
      weight: 12.0,
      value: 2, // 2 armor points
      stackable: false,
      max_stack: 1,
      equipment_slot: EquipmentSlot.BODY
    });

    // Create boots with value 1
    const bootsId = await itemService.createItem({
      name: 'Leather Boots',
      description: 'Protective leather boots',
      type: ItemType.ARMOR,
      weight: 2.0,
      value: 1, // 1 armor point
      stackable: false,
      max_stack: 1,
      equipment_slot: EquipmentSlot.FOOT
    });

    // Place items in room and transfer to character inventory
    await itemService.placeItemInRoom(roomId, chainMailId, 1);
    await itemService.placeItemInRoom(roomId, bootsId, 1);
    
    await itemService.transferItemToInventory(characterId, chainMailId, roomId, 1);
    await itemService.transferItemToInventory(characterId, bootsId, roomId, 1);

    // Equip both items
    await equipmentService.equipItem(characterId, chainMailId);
    await equipmentService.equipItem(characterId, bootsId);

    // Calculate total armor points
    const totalArmorPoints = await equipmentService.calculateArmorPoints(characterId);
    
    // Should be 3 total (2 from chain mail + 1 from boots)
    expect(totalArmorPoints).toBe(3);
  });

  test('should pick up chain mail and boots from new game and equip them', async () => {
    // Start with a fresh game that has starter items
    const freshGameId = await createGameWithRooms(db, `Fresh Game ${Date.now()}`);
    const freshRooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [freshGameId]);
    const entranceHallId = freshRooms.find(r => r.name === 'Grand Entrance Hall')?.id;
    const observatoryStepsId = freshRooms.find(r => r.name === 'Observatory Steps')?.id;
    
    // Create fresh character in entrance hall
    const freshCharacterId = await characterService.createCharacter({
      game_id: freshGameId,
      name: 'Fresh Player',
      description: 'A fresh test player character',
      type: CharacterType.PLAYER,
      current_room_id: entranceHallId,
      sentiment: CharacterSentiment.INDIFFERENT
    });

    // Find both Chain Mail and Leather Boots in the entrance hall (should be there from seed data)
    const entranceItems = await itemService.getRoomItems(entranceHallId);
    const chainMail = entranceItems.find(ri => ri.item.name === 'Chain Mail');
    const leatherBoots = entranceItems.find(ri => ri.item.name === 'Leather Boots');
    expect(chainMail).toBeDefined();
    expect(leatherBoots).toBeDefined();

    // Pick up Chain Mail
    await itemService.transferItemToInventory(freshCharacterId, chainMail!.item_id, entranceHallId, 1);
    
    // Equip Chain Mail
    await equipmentService.equipItem(freshCharacterId, chainMail!.item_id);

    // Pick up Leather Boots
    await itemService.transferItemToInventory(freshCharacterId, leatherBoots!.item_id, entranceHallId, 1);
    
    // Equip Leather Boots
    await equipmentService.equipItem(freshCharacterId, leatherBoots!.item_id);

    // Calculate total armor points
    const totalArmorPoints = await equipmentService.calculateArmorPoints(freshCharacterId);
    
    // Should be 3 total (2 from chain mail + 1 from boots)
    expect(totalArmorPoints).toBe(3);
  });
});