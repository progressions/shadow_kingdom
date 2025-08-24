/**
 * Test Utilities
 * 
 * Common utilities and helpers for tests
 */

import Database from '../src/utils/database';
import { initializeDatabase } from '../src/utils/initDb';

/**
 * Initialize database for tests with proper extended_description migrations
 */
export async function initializeTestDatabase(db: Database): Promise<void> {
  await initializeDatabase(db);
  
  // Ensure extended_description columns exist for tests
  // This is needed because some tests may not trigger the migrations properly
  try {
    await db.run(`ALTER TABLE characters ADD COLUMN extended_description TEXT`);
  } catch (error) {
    // Column already exists, ignore
  }
  
  try {
    await db.run(`ALTER TABLE items ADD COLUMN extended_description TEXT`);
  } catch (error) {
    // Column already exists, ignore  
  }
}