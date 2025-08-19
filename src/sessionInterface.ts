export interface SessionCommand {
  command: 'start-session' | 'cmd' | 'end-session';
  args?: string[];
}

export function parseSessionArguments(args: string[]): SessionCommand | null {
  if (args.includes('--start-session')) {
    return { command: 'start-session' };
  }
  
  // Check for --cmd flag
  const cmdIndex = args.indexOf('--cmd');
  if (cmdIndex !== -1 && cmdIndex < args.length - 1) {
    // Get all arguments after --cmd
    const cmdArgs = args.slice(cmdIndex + 1);
    return { command: 'cmd', args: cmdArgs };
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
    
    // For the 'look' command, create a minimal game session and execute it
    if (cmdInput.toLowerCase() === 'look') {
      await executeLookCommand();
      return;
    }
  }
  
  // For other commands, just log what we would do
  console.log(`Session mode: ${command.command}`);
}

async function executeLookCommand(): Promise<void> {
  // Import required services
  const Database = (await import('./utils/database')).default;
  const { initializeDatabase, createGameWithRooms } = await import('./utils/initDb');
  const { GameStateManager } = await import('./services/gameStateManager');
  const { RoomDisplayService } = await import('./services/roomDisplayService');
  
  // Create an in-memory database and initialize it
  const db = new Database(':memory:');
  await db.connect();
  await initializeDatabase(db);
  
  try {
    // Create a test game with rooms
    const gameId = await createGameWithRooms(db, `Session Game ${Date.now()}`);
    
    // Create services
    const gameStateManager = new GameStateManager(db);
    const roomDisplayService = new RoomDisplayService();
    
    // Start a game session (this will put us in the entrance hall)
    await gameStateManager.startGameSession(gameId);
    
    // Get current room and connections
    const room = await gameStateManager.getCurrentRoom();
    const connections = await gameStateManager.getCurrentRoomConnections();
    
    if (room) {
      // Display the room (this will output to console)
      roomDisplayService.displayRoom(room, connections);
    } else {
      console.log('No current room found.');
    }
  } finally {
    await db.close();
  }
}