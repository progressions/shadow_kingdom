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
    
    // Set up game commands (like GameController.setupGameCommands does)
    await setupGameCommands(commandRouter, gameStateManager, roomDisplayService);
    
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

// Helper function to set up game commands (extracted from GameController logic)
async function setupGameCommands(
  commandRouter: any, 
  gameStateManager: any, 
  roomDisplayService: any
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
      // Same as GameController.lookAround()
      const room = await gameStateManager.getCurrentRoom();
      const connections = await gameStateManager.getCurrentRoomConnections();
      
      if (room) {
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
      // Same as GameController.move()
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
        
        // Show the new room
        const room = await gameStateManager.getCurrentRoom();
        const connections = await gameStateManager.getCurrentRoomConnections();
        
        if (room) {
          roomDisplayService.displayRoom(room, connections);
        }
      } catch (error) {
        console.error('Error moving:', error);
      }
    }
  });
}