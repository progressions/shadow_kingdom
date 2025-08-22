#!/usr/bin/env node

import Database from './utils/database';
import { GameController } from './gameController';

export async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  let command: string | undefined;
  
  // Look for --cmd argument
  const cmdIndex = args.indexOf('--cmd');
  if (cmdIndex !== -1 && args[cmdIndex + 1]) {
    command = args[cmdIndex + 1];
  }
  
  const db = new Database();
  
  try {
    await db.connect();
    
    const controller = new GameController(db, command);
    await controller.start();
    
  } catch (error) {
    console.error('Failed to start Shadow Kingdom:', error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (require.main === module) {
  main();
}

// Export GameCLI for backwards compatibility (not used anymore)
export class GameCLI {
  constructor() {
    throw new Error('GameCLI is deprecated. Use GameController instead.');
  }
}