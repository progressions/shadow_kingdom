import * as dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config();

async function testClaudeConnection() {
  console.log('🔧 Testing Claude API Connection...\n');
  
  // Check if API key is set
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    console.error('❌ CLAUDE_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 20) + '...');
  
  try {
    // Initialize Claude client
    const client = new Anthropic({ apiKey });
    console.log('✅ Claude client initialized\n');
    
    // Send a simple test prompt
    console.log('📤 Sending test prompt: "Tell me a very short story about a knight in 2-3 sentences."\n');
    
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: 'Tell me a very short story about a knight in 2-3 sentences.'
        }
      ]
    });
    
    console.log('✅ Response received from Claude!\n');
    console.log('📖 Story:');
    console.log('─'.repeat(50));
    
    // Extract the text content from the response
    const content = response.content[0];
    if (content.type === 'text') {
      console.log(content.text);
    }
    
    console.log('─'.repeat(50));
    console.log('\n✅ Claude API connection test successful!');
    console.log(`📊 Tokens used: ${response.usage?.input_tokens} input, ${response.usage?.output_tokens} output`);
    
  } catch (error: any) {
    console.error('❌ Failed to connect to Claude API:');
    console.error('Error:', error.message);
    
    if (error.status === 401) {
      console.error('\n🔑 Authentication failed. Please check your API key.');
    } else if (error.status === 429) {
      console.error('\n⏱️  Rate limit exceeded. Please wait and try again.');
    } else if (error.status === 400) {
      console.error('\n📝 Bad request. Check the prompt format.');
    }
    
    process.exit(1);
  }
}

// Run the test
testClaudeConnection().catch(console.error);