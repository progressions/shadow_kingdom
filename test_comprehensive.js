const { spawn } = require('child_process');

async function testFullGameSystem() {
  console.log('=== Testing Complete Game Save System ===\n');
  
  const game = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let step = 0;
  
  const steps = [
    'new',           // Create new game
    'Adventure 1',   // Game name 
    'look',          // Look around
    'e',             // Go east
    'menu',          // Return to menu
    'new',           // Create second game
    'Quest 2',       // Second game name
    'n',             // Go north
    'menu',          // Return to menu
    'load',          // Load game
    '1',             // Select first game
    'look',          // Should be in garden
    'menu',          // Return to menu
    'load',          // Load game
    '2',             // Select second game 
    'look',          // Should be in library
    'menu',          // Return to menu
    'delete',        // Delete game
    '2',             // Delete second game
    'yes',           // Confirm deletion
    'load',          // Load - should only show first game
    '1',             // Load first game
    'w',             // Go back to entrance
    'menu',          // Return to menu
    'exit'           // Exit
  ];

  game.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    console.log('OUT:', text);
    
    // Auto-respond to prompts
    if (text.includes('Enter a name for your new game:') || 
        text.includes('Game name:')) {
      console.log(`Sending step ${step}: ${steps[step]}`);
      game.stdin.write(steps[step] + '\n');
      step++;
    } else if (text.includes('Enter your choice:') ||
               text.includes('menu>') || 
               text.includes('> ')) {
      if (step < steps.length) {
        setTimeout(() => {
          console.log(`Sending step ${step}: ${steps[step]}`);
          game.stdin.write(steps[step] + '\n');
          step++;
        }, 500);
      }
    } else if (text.includes('Type "yes" to confirm:')) {
      console.log(`Sending step ${step}: ${steps[step]}`);
      game.stdin.write(steps[step] + '\n');
      step++;
    }
  });

  game.stderr.on('data', (data) => {
    console.log('ERR:', data.toString());
  });

  // Clean exit after test
  setTimeout(() => {
    console.log('\n=== Test completed ===');
    game.kill();
  }, 30000);
}

testFullGameSystem();