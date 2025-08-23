/**
 * Ensures that the Vault Key exists and is placed in the Meditation Chamber
 * This fixes the issue where the hardcoded monastery region doesn't have the key
 */

import Database from './database';
import { ItemService } from '../services/itemService';
import { ItemType } from '../types/item';

/**
 * Ensure Vault Key exists and is placed in Meditation Chamber with Stone Sentinel
 * @param db Database instance
 * @param gameId Game ID to check
 */
export async function ensureVaultKeyInMonastery(db: Database, gameId: number): Promise<void> {
  try {
    // Check if there's a Meditation Chamber with a Stone Sentinel in this game
    const meditationChamberWithSentinel = await db.get<any>(`
      SELECT r.id as room_id, r.name as room_name, c.id as character_id, c.name as character_name
      FROM rooms r
      JOIN characters c ON c.current_room_id = r.id
      WHERE r.game_id = ? 
      AND r.name LIKE '%Meditation%'
      AND c.name = 'Stone Sentinel'
      AND c.type = 'enemy'
    `, [gameId]);

    if (!meditationChamberWithSentinel) {
      // No Meditation Chamber with Stone Sentinel, nothing to fix
      return;
    }

    const roomId = meditationChamberWithSentinel.room_id;
    
    // Check if Vault Key already exists in this room
    const existingVaultKey = await db.get<any>(`
      SELECT ri.id 
      FROM room_items ri
      JOIN items i ON ri.item_id = i.id
      WHERE ri.room_id = ?
      AND i.name = 'Vault Key'
    `, [roomId]);

    if (existingVaultKey) {
      // Vault Key already exists in the room
      return;
    }

    // Check if Vault Key item exists in items table
    let vaultKeyId: number;
    const vaultKeyItem = await db.get<any>('SELECT id FROM items WHERE name = ?', ['Vault Key']);
    
    if (!vaultKeyItem) {
      // Create the Vault Key item
      const itemService = new ItemService(db);
      vaultKeyId = await itemService.createItem({
        name: 'Vault Key',
        description: 'A heavy iron key with religious symbols etched into its surface. It glows faintly with divine magic, the power needed to open the sacred vault door.',
        type: ItemType.QUEST,
        weight: 0.3,
        value: 0,
        stackable: false,
        max_stack: 1
      });
      
      console.log(`Created Vault Key item with ID ${vaultKeyId}`);
    } else {
      vaultKeyId = vaultKeyItem.id;
    }

    // Place the Vault Key in the Meditation Chamber
    const itemService = new ItemService(db);
    await itemService.placeItemInRoom(roomId, vaultKeyId, 1);
    
    console.log(`Placed Vault Key in ${meditationChamberWithSentinel.room_name} (Room ${roomId}) guarded by ${meditationChamberWithSentinel.character_name}`);
    
  } catch (error) {
    console.error('Error ensuring Vault Key in monastery:', error);
    // Don't throw - this is a fix operation that shouldn't break the game
  }
}

/**
 * Check all games and ensure Vault Keys exist where needed
 * @param db Database instance
 */
export async function ensureVaultKeysInAllGames(db: Database): Promise<void> {
  try {
    const games = await db.all<{id: number}>('SELECT id FROM games');
    
    for (const game of games) {
      await ensureVaultKeyInMonastery(db, game.id);
    }
  } catch (error) {
    console.error('Error ensuring Vault Keys in all games:', error);
  }
}