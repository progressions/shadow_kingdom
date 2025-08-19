#!/usr/bin/env node

import Database from './utils/database';
import { GameController } from './gameController';
import { shouldUseSessionMode, runSessionMode } from './sessionInterface';

async function main() {
  const args = process.argv.slice(2);
  
  // Check if we should use session mode
  if (shouldUseSessionMode(args)) {
    try {
      await runSessionMode(args);
      return;
    } catch (error) {
      console.error('Failed to run session mode:', error);
      process.exit(1);
    }
  }
  
  // Default interactive mode
  const db = new Database();
  
  try {
    await db.connect();
    
    const controller = new GameController(db);
    await controller.start();
    
  } catch (error) {
    console.error('Failed to start Shadow Kingdom:', error);
    process.exit(1);
  }
}

main();

// Export GameCLI for backwards compatibility (not used anymore)
export class GameCLI {
  constructor() {
    throw new Error('GameCLI is deprecated. Use GameController instead.');
  }
}