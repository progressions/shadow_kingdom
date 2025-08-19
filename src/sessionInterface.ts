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
  console.log(`Session mode: ${command.command}`);
}

async function executeCommand(commandInput: string, gameId?: number): Promise<void> {
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
  
  // Use persistent database file for session commands
  const dbPath = 'shadow_kingdom_session.db';
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
    
    // Create services following the same pattern as GameController but without readline
    const grokClient = new GrokClient();
    const baseConfig = getNLPConfig();
    const config = applyEnvironmentOverrides(baseConfig);
    const nlpEngine = new UnifiedNLPEngine(grokClient, config);
    
    const gameStateManager = new GameStateManager(db, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    const commandRouter = new CommandRouter(nlpEngine, {
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
    
    // Set up game commands with background generation support
    await setupGameCommands(commandRouter, gameStateManager, roomDisplayService, regionService, backgroundGenerationService, db);
    
    // Start the game session (this will put us in the entrance hall)
    await gameStateManager.startGameSession(actualGameId);
    
    // Add command to history (same as GameController does)
    gameStateManager.addRecentCommand(commandInput);
    
    // Create execution context (same as GameController does)
    const executionContext = {
      mode: gameStateManager.getCurrentSession().mode,
      gameContext: await gameStateManager.buildGameContext(),
      recentCommands: gameStateManager.getRecentCommands()
    };
    
    // Process the command using the same system as GameController
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
  db: any
): Promise<void> {
  // Add the basic game commands that GameController sets up
  commandRouter.addGameCommand({
    name: 'help',
    description: 'Show available commands',
    handler: () => commandRouter.showHelp('game')
  });

  commandRouter.addGameCommand({
    name: 'look',
    description: 'Look around the current room',
    handler: async () => {
      // Same logic as GameController.lookAround() but with background generation
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
      // Same as GameController.move() but with background generation
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
}

