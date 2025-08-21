export interface SessionCommand {
  command: 'start-session' | 'cmd' | 'end-session';
  args?: string[];
  gameId?: number;
}

export function parseSessionArguments(args: string[]): SessionCommand | null {
  if (args.includes('--start-session')) {
    return { command: 'start-session' };
  }
  
  // Check for --cmd flag
  const cmdIndex = args.indexOf('--cmd');
  if (cmdIndex !== -1 && cmdIndex < args.length - 1) {
    // Check for --game-id flag
    const gameIdIndex = args.indexOf('--game-id');
    let gameId: number | undefined;
    
    if (gameIdIndex !== -1 && gameIdIndex < args.length - 1) {
      gameId = parseInt(args[gameIdIndex + 1]);
    }
    
    // Get all arguments after --cmd, filtering out --game-id and its value
    let cmdArgs = args.slice(cmdIndex + 1);
    if (gameIdIndex !== -1) {
      // Remove --game-id and its value from cmdArgs
      const relativeGameIdIndex = gameIdIndex - cmdIndex - 1;
      if (relativeGameIdIndex >= 0) {
        cmdArgs = cmdArgs.filter((_, i) => i !== relativeGameIdIndex && i !== relativeGameIdIndex + 1);
      }
    }
    
    return { command: 'cmd', args: cmdArgs, gameId };
  }
  
  return null;
}

export function shouldUseSessionMode(args: string[]): boolean {
  return parseSessionArguments(args) !== null;
}

export async function runSessionMode(args: string[]): Promise<void> {
  const command = parseSessionArguments(args);
  if (!command) {
    throw new Error('No valid session command found');
  }
  
  if (command.command === 'cmd' && command.args) {
    const cmdInput = command.args.join(' ');
    
    // Execute any command using the game's command processing system
    await executeCommand(cmdInput, command.gameId);
    return;
  }
  
  // For other commands, just log what we would do
  // NOTE: Console output is intentional here - SessionInterface is for programmatic/command-line usage, not TUI
  console.log(`Session mode: ${command.command}`);
}

async function executeCommand(commandInput: string, gameId?: number): Promise<void> {
  // NOTE: All console output in SessionInterface is intentional for programmatic/command-line usage
  // This interface is used for automation and testing, not the interactive TUI mode
  
  // Import required classes
  const Database = (await import('./utils/database')).default;
  const { initializeDatabase, createGameWithRooms } = await import('./utils/initDb');
  const { CommandRouter } = await import('./services/commandRouter');
  const { GameStateManager } = await import('./services/gameStateManager');
  const { RoomDisplayService } = await import('./services/roomDisplayService');
  const { RegionService } = await import('./services/regionService');
  const { RoomGenerationService } = await import('./services/roomGenerationService');
  const { BackgroundGenerationService } = await import('./services/backgroundGenerationService');
  const { GrokClient } = await import('./ai/grokClient');
  const { UnifiedNLPEngine } = await import('./nlp/unifiedNLPEngine');
  const { getNLPConfig, applyEnvironmentOverrides } = await import('./nlp/config');
  const { ItemService } = await import('./services/itemService');
  const { EquipmentService } = await import('./services/equipmentService');
  
  // Use persistent database file for session commands
  const dbPath = 'data/db/shadow_kingdom_session.db';
  const db = new Database(dbPath);
  await db.connect();
  await initializeDatabase(db);
  
  try {
    let actualGameId: number;
    
    if (gameId) {
      // Use specified game ID
      actualGameId = gameId;
    } else {
      // Look for existing session game or create one
      const games = await db.all<{id: number, name: string}>('SELECT id, name FROM games WHERE name LIKE "Session Game%" ORDER BY created_at DESC LIMIT 1');
      
      if (games.length > 0) {
        actualGameId = games[0].id;
      } else {
        // Create a new session game
        actualGameId = await createGameWithRooms(db, `Session Game ${Date.now()}`);
      }
    }
    
    // Create services for session commands without readline dependencies
    const grokClient = new GrokClient();
    const baseConfig = getNLPConfig();
    const config = applyEnvironmentOverrides(baseConfig);
    const nlpEngine = new UnifiedNLPEngine(grokClient, config);
    
    const gameStateManager = new GameStateManager(db, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    const commandRouter = new CommandRouter(nlpEngine, null, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    const roomDisplayService = new RoomDisplayService({
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });

    const regionService = new RegionService(db, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });

    // Initialize room generation service with region service
    const roomGenerationService = new RoomGenerationService(db, grokClient, regionService, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    // Initialize background generation service with test mode to force await (no fire-and-forget)
    const backgroundGenerationService = new BackgroundGenerationService(db, roomGenerationService, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true',
      disableBackgroundGeneration: true  // Force await mode to prevent database closure issues
    });
    
    // Initialize item and equipment services
    const itemService = new ItemService(db);
    const equipmentService = new EquipmentService(db);
    
    // Set up game commands with background generation support
    await setupGameCommands(commandRouter, gameStateManager, roomDisplayService, regionService, backgroundGenerationService, db, itemService, equipmentService);
    
    // Start the game session (this will put us in the entrance hall)
    await gameStateManager.startGameSession(actualGameId);
    
    // Add command to history for context tracking
    gameStateManager.addRecentCommand(commandInput);
    
    // Create execution context for command processing
    const executionContext = {
      gameContext: await gameStateManager.buildGameContext(),
      recentCommands: gameStateManager.getRecentCommands()
    };
    
    // Process the command using the command router system
    await commandRouter.processCommand(commandInput, executionContext);
    
  } finally {
    await db.close();
  }
}

// Helper function to set up game commands with background generation support
async function setupGameCommands(
  commandRouter: any, 
  gameStateManager: any, 
  roomDisplayService: any,
  regionService: any,
  backgroundGenerationService: any,
  db: any,
  itemService: any,
  equipmentService: any
): Promise<void> {
  // Add the basic game commands for session interface
  commandRouter.addGameCommand({
    name: 'help',
    description: 'Show available commands',
    handler: () => commandRouter.showHelp('game')
  });

  commandRouter.addGameCommand({
    name: 'look',
    description: 'Look around the current room',
    handler: async () => {
      // Display current room and trigger background generation
      const session = gameStateManager.getCurrentSession();
      const room = await gameStateManager.getCurrentRoom();
      const connections = await gameStateManager.getCurrentRoomConnections();
      
      if (room) {
        // Trigger background room generation to find connected unprocessed rooms and expand them
        // Background generation will mark TARGET rooms as processed after expanding them
        // DO NOT mark the current room as processed here - that's not how the system works!
        await backgroundGenerationService.preGenerateAdjacentRooms(session.roomId!, session.gameId!);

        roomDisplayService.displayRoom(room, connections);
      } else {
        console.log('You are nowhere to be found.');
      }
    }
  });

  commandRouter.addGameCommand({
    name: 'go',
    description: 'Move in a direction (e.g., "go north")',
    handler: async (args: string[]) => {
      // Move to a new room and trigger background generation
      if (args.length === 0) {
        console.log('Move where? Specify a direction (e.g., "go north")');
        return;
      }

      const userInput = args.join(' ').toLowerCase();

      try {
        // Find connection by either direction or thematic name (case-insensitive)
        const connection = await gameStateManager.findConnection(userInput);

        if (!connection) {
          console.log(`You cannot go ${userInput} from here.`);
          return;
        }

        // Move to the new room using game state manager
        await gameStateManager.moveToRoom(connection.to_room_id);
        
        // Show the new room with background generation
        const session = gameStateManager.getCurrentSession();
        const room = await gameStateManager.getCurrentRoom();
        const connections = await gameStateManager.getCurrentRoomConnections();
        
        if (room) {
          // Trigger background room generation to find connected unprocessed rooms and expand them
          // Background generation will mark TARGET rooms as processed after expanding them
          // DO NOT mark the current room as processed here - that's not how the system works!
          await backgroundGenerationService.preGenerateAdjacentRooms(session.roomId!, session.gameId!);

          roomDisplayService.displayRoom(room, connections);
        }
      } catch (error) {
        console.error('Error moving:', error);
      }
    }
  });

  // Region debug commands
  commandRouter.addGameCommand({
    name: 'region',
    description: 'Show current room region information',
    handler: async () => {
      try {
        const session = gameStateManager.getCurrentSession();
        if (!session.gameId || !session.roomId) {
          console.log('No active game session.');
          return;
        }

        const room = await db.get('SELECT * FROM rooms WHERE id = ?', [session.roomId]);
        if (!room) {
          console.log('Current room not found.');
          return;
        }

        if (!room.region_id) {
          console.log('Current room is not part of any region.');
          return;
        }

        const region = await regionService.getRegion(room.region_id);
        if (!region) {
          console.log('Region not found.');
          return;
        }

        const roomsInRegion = await regionService.getRoomsInRegion(region.id);
        
        let output = `\nCurrent Region: ${region.name || region.type}\n`;
        output += `Type: ${region.type}\n`;
        output += `Description: ${region.description}\n`;
        output += `Distance from center: ${room.region_distance}\n`;
        output += `Total rooms in region: ${roomsInRegion.length}\n`;
        
        if (region.center_room_id) {
          const centerRoom = await db.get('SELECT * FROM rooms WHERE id = ?', [region.center_room_id]);
          output += `Center room: ${centerRoom?.name || 'Unknown'}\n`;
        } else {
          output += `Center: Not yet discovered\n`;
        }
        
        console.log(output);
      } catch (error) {
        console.error('Error showing region info:', error);
      }
    }
  });

  commandRouter.addGameCommand({
    name: 'regions',
    description: 'List all regions in current game',
    handler: async () => {
      try {
        const session = gameStateManager.getCurrentSession();
        if (!session.gameId) {
          console.log('No active game session.');
          return;
        }

        const regions = await regionService.getRegionsForGame(session.gameId);
        
        if (regions.length === 0) {
          console.log('No regions found in current game.');
          return;
        }

        let output = '\nRegions in current game:\n';
        for (const region of regions) {
          const roomCount = await db.get(
            'SELECT COUNT(*) as count FROM rooms WHERE region_id = ?',
            [region.id]
          );
          
          output += `- ${region.name || region.type} (${region.type}): ${roomCount?.count || 0} rooms\n`;
        }
        
        console.log(output);
      } catch (error) {
        console.error('Error listing regions:', error);
      }
    }
  });

  commandRouter.addGameCommand({
    name: 'region-stats',
    description: 'Show region statistics for current game',
    handler: async () => {
      try {
        const session = gameStateManager.getCurrentSession();
        if (!session.gameId) {
          console.log('No active game session.');
          return;
        }

        const stats = await regionService.getRegionStats(session.gameId);
        
        if (stats.length === 0) {
          console.log('No regions found in current game.');
          return;
        }

        let output = '\nRegion Statistics:\n';
        output += '==================\n';
        
        for (const stat of stats) {
          const region = stat.region;
          output += `\n${region.name || region.type} (${region.type})\n`;
          output += `  Rooms: ${stat.roomCount}\n`;
          output += `  Center: ${stat.hasCenter ? 'Discovered' : 'Not yet found'}\n`;
          output += `  Description: ${region.description}\n`;
          
          if (stat.hasCenter && region.center_room_id) {
            const centerRoom = await db.get('SELECT * FROM rooms WHERE id = ?', [region.center_room_id]);
            output += `  Center room: ${centerRoom?.name || 'Unknown'}\n`;
          }
        }
        
        console.log(output);
      } catch (error) {
        console.error('Error showing region stats:', error);
      }
    }
  });

  // Item system commands
  commandRouter.addGameCommand({
    name: 'pickup',
    description: 'Pick up an item from the current room',
    handler: async (args: string[]) => {
      if (args.length === 0) {
        console.log('Pickup what?');
        return;
      }

      try {
        const session = gameStateManager.getCurrentSession();
        const characterId = session.gameId!; // Use game ID as character ID for single-player
        const currentRoom = await gameStateManager.getCurrentRoom();
        
        if (!currentRoom) {
          console.log('Error: Unable to determine current room.');
          return;
        }

        const itemName = args.join(' ');
        const roomItems = await itemService.getRoomItems(currentRoom.id);
        const item = itemService.findItemByName(roomItems, itemName);
        
        if (!item) {
          console.log(`There is no ${itemName} here.`);
          return;
        }

        await itemService.pickupItem(characterId, item.item_id, currentRoom.id);
        console.log(`You picked up ${item.item.name}.`);

      } catch (error) {
        console.error('Error picking up item:', error);
        console.log(`Error picking up item: ${(error as Error).message}`);
      }
    }
  });

  commandRouter.addGameCommand({
    name: 'get',
    description: 'Pick up an item from the current room (alias for "pickup")',
    handler: async (args: string[]) => {
      // Delegate to pickup handler by calling the pickup implementation directly
      const commands = commandRouter.getCommands();
      const pickupCommand = commands.get('pickup');
      if (pickupCommand) {
        await pickupCommand.handler(args);
      }
    }
  });

  commandRouter.addGameCommand({
    name: 'take',
    description: 'Pick up an item from the current room (alias for "pickup")',
    handler: async (args: string[]) => {
      // Delegate to pickup handler by calling the pickup implementation directly
      const commands = commandRouter.getCommands();
      const pickupCommand = commands.get('pickup');
      if (pickupCommand) {
        await pickupCommand.handler(args);
      }
    }
  });

  commandRouter.addGameCommand({
    name: 'inventory',
    description: 'Show your inventory',
    handler: async () => {
      try {
        const session = gameStateManager.getCurrentSession();
        const characterId = session.gameId!; // Use game ID as character ID for single-player

        const inventory = await itemService.getCharacterInventory(characterId);
        
        if (inventory.length === 0) {
          console.log('Your inventory is empty.');
          return;
        }

        console.log('═══ INVENTORY ═══');
        for (const invItem of inventory) {
          const quantityText = invItem.quantity > 1 ? ` x${invItem.quantity}` : '';
          const equippedText = invItem.equipped ? ' (equipped)' : '';
          console.log(`• ${invItem.item.name}${quantityText}${equippedText}`);
        }

      } catch (error) {
        console.error('Error showing inventory:', error);
        console.log('Error displaying inventory.');
      }
    }
  });

  commandRouter.addGameCommand({
    name: 'inv',
    description: 'Show your inventory (alias for "inventory")',
    handler: async () => {
      const commands = commandRouter.getCommands();
      const inventoryCommand = commands.get('inventory');
      if (inventoryCommand) {
        await inventoryCommand.handler([]);
      }
    }
  });

  commandRouter.addGameCommand({
    name: 'i',
    description: 'Show your inventory (alias for "inventory")',
    handler: async () => {
      const commands = commandRouter.getCommands();
      const inventoryCommand = commands.get('inventory');
      if (inventoryCommand) {
        await inventoryCommand.handler([]);
      }
    }
  });

  commandRouter.addGameCommand({
    name: 'examine',
    description: 'Examine an item in detail',
    handler: async (args: string[]) => {
      if (args.length === 0) {
        console.log('Examine what?');
        return;
      }

      try {
        const session = gameStateManager.getCurrentSession();
        const characterId = session.gameId!; // Use game ID as character ID for single-player
        const currentRoom = await gameStateManager.getCurrentRoom();
        
        if (!currentRoom) {
          console.log('Error: Unable to determine current room.');
          return;
        }

        const itemName = args.join(' ');
        
        // Check inventory first
        const inventory = await itemService.getCharacterInventory(characterId);
        let targetInventoryItem = itemService.findItemByName(inventory, itemName);
        let targetRoomItem = null;
        let itemLocation = 'inventory';

        // If not found in inventory, check current room
        if (!targetInventoryItem) {
          const roomItems = await itemService.getRoomItems(currentRoom.id);
          targetRoomItem = itemService.findItemByName(roomItems, itemName);
          itemLocation = 'room';
        }

        const foundItem = targetInventoryItem || targetRoomItem;
        if (!foundItem) {
          console.log(`There is no ${itemName} here or in your inventory.`);
          return;
        }

        // Display detailed item information
        console.log(foundItem.item.name);
        console.log(foundItem.item.description);

      } catch (error) {
        console.error('Error examining item:', error);
        console.log('Error examining item.');
      }
    }
  });

  commandRouter.addGameCommand({
    name: 'ex',
    description: 'Examine an item in detail (alias for "examine")',
    handler: async (args: string[]) => {
      const commands = commandRouter.getCommands();
      const examineCommand = commands.get('examine');
      if (examineCommand) {
        await examineCommand.handler(args);
      }
    }
  });

  // Equipment commands
  commandRouter.addGameCommand({
    name: 'equip',
    description: 'Equip an item from your inventory',
    handler: async (args: string[]) => {
      if (args.length === 0) {
        console.log('Equip what?');
        return;
      }

      try {
        const session = gameStateManager.getCurrentSession();
        const characterId = session.gameId!; // Use game ID as character ID for single-player

        const itemName = args.join(' ');

        // Find the item in inventory that can be equipped
        const item = await equipmentService.findEquippableItem(characterId, itemName);
        if (!item) {
          console.log(`You don't have an equippable item called "${itemName}" in your inventory.`);
          return;
        }

        // Try to equip the item
        await equipmentService.equipItem(characterId, item.item_id);
        
        console.log(`You equipped ${item.item.name}.`);

      } catch (error) {
        console.error('Error equipping item:', error);
        console.log((error as Error).message);
      }
    }
  });

  commandRouter.addGameCommand({
    name: 'unequip',
    description: 'Unequip an equipped item',
    handler: async (args: string[]) => {
      if (args.length === 0) {
        console.log('Unequip what?');
        return;
      }

      try {
        const session = gameStateManager.getCurrentSession();
        const characterId = session.gameId!; // Use game ID as character ID for single-player

        const itemName = args.join(' ');

        // Get equipped items
        const equippedItems = await equipmentService.getEquippedItems(characterId);
        const item = itemService.findItemByName(equippedItems, itemName);
        
        if (!item) {
          console.log(`You don't have "${itemName}" equipped.`);
          return;
        }

        // Unequip the item
        await equipmentService.unequipItem(characterId, item.item_id);
        
        console.log(`You unequipped ${item.item.name}.`);

      } catch (error) {
        console.error('Error unequipping item:', error);
        console.log((error as Error).message);
      }
    }
  });

  commandRouter.addGameCommand({
    name: 'equipment',
    description: 'Show your equipped items',
    handler: async () => {
      try {
        const session = gameStateManager.getCurrentSession();
        const characterId = session.gameId!; // Use game ID as character ID for single-player

        const equipmentSummary = await equipmentService.getEquipmentSummary(characterId);
        
        console.log('═══ EQUIPMENT ═══');
        
        // Show all 4 slots
        const slots = ['hand', 'head', 'body', 'foot'] as const;
        
        for (const slot of slots) {
          const item = equipmentSummary[slot];
          const slotLabel = slot.toUpperCase();
          if (item) {
            console.log(`${slotLabel}: ${item.item.name}`);
          } else {
            console.log(`${slotLabel}: [Empty]`);
          }
        }

      } catch (error) {
        console.error('Error showing equipment:', error);
        console.log('Error displaying equipment.');
      }
    }
  });
}

