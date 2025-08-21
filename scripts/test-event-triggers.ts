#!/usr/bin/env ts-node

/**
 * Test Event Trigger System
 * 
 * Quick script to test that the Event Trigger System is working correctly
 */

import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { EventTriggerService } from '../src/services/eventTriggerService';
import { CharacterService } from '../src/services/characterService';
import { ItemService } from '../src/services/itemService';
import { Character, CharacterType } from '../src/types/character';

async function testEventTriggers() {
  console.log('🧪 Testing Event Trigger System...\n');

  // Create database and initialize
  const db = new Database(':memory:');
  await db.connect();
  await initializeDatabase(db);

  // Create test game
  const gameId = await createGameWithRooms(db, 'Event Trigger Test Game');
  console.log(`✅ Created test game with ID: ${gameId}`);

  // Initialize services
  const eventTriggerService = new EventTriggerService(db);
  const characterService = new CharacterService(db);
  const itemService = new ItemService(db);

  // Get the player character
  const character = await characterService.getPlayerCharacter(gameId);
  if (!character) {
    throw new Error('No player character found');
  }
  console.log(`✅ Found player character: ${character.name} (ID: ${character.id})`);

  // Check that triggers were seeded
  const triggers = await db.all('SELECT * FROM event_triggers');
  const effects = await db.all('SELECT * FROM trigger_effects');
  console.log(`✅ Found ${triggers.length} triggers and ${effects.length} effects`);

  // List all triggers
  console.log('\n📋 Available Triggers:');
  for (const trigger of triggers) {
    const triggerEffects = effects.filter(e => e.trigger_id === trigger.id);
    console.log(`  - ${trigger.name} (${trigger.entity_type}:${trigger.entity_id || 'global'} on ${trigger.event_type})`);
    console.log(`    ${triggerEffects.length} effect(s): ${trigger.description}`);
  }

  // Test 1: Equip the Ancient Key (should trigger blessing)
  console.log('\n🔑 Test 1: Equipping Ancient Key...');
  const ancientKey = await db.get('SELECT * FROM items WHERE name = ?', ['Ancient Key']);
  if (ancientKey) {
    // Simulate equipping the key
    const context = {
      character,
      eventData: { test: 'equip_ancient_key' }
    };

    await eventTriggerService.processTrigger('equip', 'item', ancientKey.id, context);
    
    // Check for status effects
    const statusEffects = await eventTriggerService.getActiveStatusEffects(character.id);
    console.log(`  Status effects applied: ${statusEffects.length}`);
    for (const effect of statusEffects) {
      console.log(`    - ${effect.status_type}: ${effect.effect_data}`);
    }
  }

  // Test 2: Global equip trigger
  console.log('\n👁️ Test 2: Global equip monitoring...');
  const ironSword = await db.get('SELECT * FROM items WHERE name = ?', ['Iron Sword']);
  if (ironSword) {
    const context = {
      character,
      eventData: { test: 'equip_iron_sword' }
    };

    await eventTriggerService.processTrigger('equip', 'item', ironSword.id, context);
    
    // Check status effects again
    const statusEffects = await eventTriggerService.getActiveStatusEffects(character.id);
    console.log(`  Total status effects now: ${statusEffects.length}`);
  }

  // Test 3: Check trigger history
  console.log('\n📜 Test 3: Trigger execution history...');
  const history = await eventTriggerService.getTriggerHistory(10);
  console.log(`  Total executions: ${history.length}`);
  for (const entry of history) {
    const trigger = triggers.find(t => t.id === entry.trigger_id);
    console.log(`    - ${trigger?.name} executed at ${entry.execution_time}`);
  }

  // Test 4: Random chance trigger (Health Potion)
  console.log('\n🧪 Test 4: Testing random chance trigger (Health Potion pickup)...');
  const healthPotion = await db.get('SELECT * FROM items WHERE name = ?', ['Health Potion']);
  if (healthPotion) {
    const context = {
      character,
      eventData: { test: 'pickup_health_potion' }
    };

    // Try multiple times to potentially trigger the 10% chance
    for (let i = 0; i < 5; i++) {
      await eventTriggerService.processTrigger('pickup', 'item', healthPotion.id, context);
    }
    
    const statusEffects = await eventTriggerService.getActiveStatusEffects(character.id);
    const poisonEffect = statusEffects.find(e => e.status_type === 'poisoned');
    if (poisonEffect) {
      console.log(`  🤢 Poison effect triggered! ${poisonEffect.effect_data}`);
    } else {
      console.log(`  😌 No poison effect this time (10% chance per attempt)`);
    }
  }

  // Show final status
  console.log('\n🏁 Final Status:');
  const finalStatusEffects = await eventTriggerService.getActiveStatusEffects(character.id);
  console.log(`  Active status effects: ${finalStatusEffects.length}`);
  for (const effect of finalStatusEffects) {
    console.log(`    - ${effect.status_type}: ${effect.effect_data}`);
  }

  const finalHistory = await eventTriggerService.getTriggerHistory(20);
  console.log(`  Total trigger executions: ${finalHistory.length}`);

  await db.close();
  console.log('\n✅ Event Trigger System test completed!');
}

// Run the test
testEventTriggers().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});