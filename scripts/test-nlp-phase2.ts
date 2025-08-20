#!/usr/bin/env ts-node

import { UnifiedNLPEngine } from '../src/nlp/unifiedNLPEngine';
import { GrokClient } from '../src/ai/grokClient';
import { GameContext } from '../src/nlp/types';
import { TESTING_NLP_CONFIG } from '../src/nlp/config';

/**
 * Manual test script for Phase 2: AI Fallback System
 * Run with: npm run test:nlp-phase2
 */

async function testPhase2() {
  console.log('🚀 Shadow Kingdom NLP Phase 2: AI Fallback System Test\n');
  console.log('='.repeat(60));
  
  // Initialize with testing configuration and mock mode
  const grokClient = new GrokClient({ mockMode: true });
  const config = { ...TESTING_NLP_CONFIG, enableDebugLogging: true };
  const engine = new UnifiedNLPEngine(grokClient, config);
  
  // Test context
  const gameContext: GameContext = {
    gameId: 1,
    currentRoom: {
      id: 1,
      name: 'Enchanted Library',
      description: 'A vast library filled with ancient tomes and magical artifacts',
      availableExits: ['north', 'south', 'east', 'west']
    },
    recentCommands: ['look', 'go north']
  };

  console.log('\n📚 Testing Context:');
  console.log(`Current room: ${gameContext.currentRoom!.name}`);
  console.log(`Available exits: ${gameContext.currentRoom!.availableExits.join(', ')}`);
  console.log(`Game ID: ${gameContext.gameId}`);

  console.log('\n⚙️  Engine Configuration:');
  const currentConfig = engine.getConfig();
  console.log(`Local confidence threshold: ${(currentConfig.localConfidenceThreshold * 100).toFixed(0)}%`);
  console.log(`AI confidence threshold: ${(currentConfig.aiConfidenceThreshold * 100).toFixed(0)}%`);
  console.log(`AI fallback enabled: ${currentConfig.enableAIFallback ? 'Yes' : 'No'}`);
  console.log(`Max processing time: ${currentConfig.maxProcessingTime}ms`);

  // Test cases organized by expected processing path
  const testCases = [
    {
      category: '🎯 Local Pattern Matches (should not use AI)',
      commands: [
        'go north',
        'move south',
        'look around',
        'take sword',
        'examine the door',
        'talk to merchant',
        'help',
        'n',
        's'
      ]
    },
    {
      category: '🤖 AI Fallback Commands (should use AI when local patterns fail)',
      commands: [
        'wander around the library',
        'search for hidden passages',
        'explore this magical place',
        'find something interesting',
        'greet the librarian',
        'investigate the strange sounds',
        'cast a spell',
        'read the ancient texts'
      ]
    },
    {
      category: '❌ Failed Commands (should fail completely)',
      commands: [
        'xyz123 complete nonsense',
        'blahblahblah',
        'hjklasdfghjkl',
        '!@#$%^&*()',
        ''
      ]
    }
  ];

  // Process test cases
  for (const { category, commands } of testCases) {
    console.log(`\n${category}:`);
    console.log('-'.repeat(category.length));
    
    for (const command of commands) {
      if (!command.trim()) continue; // Skip empty commands in demo
      
      const startTime = Date.now();
      const result = await engine.processCommand(command, gameContext);
      const processingTime = Date.now() - startTime;
      
      if (result) {
        const sourceIcon = result.source === 'local' ? '🎯' : '🤖';
        const params = result.params.length > 0 ? ` [${result.params.join(', ')}]` : '';
        console.log(`  ${sourceIcon} "${command}" → ${result.action}${params} (${(result.confidence * 100).toFixed(0)}% confidence, ${processingTime}ms)`);
        if (result.reasoning) {
          console.log(`      Reasoning: ${result.reasoning}`);
        }
      } else {
        console.log(`  ❌ "${command}" → No match (${processingTime}ms)`);
      }
    }
  }

  // Performance comparison
  console.log('\n⚡ Performance Comparison:');
  console.log('-'.repeat(26));
  
  console.log('\nLocal processing speed:');
  const localStart = Date.now();
  for (let i = 0; i < 100; i++) {
    await engine.processCommand('go north', gameContext);
  }
  const localTime = Date.now() - localStart;
  console.log(`  100 local commands: ${localTime}ms (avg: ${(localTime / 100).toFixed(2)}ms)`);

  console.log('\nAI fallback speed (mock mode):');
  const aiStart = Date.now();
  for (let i = 0; i < 10; i++) {
    await engine.processCommand('explore the mysterious library', gameContext);
  }
  const aiTime = Date.now() - aiStart;
  console.log(`  10 AI commands: ${aiTime}ms (avg: ${(aiTime / 10).toFixed(2)}ms)`);

  // Configuration testing
  console.log('\n🔧 Configuration Impact Testing:');
  console.log('-'.repeat(33));
  
  // Test with different thresholds
  console.log('\nTesting with high local threshold (forces AI fallback):');
  engine.updateConfig({ localConfidenceThreshold: 0.99 });
  
  const highThresholdCommand = 'look around';
  const highThresholdResult = await engine.processCommand(highThresholdCommand, gameContext);
  if (highThresholdResult) {
    console.log(`  "${highThresholdCommand}" → ${highThresholdResult.source} processing (confidence: ${(highThresholdResult.confidence * 100).toFixed(0)}%)`);
  }
  
  // Reset to normal threshold
  engine.updateConfig({ localConfidenceThreshold: 0.6 });
  
  console.log('\nTesting with AI disabled:');
  engine.updateConfig({ enableAIFallback: false });
  
  const noAiResult = await engine.processCommand('explore the mystical realm', gameContext);
  if (noAiResult) {
    console.log(`  "explore the mystical realm" → ${noAiResult.source} processing`);
  } else {
    console.log(`  "explore the mystical realm" → Failed (AI disabled)`);
  }

  // Final statistics
  console.log('\n📊 Final Statistics:');
  console.log('-'.repeat(20));
  const stats = engine.getStats();
  console.log(`Total commands processed: ${stats.totalCommands}`);
  console.log(`Local matches: ${stats.localMatches} (${(stats.localSuccessRate * 100).toFixed(1)}%)`);
  console.log(`AI matches: ${stats.aiMatches} (${(stats.aiSuccessRate * 100).toFixed(1)}%)`);
  console.log(`Failures: ${stats.failures} (${((stats.failures / stats.totalCommands) * 100 || 0).toFixed(1)}%)`);
  console.log(`Overall success rate: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`Average processing time: ${stats.avgProcessingTime.toFixed(2)}ms`);

  console.log('\n🎉 Phase 2: AI Fallback System Implementation Complete!');
  console.log('\n✅ Key Features Demonstrated:');
  console.log('  - Local pattern matching with high performance');
  console.log('  - AI fallback for complex natural language');
  console.log('  - Configurable confidence thresholds');
  console.log('  - Processing timeout protection');
  console.log('  - Comprehensive statistics tracking');
  console.log('  - Mock mode for testing without API costs');
  
  console.log('\n🚀 Next Steps:');
  console.log('  - Phase 3: Advanced Context Resolution');
  console.log('  - Phase 4: Learning & Optimization');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPhase2().catch(console.error);
}

export { testPhase2 };