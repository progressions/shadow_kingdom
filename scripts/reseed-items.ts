/**
 * Script to reseed items in the database
 * This will add any new seed items that don't already exist
 */

import Database from '../src/utils/database';
import { seedItems } from '../src/utils/seedItems';
import { getAllSeedItems } from '../src/utils/seedItems';
import { ItemService } from '../src/services/itemService';

async function reseedItems() {
  const db = new Database();
  
  try {
    await db.connect();
    console.log('Connected to database');
    
    const itemService = new ItemService(db);
    
    // Get existing items
    const existingItems = await itemService.listItems();
    console.log(`Found ${existingItems.length} existing items in database`);
    
    // Get seed items
    const seedItemsList = getAllSeedItems();
    console.log(`Have ${seedItemsList.length} seed items defined`);
    
    // Check for missing items
    const missingItems = seedItemsList.filter(seedItem => 
      !existingItems.some(existing => existing.name === seedItem.name)
    );
    
    if (missingItems.length > 0) {
      console.log(`Found ${missingItems.length} missing items to add:`);
      
      for (const item of missingItems) {
        try {
          const itemId = await itemService.createItem(item);
          console.log(`✅ Added: ${item.name} (ID: ${itemId}, fixed: ${item.is_fixed || false})`);
        } catch (error) {
          console.error(`❌ Failed to add ${item.name}:`, error);
        }
      }
    } else {
      console.log('All seed items are already in the database');
    }
    
    // Verify Ancient Stone Pedestal exists
    const pedestal = await db.get<any>(
      'SELECT * FROM items WHERE name = ?',
      ['Ancient Stone Pedestal']
    );
    
    if (pedestal) {
      console.log('\n✅ Ancient Stone Pedestal verified:');
      console.log(`  - ID: ${pedestal.id}`);
      console.log(`  - Fixed: ${pedestal.is_fixed ? 'Yes' : 'No'}`);
      console.log(`  - Weight: ${pedestal.weight}`);
    } else {
      console.log('\n❌ Ancient Stone Pedestal not found in database!');
    }
    
  } catch (error) {
    console.error('Error reseeding items:', error);
    process.exit(1);
  } finally {
    await db.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
reseedItems().catch(console.error);