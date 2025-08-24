/**
 * EventTriggerService Tests
 * 
 * Test suite for the Event Trigger System Phase 1 implementation
 */

import Database from '../../src/utils/database';
import { EventTriggerService, TriggerContext } from '../../src/services/eventTriggerService';
import { Character, CharacterType, CharacterSentiment } from '../../src/types/character';
import { initializeTestDatabase } from '../testUtils';

describe('EventTriggerService', () => {
  let db: Database;
  let eventTriggerService: EventTriggerService;
  let testCharacter: Character;

  beforeEach(async () => {
    // Create in-memory database for each test
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    
    // Initialize service
    eventTriggerService = new EventTriggerService(db);

    // Create a test character
    testCharacter = {
      id: 1,
      game_id: 1,
      name: 'Test Hero',
      type: CharacterType.PLAYER,
      current_room_id: null,
      strength: 10,
      dexterity: 10,
      intelligence: 10,
      constitution: 10,
      wisdom: 10,
      charisma: 10,
      max_health: 10,
      current_health: 10,
      sentiment: CharacterSentiment.INDIFFERENT,
      is_dead: false,
      created_at: new Date().toISOString()
    };

    // Insert test character into database
    await db.run(`
      INSERT INTO characters (
        id, game_id, name, type, current_room_id,
        strength, dexterity, intelligence, constitution, wisdom, charisma,
        max_health, current_health, is_dead, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      testCharacter.id, testCharacter.game_id, testCharacter.name, testCharacter.type, testCharacter.current_room_id,
      testCharacter.strength, testCharacter.dexterity, testCharacter.intelligence, 
      testCharacter.constitution, testCharacter.wisdom, testCharacter.charisma,
      testCharacter.max_health, testCharacter.current_health, testCharacter.is_dead, testCharacter.created_at
    ]);
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('Database Tables', () => {
    test('should have event trigger tables created', async () => {
      // Check that all trigger system tables exist
      const tables = await db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name LIKE '%trigger%' OR name LIKE '%status%'
        ORDER BY name
      `);

      const expectedTables = [
        'character_status_effects',
        'event_triggers',
        'trigger_conditions',
        'trigger_effects',
        'trigger_history'
      ];

      const actualTableNames = tables.map((t: any) => t.name);
      
      for (const expectedTable of expectedTables) {
        expect(actualTableNames).toContain(expectedTable);
      }
    });
  });

  describe('Trigger Creation', () => {
    test('should create a basic trigger', async () => {
      const triggerId = await eventTriggerService.createTrigger(
        'Test Trigger',
        'item',
        42,
        'equip',
        {
          description: 'A test trigger for equipping item 42',
          priority: 1
        }
      );

      expect(triggerId).toBeGreaterThan(0);

      // Verify trigger was created in database
      const trigger = await db.get(`
        SELECT * FROM event_triggers WHERE id = ?
      `, [triggerId]);

      expect(trigger).toBeDefined();
      expect(trigger.name).toBe('Test Trigger');
      expect(trigger.entity_type).toBe('item');
      expect(trigger.entity_id).toBe(42);
      expect(trigger.event_type).toBe('equip');
      expect(trigger.priority).toBe(1);
      expect(trigger.enabled).toBe(1); // SQLite stores boolean as integer
    });

    test('should add effects to a trigger', async () => {
      const triggerId = await eventTriggerService.createTrigger(
        'Healing Spring',
        'room',
        15,
        'enter'
      );

      const effectId = await eventTriggerService.addTriggerEffect(
        triggerId,
        'heal',
        'self',
        { amount: 5 },
        {
          message: 'The healing waters restore your vitality.'
        }
      );

      expect(effectId).toBeGreaterThan(0);

      // Verify effect was created
      const effect = await db.get(`
        SELECT * FROM trigger_effects WHERE id = ?
      `, [effectId]);

      expect(effect).toBeDefined();
      expect(effect.trigger_id).toBe(triggerId);
      expect(effect.effect_type).toBe('heal');
      expect(effect.target_type).toBe('self');
      expect(effect.message).toBe('The healing waters restore your vitality.');
      
      const effectData = JSON.parse(effect.effect_data);
      expect(effectData.amount).toBe(5);
    });
  });

  describe('Trigger Processing', () => {
    test('should find applicable triggers', async () => {
      // Create test triggers
      const itemTriggerId = await eventTriggerService.createTrigger(
        'Cursed Sword',
        'item',
        42,
        'equip'
      );

      const globalTriggerId = await eventTriggerService.createTrigger(
        'Global Equip Monitor',
        'global',
        null,
        'equip'
      );

      // Add effects to triggers
      await eventTriggerService.addTriggerEffect(
        itemTriggerId,
        'message',
        'self',
        {},
        { message: 'The cursed sword pulses with dark energy!' }
      );

      await eventTriggerService.addTriggerEffect(
        globalTriggerId,
        'message',
        'self',
        {},
        { message: 'You hear a distant bell chime as you equip something.' }
      );

      // Create trigger context
      const context: TriggerContext = {
        character: testCharacter,
        eventData: { test: true }
      };

      // Process triggers for equipping item 42
      await eventTriggerService.processTrigger('equip', 'item', 42, context);

      // Verify trigger execution was logged
      const history = await db.all(`
        SELECT * FROM trigger_history 
        WHERE character_id = ? AND event_type = 'equip'
        ORDER BY execution_time DESC
      `, [testCharacter.id]);

      expect(history).toHaveLength(2); // Item trigger + global trigger
      
      // Check that both triggers were executed
      const triggerIds = history.map((h: any) => h.trigger_id);
      expect(triggerIds).toContain(itemTriggerId);
      expect(triggerIds).toContain(globalTriggerId);
    });

    test('should apply status effects', async () => {
      // Create a trigger that applies poison
      const triggerId = await eventTriggerService.createTrigger(
        'Poison Trap',
        'item',
        10,
        'pickup'
      );

      await eventTriggerService.addTriggerEffect(
        triggerId,
        'apply_status',
        'self',
        { 
          status_type: 'poisoned',
          damage_per_turn: 2
        },
        {
          message: 'You feel sick from touching the cursed gold!',
          durationSeconds: 60
        }
      );

      // Process trigger
      const context: TriggerContext = {
        character: testCharacter
      };

      await eventTriggerService.processTrigger('pickup', 'item', 10, context);

      // Check that status effect was applied
      const statusEffects = await eventTriggerService.getActiveStatusEffects(testCharacter.id);
      
      expect(statusEffects).toHaveLength(1);
      expect(statusEffects[0].status_type).toBe('poisoned');
      expect(statusEffects[0].character_id).toBe(testCharacter.id);
      
      const effectData = JSON.parse(statusEffects[0].effect_data!);
      expect(effectData.status_type).toBe('poisoned');
      expect(effectData.damage_per_turn).toBe(2);
    });

    test('should respect execution limits', async () => {
      // Create a trigger with max 1 execution
      const triggerId = await eventTriggerService.createTrigger(
        'One-Time Trigger',
        'item',
        99,
        'use',
        {
          maxExecutions: 1
        }
      );

      await eventTriggerService.addTriggerEffect(
        triggerId,
        'message',
        'self',
        {},
        { message: 'This can only happen once!' }
      );

      const context: TriggerContext = {
        character: testCharacter
      };

      // Execute trigger twice
      await eventTriggerService.processTrigger('use', 'item', 99, context);
      await eventTriggerService.processTrigger('use', 'item', 99, context);

      // Check execution history
      const history = await db.all(`
        SELECT * FROM trigger_history 
        WHERE trigger_id = ?
      `, [triggerId]);

      expect(history).toHaveLength(1); // Should only execute once

      // Check execution count was updated
      const trigger = await db.get(`
        SELECT execution_count FROM event_triggers WHERE id = ?
      `, [triggerId]);

      expect(trigger.execution_count).toBe(1);
    });
  });

  describe('Status Effect Management', () => {
    test('should cleanup expired status effects', async () => {
      // Manually insert a status effect that expires immediately
      await db.run(`
        INSERT INTO character_status_effects 
        (character_id, status_type, effect_data, expires_at)
        VALUES (?, ?, ?, datetime('now', '-1 minute'))
      `, [
        testCharacter.id,
        'test_expired',
        '{"test": true}'
      ]);

      // Insert a non-expiring effect
      await db.run(`
        INSERT INTO character_status_effects 
        (character_id, status_type, effect_data, expires_at)
        VALUES (?, ?, ?, ?)
      `, [
        testCharacter.id,
        'test_permanent',
        '{"test": true}',
        null // Never expires
      ]);

      // Get effects before cleanup (should only return active effects)
      const beforeCleanup = await eventTriggerService.getActiveStatusEffects(testCharacter.id);
      expect(beforeCleanup).toHaveLength(1); // Only non-expired should be returned
      expect(beforeCleanup[0].status_type).toBe('test_permanent');

      // Run cleanup
      await eventTriggerService.cleanupExpiredStatusEffects();

      // Check that expired effect was removed
      const allEffects = await db.all(`
        SELECT * FROM character_status_effects WHERE character_id = ?
      `, [testCharacter.id]);

      expect(allEffects).toHaveLength(1);
      expect(allEffects[0].status_type).toBe('test_permanent');
    });
  });

  describe('Trigger History', () => {
    test('should track trigger execution history', async () => {
      const triggerId = await eventTriggerService.createTrigger(
        'History Test',
        'global',
        null,
        'test'
      );

      await eventTriggerService.addTriggerEffect(
        triggerId,
        'message',
        'self',
        { test: true }
      );

      const context: TriggerContext = {
        character: testCharacter,
        eventData: { action: 'test_action' }
      };

      await eventTriggerService.processTrigger('test', 'global', null, context);

      const history = await eventTriggerService.getTriggerHistory(10);
      
      // The trigger should have been executed
      expect(history.length).toBeGreaterThan(0);
      
      // Find our specific trigger execution
      const triggerExecution = history.find(h => h.trigger_id === triggerId);
      expect(triggerExecution).toBeDefined();
      expect(triggerExecution!.character_id).toBe(testCharacter.id);
      expect(triggerExecution!.event_type).toBe('test');
      
      const eventData = JSON.parse(triggerExecution!.event_data!);
      expect(eventData.eventData.action).toBe('test_action');
    });
  });
});