const { spawn } = require('child_process');

async function testGame() {
  console.log('Testing new game system...');
  
  const game = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  
  game.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    console.log('OUT:', text);
    
    if (text.includes('Enter a name for your new game:')) {
      console.log('Sending game name...');
      game.stdin.write('Test Game\n');
    }
  });

  game.stderr.on('data', (data) => {
    console.log('ERR:', data.toString());
  });

  // Start the sequence
  setTimeout(() => {
    console.log('Sending "new" command...');
    game.stdin.write('new\n');
  }, 1000);

  // Clean exit after test
  setTimeout(() => {
    game.kill();
  }, 10000);
}

testGame();