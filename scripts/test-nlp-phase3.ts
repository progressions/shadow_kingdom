#!/usr/bin/env ts-node

import { EnhancedNLPEngine } from '../src/nlp/enhancedNLPEngine';
import { GrokClient } from '../src/ai/grokClient';
import { GameContext } from '../src/nlp/types';
import { TESTING_NLP_CONFIG } from '../src/nlp/config';

/**
 * Manual test script for Phase 3: Advanced Context Resolution
 * Run with: npm run test:nlp-phase3
 */

async function testPhase3() {
  console.log('🧠 Shadow Kingdom NLP Phase 3: Advanced Context Resolution\n');
  console.log('='.repeat(65));
  
  // Initialize with testing configuration and mock mode
  const grokClient = new GrokClient({ mockMode: true });
  const config = { ...TESTING_NLP_CONFIG, enableDebugLogging: true };
  const engine = new EnhancedNLPEngine(grokClient, config);
  
  // Rich test context with detailed room description
  const gameContext: GameContext = {
    mode: 'game',
    gameId: 1,
    currentRoom: {
      id: 1,
      name: 'Wizard\'s Study',
      description: 'A cluttered wizard\'s study filled with ancient tomes and mystical artifacts. On the oak desk sits a golden key and a crystal orb that pulses with inner light. An old wizard in starry robes studies an ancient scroll by the fireplace. A silver sword hangs above the mantel, and mysterious potions bubble on nearby shelves. The marble fountain in the corner provides a soothing backdrop of flowing water.',
      availableExits: ['north', 'south', 'east', 'west']
    },
    recentCommands: []
  };

  console.log('\n📚 Testing Context:');
  console.log(`Room: ${gameContext.currentRoom!.name}`);
  console.log(`Description: ${gameContext.currentRoom!.description}`);
  console.log(`Exits: ${gameContext.currentRoom!.availableExits.join(', ')}`);

  // Test categories for Phase 3 features
  const testCategories = [
    {
      category: '🎯 Context-Aware Object Recognition',
      description: 'Extracting and resolving objects from room descriptions',
      commands: [
        'examine the key',
        'take orb',
        'look at sword',
        'examine potions',
        'inspect the fountain',
        'talk to wizard',
        'examine scroll'
      ]
    },
    {
      category: '👤 Pronoun and Reference Resolution',
      description: 'Using pronouns to refer to previously mentioned objects',
      commands: [
        // Set up referents first
        'examine sword',
        'take it',          // Should refer to sword
        'look at wizard',
        'talk to him',      // Should refer to wizard
        'examine key',
        'use it',           // Should refer to key
        'look at potions',
        'take them'         // Should refer to potions
      ]
    },
    {
      category: '🏛️ Spatial Reference Understanding',
      description: 'Understanding spatial references like "the door", "the fountain"',
      commands: [
        'examine the desk',
        'look at the fireplace',
        'inspect the mantel',
        'examine the shelves',
        'look at the corner',
        'go to the door',
        'move toward the fountain'
      ]
    },
    {
      category: '🔗 Compound Command Processing',
      description: 'Handling multiple commands connected with "and", "then", etc.',
      commands: [
        'take key and examine it',
        'look at wizard then talk to him',
        'examine orb and take it',
        'pick up sword and use it',
        'take key, examine it, then use it',
        'talk to wizard and ask about scroll'
      ]
    },
    {
      category: '🧩 Complex Natural Language',
      description: 'Advanced commands requiring context understanding',
      commands: [
        'search the study for hidden items',
        'ask the wizard about the scroll',
        'gather all the magical items',
        'investigate the mysterious potions',
        'find something useful here',
        'help the wizard with his research'
      ]
    }
  ];

  let totalCommands = 0;
  let contextResolutions = 0;
  let compounds = 0;
  let pronouns = 0;

  // Process each test category
  for (const { category, description, commands } of testCategories) {
    console.log(`\n${category}:`);
    console.log(`${description}`);
    console.log('-'.repeat(category.length));
    
    for (const command of commands) {
      totalCommands++;
      const startTime = Date.now();
      const result = await engine.processCommand(command, gameContext);
      const processingTime = Date.now() - startTime;
      
      if (result) {
        let statusIcon = '🎯'; // Local
        let details = '';
        
        if (result.source === 'context') {
          contextResolutions++;
          statusIcon = '🧠';
          if (result.resolvedObjects) {
            const resolutionTypes = result.resolvedObjects.map(obj => obj.resolutionType);
            if (resolutionTypes.includes('pronoun')) {
              pronouns++;
              statusIcon = '👤';
            }
            details = ` | Resolved: ${result.resolvedObjects.map(obj => 
              `"${obj.originalRef}" → "${obj.resolvedName}" (${obj.resolutionType})`
            ).join(', ')}`;
          }
        } else if (result.source === 'ai') {
          statusIcon = '🤖';
        }
        
        if (result.isCompound) {
          compounds++;
          statusIcon = '🔗';
          details = ` | Compound: ${result.compoundCommands?.length} commands`;
        }
        
        const confidence = (result.confidence * 100).toFixed(0);
        console.log(`  ${statusIcon} "${command}" → ${result.action} (${confidence}%, ${processingTime}ms)${details}`);
        
        if (result.reasoning) {
          console.log(`      💭 ${result.reasoning}`);
        }
      } else {
        console.log(`  ❌ "${command}" → No resolution (${processingTime}ms)`);
      }
    }
  }

  // Performance benchmark
  console.log('\n⚡ Performance Benchmark:');
  console.log('-'.repeat(25));
  
  const benchmarkCommands = [
    'examine sword',      // Context resolution
    'take it',           // Pronoun resolution  
    'look at fountain',  // Spatial resolution
    'take key and use it' // Compound command
  ];
  
  console.log('\nRepeated operations (100x each):');
  for (const command of benchmarkCommands) {
    const iterations = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await engine.processCommand(command, gameContext);
    }
    
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / iterations;
    console.log(`  "${command}": ${avgTime.toFixed(2)}ms avg (${totalTime}ms total)`);
  }

  // Memory and state demonstration
  console.log('\n🧠 Context Memory Demonstration:');
  console.log('-'.repeat(33));
  
  console.log('\nEstablishing object references:');
  await engine.processCommand('examine the crystal orb', gameContext);
  await engine.processCommand('look at the old wizard', gameContext);
  await engine.processCommand('inspect the silver sword', gameContext);
  
  console.log('\nUsing pronouns to reference previously examined objects:');
  const pronounCommands = ['take it', 'talk to him', 'use it'];
  for (const cmd of pronounCommands) {
    const result = await engine.processCommand(cmd, gameContext);
    if (result && result.resolvedObjects) {
      const resolved = result.resolvedObjects[0];
      console.log(`  "${cmd}" → references "${resolved.resolvedName}" (${resolved.resolutionType})`);
    }
  }

  // Clear context and show the difference
  console.log('\nAfter clearing context:');
  engine.clearRoomContext();
  const result = await engine.processCommand('take it', gameContext);
  console.log(`  "take it" → ${result ? 'resolved' : 'failed (no referent)'}`);

  // Final statistics
  console.log('\n📊 Phase 3 Statistics:');
  console.log('-'.repeat(23));
  const stats = engine.getStats();
  
  console.log(`\n🎯 Processing Breakdown:`);
  console.log(`  Total commands: ${totalCommands}`);
  console.log(`  Context resolutions: ${contextResolutions} (${(contextResolutions/totalCommands*100).toFixed(1)}%)`);
  console.log(`  Pronoun resolutions: ${pronouns} (${(pronouns/totalCommands*100).toFixed(1)}%)`);
  console.log(`  Compound commands: ${compounds} (${(compounds/totalCommands*100).toFixed(1)}%)`);
  console.log(`  Local patterns: ${stats.localMatches} (${(stats.localSuccessRate*100).toFixed(1)}%)`);
  console.log(`  AI fallbacks: ${stats.aiMatches} (${(stats.aiSuccessRate*100).toFixed(1)}%)`);
  console.log(`  Overall success: ${(stats.successRate*100).toFixed(1)}%`);
  
  console.log(`\n🧠 Context Resolution Details:`);
  console.log(`  Context resolutions: ${stats.contextResolution.contextResolutions}`);
  console.log(`  Pronoun resolutions: ${stats.contextResolution.pronounResolutions}`);
  console.log(`  Spatial resolutions: ${stats.contextResolution.spatialResolutions}`);
  console.log(`  Compound commands: ${stats.contextResolution.compoundCommands}`);
  
  console.log(`\n⚡ Performance:`);
  console.log(`  Average processing time: ${stats.avgProcessingTime.toFixed(2)}ms`);
  console.log(`  Total commands processed: ${stats.totalCommands}`);

  console.log('\n🎉 Phase 3: Advanced Context Resolution Complete!');
  console.log('\n✅ Key Features Demonstrated:');
  console.log('  🧠 Context-aware object extraction from room descriptions');
  console.log('  👤 Pronoun resolution with interaction memory');
  console.log('  🏛️ Spatial reference understanding');
  console.log('  🔗 Compound command parsing and execution');
  console.log('  🎯 Multi-layered resolution priority system');
  console.log('  ⚡ High-performance processing with context awareness');
  
  console.log('\n🚀 Next Steps:');
  console.log('  - Phase 4: Learning & Optimization');
  console.log('  - Integration with GameController');
  console.log('  - Real-world testing and refinement');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPhase3().catch(console.error);
}

export { testPhase3 };