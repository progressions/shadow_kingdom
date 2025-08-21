#!/usr/bin/env ts-node

/**
 * Test Triggered World Creation
 * 
 * Tests the new world creation process with triggered items
 */

import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { EventTriggerService } from '../src/services/eventTriggerService';
import { CharacterService } from '../src/services/characterService';

async function testTriggeredWorld() {
  console.log('🏰 Testing Shadow Kingdom World with Event Triggers...\n');

  // Create database and initialize
  const db = new Database(':memory:');
  await db.connect();
  await initializeDatabase(db);

  // Create a new game with triggered items
  console.log('🔨 Creating new Shadow Kingdom world...');
  const gameId = await createGameWithRooms(db, 'Triggered Shadow Kingdom Test');
  console.log(`✅ Created game with ID: ${gameId}`);

  // Initialize services
  const eventTriggerService = new EventTriggerService(db);
  const characterService = new CharacterService(db);

  // Check what items and triggers were created
  const items = await db.all('SELECT * FROM items ORDER BY name');
  const triggers = await db.all('SELECT * FROM event_triggers');
  const effects = await db.all('SELECT * FROM trigger_effects');
  const conditions = await db.all('SELECT * FROM trigger_conditions');
  const roomItems = await db.all(`
    SELECT ri.*, r.name as room_name, i.name as item_name 
    FROM room_items ri 
    JOIN rooms r ON ri.room_id = r.id 
    JOIN items i ON ri.item_id = i.id 
    WHERE r.game_id = ? 
    ORDER BY r.name, i.name
  `, [gameId]);

  console.log(`\n📦 Items in Database: ${items.length}`);
  console.log('New triggered items:');
  const triggeredItemNames = [
    'Cursed Ruby Ring', 'Blessed Silver Amulet', 'Mysterious Glowing Orb', 
    'Poisoned Dagger', 'Scholar\'s Spectacles'
  ];
  
  for (const itemName of triggeredItemNames) {
    const item = items.find(i => i.name === itemName);
    if (item) {
      console.log(`  ✨ ${item.name} - ${item.description.substring(0, 80)}...`);
    }
  }

  console.log(`\n🎯 Event Triggers Created: ${triggers.length}`);
  console.log(`📊 Trigger Effects: ${effects.length}`);
  console.log(`🧮 Trigger Conditions: ${conditions.length}`);

  console.log('\n🏛️ Items Placed in Rooms:');
  let currentRoom = '';
  for (const placement of roomItems) {
    if (placement.room_name !== currentRoom) {
      currentRoom = placement.room_name;
      console.log(`\n  ${currentRoom}:`);
    }
    const isTriggered = triggers.some(t => t.entity_id === placement.item_id);
    const triggerIcon = isTriggered ? '⚡' : '  ';
    console.log(`    ${triggerIcon} ${placement.item_name} (qty: ${placement.quantity})`);
  }

  console.log('\n📋 Detailed Trigger Analysis:');
  for (const trigger of triggers) {
    const triggerEffects = effects.filter(e => e.trigger_id === trigger.id);
    const triggerConditions = conditions.filter(c => c.trigger_id === trigger.id);
    
    let entityInfo = '';
    if (trigger.entity_type === 'item' && trigger.entity_id) {
      const item = items.find(i => i.id === trigger.entity_id);
      entityInfo = item ? ` (${item.name})` : ' (unknown item)';
    } else if (trigger.entity_type === 'room') {
      entityInfo = ' (room-based)';
    } else if (trigger.entity_type === 'global') {
      entityInfo = ' (global)';
    }

    console.log(`\n  🎯 ${trigger.name}${entityInfo}`);
    console.log(`     Event: ${trigger.event_type} | Priority: ${trigger.priority}`);
    if (trigger.max_executions) {
      console.log(`     Max Executions: ${trigger.max_executions}`);
    }
    if (trigger.cooldown_seconds) {
      console.log(`     Cooldown: ${trigger.cooldown_seconds}s`);
    }
    
    if (triggerConditions.length > 0) {
      console.log(`     Conditions: ${triggerConditions.length}`);
      for (const condition of triggerConditions) {
        const condData = JSON.parse(condition.condition_value);
        if (condition.condition_type === 'random_chance') {
          console.log(`       - ${Math.round(condData.probability * 100)}% chance`);
        }
      }
    }

    console.log(`     Effects: ${triggerEffects.length}`);
    for (const effect of triggerEffects) {
      const effectData = JSON.parse(effect.effect_data);
      console.log(`       - ${effect.effect_type}: ${JSON.stringify(effectData)}`);
      if (effect.message) {
        const shortMessage = effect.message.length > 60 
          ? effect.message.substring(0, 60) + '...'
          : effect.message;
        console.log(`         Message: "${shortMessage}"`);
      }
    }
  }

  // Test a few triggers
  console.log('\n🧪 Testing Some Triggers...');
  
  // Get the player character
  const character = await characterService.getPlayerCharacter(gameId);
  if (!character) {
    throw new Error('No player character found');
  }

  // Test 1: Pick up the Blessed Silver Amulet
  console.log('\n✨ Test 1: Picking up the Blessed Silver Amulet...');
  const blessedAmulet = items.find(i => i.name === 'Blessed Silver Amulet');
  if (blessedAmulet) {
    const context = { character, eventData: { test: 'blessed_amulet_pickup' } };
    await eventTriggerService.processTrigger('pickup', 'item', blessedAmulet.id, context);
  }

  // Test 2: Pick up the Cursed Ruby Ring
  console.log('\n💍 Test 2: Picking up the Cursed Ruby Ring...');
  const cursedRing = items.find(i => i.name === 'Cursed Ruby Ring');
  if (cursedRing) {
    const context = { character, eventData: { test: 'cursed_ring_pickup' } };
    await eventTriggerService.processTrigger('pickup', 'item', cursedRing.id, context);
  }

  // Test 3: Examine the Scholar's Spectacles (random chance)
  console.log('\n👓 Test 3: Examining Scholar\'s Spectacles (multiple attempts for random chance)...');
  const spectacles = items.find(i => i.name === 'Scholar\'s Spectacles');
  if (spectacles) {
    const context = { character, eventData: { test: 'spectacles_examine' } };
    for (let i = 0; i < 3; i++) {
      console.log(`  Attempt ${i + 1}:`);
      await eventTriggerService.processTrigger('examine', 'item', spectacles.id, context);
    }
  }

  // Show final status effects
  console.log('\n🏁 Final Status Effects:');
  const finalStatusEffects = await eventTriggerService.getActiveStatusEffects(character.id);
  if (finalStatusEffects.length > 0) {
    for (const effect of finalStatusEffects) {
      const effectData = JSON.parse(effect.effect_data || '{}');
      console.log(`  ⭐ ${effect.status_type}: ${JSON.stringify(effectData)}`);
    }
  } else {
    console.log('  (No active status effects)');
  }

  // Show trigger execution history
  const history = await eventTriggerService.getTriggerHistory(20);
  console.log(`\n📜 Trigger Execution History: ${history.length} executions`);

  await db.close();
  console.log('\n🎉 Enhanced Shadow Kingdom world test completed!');
  console.log('💫 Players will now experience a rich, interactive world with consequence-driven gameplay!');
}

// Run the test
testTriggeredWorld().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});