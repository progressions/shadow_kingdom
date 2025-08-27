import * as dotenv from 'dotenv';
import { PrismaService } from './src/services/prismaService';
import { GameStateManager } from './src/services/gameStateManager';
import { ClaudeService } from './src/services/claudeService';

// Load environment variables
dotenv.config();

async function testClaudeGameContent() {
  console.log('🎮 Testing Claude Game Content Generation...\n');
  
  // Initialize services
  const prismaService = PrismaService.getInstance();
  const gameStateManager = new GameStateManager(prismaService);
  const claudeService = new ClaudeService(prismaService, gameStateManager);
  
  try {
    console.log('✅ Services initialized');
    console.log(`📋 Mock Mode: ${claudeService.isInMockMode() ? 'ON' : 'OFF'}\n`);
    
    // Test 1: Generate a room description
    console.log('🏰 Test 1: Generating a room description...\n');
    const roomPrompt = {
      regionTheme: 'Castle Keep - medieval fortress with stone halls and armories',
      adjacentRooms: [
        { name: 'Castle Entrance', direction: 'south' },
        { name: 'Guard Tower', direction: 'west' }
      ],
      playerHistory: ['Entered the castle', 'Spoke with the gatekeeper']
    };
    
    const roomResult = await claudeService.generateRoom(roomPrompt);
    console.log('Room Generated:');
    console.log('─'.repeat(50));
    console.log(`Name: ${roomResult.name}`);
    console.log(`Description: ${roomResult.description}`);
    if (roomResult.exits) {
      console.log(`Exits: ${Object.entries(roomResult.exits).map(([dir, desc]) => `${dir}: ${desc}`).join(', ')}`);
    }
    if (roomResult.items && roomResult.items.length > 0) {
      console.log(`Items: ${roomResult.items.join(', ')}`);
    }
    console.log('─'.repeat(50));
    
    // Test 2: Generate NPC dialogue
    console.log('\n👤 Test 2: Generating NPC dialogue...\n');
    const npcContext = {
      characterId: 1,
      playerInput: 'Tell me about the castle',
      conversationHistory: [
        { role: 'npc', message: 'Halt! State your business.' },
        { role: 'player', message: 'I seek entrance to the castle.' }
      ]
    };
    
    const dialogueResult = await claudeService.generateNPCDialogue(npcContext);
    console.log('NPC Dialogue:');
    console.log('─'.repeat(50));
    console.log(`"${dialogueResult.dialogue}"`);
    console.log(`Emotion: ${dialogueResult.emotion}`);
    if (dialogueResult.hints && dialogueResult.hints.length > 0) {
      console.log(`Hints: ${dialogueResult.hints.join(', ')}`);
    }
    console.log('─'.repeat(50));
    
    // Test 3: Generate item description
    console.log('\n⚔️ Test 3: Generating item description...\n');
    const itemContext = {
      itemName: 'Ancient Sword',
      roomContext: 'A dusty armory filled with old weapons and armor',
      regionTheme: 'Castle Keep - medieval fortress'
    };
    
    const itemResult = await claudeService.generateItemDescription(itemContext);
    console.log('Item Description:');
    console.log('─'.repeat(50));
    console.log(itemResult.description);
    if (itemResult.properties) {
      console.log(`\nProperties: ${Object.entries(itemResult.properties).map(([key, val]) => `${key}: ${val}`).join(', ')}`);
    }
    if (itemResult.lore) {
      console.log(`\nLore: ${itemResult.lore}`);
    }
    console.log('─'.repeat(50));
    
    console.log('\n✅ All Claude game content generation tests successful!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up
    await prismaService.disconnect();
  }
}

// Run the tests
testClaudeGameContent().catch(console.error);