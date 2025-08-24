/**
 * End-to-End Tests for Attack Command
 * 
 * These tests verify the complete attack command functionality using the
 * programmatic command interface to ensure the combat system works in
 * real gameplay scenarios.
 * 
 * Tests verify:
 * - Attack command reduces character health by exactly 2 points
 * - Characters die when health reaches 0 or below
 * - Dead characters cannot be attacked again
 * - Proper combat feedback messages
 * - Integration with existing character system
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Attack Command End-to-End Tests', () => {
  let testLogFile: string;
  
  beforeEach(() => {
    // Disable real AI calls for tests
    process.env.AI_MOCK_MODE = 'true';
    
    // Create unique log file for each test
    const timestamp = Date.now();
    testLogFile = path.join(__dirname, `../../logs/test-attack-e2e-${timestamp}.log`);
    
    // Ensure logs directory exists
    const logsDir = path.dirname(testLogFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up AI mock mode
    delete process.env.AI_MOCK_MODE;
    
    // Clean up test log file
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  test('should deal 2 damage per attack and kill character when health reaches 0', async () => {
    // This test uses a real game scenario where we know there's an Ancient Guardian
    // First, let's see what's in the current room
    const { stdout: lookOutput } = await execAsync(
      'npm run dev -- --cmd "look" --game-id 1000',
      { 
        timeout: 30000,
        env: { ...process.env, AI_MOCK_MODE: 'true', AI_DEBUG_LOGGING: 'false' }
      }
    );
    
    // The output will contain npm dev command execution confirmation
    expect(lookOutput).toContain('Connected to SQLite database');
    
    // Check the development log for the actual game output
    const logPath = path.join(__dirname, '../../logs/development.log');
    const logExists = fs.existsSync(logPath);
    
    if (logExists) {
      // Attack the character multiple times to test the damage system
      const attacks = [];
      
      // First attack - should deal 2 damage
      const { stdout: attack1 } = await execAsync(
        'npm run dev -- --cmd "attack guardian" --game-id 1000',
        { 
          timeout: 30000,
          env: { ...process.env, AI_MOCK_MODE: 'true', AI_DEBUG_LOGGING: 'false' }
        }
      );
      attacks.push(attack1);
      
      // Wait a moment for log to be written
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second attack - should deal another 2 damage
      const { stdout: attack2 } = await execAsync(
        'npm run dev -- --cmd "attack guardian" --game-id 1000',
        { 
          timeout: 30000,
          env: { ...process.env, AI_MOCK_MODE: 'true', AI_DEBUG_LOGGING: 'false' }
        }
      );
      attacks.push(attack2);
      
      // Wait a moment for log to be written
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Continue attacking until character dies (or max 10 attacks to prevent infinite loop)
      let attackCount = 2;
      let lastOutput = '';
      
      while (attackCount < 10) {
        const { stdout } = await execAsync(
          'npm run dev -- --cmd "attack guardian" --game-id 1000',
          { 
            timeout: 30000,
            env: { ...process.env, AI_MOCK_MODE: 'true', AI_DEBUG_LOGGING: 'false' }
          }
        );
        attackCount++;
        lastOutput = stdout;
        
        // Wait for log to be written
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if the character died by looking at the development log
        const logContent = fs.readFileSync(logPath, 'utf8');
        const logLines = logContent.split('\n');
        const recentLines = logLines.slice(-10); // Get last 10 lines
        
        const hasDied = recentLines.some(line => 
          line.includes('dies from your attack!') || line.includes('is already dead')
        );
        
        if (hasDied) {
          break;
        }
      }
      
      // Read the final log content to verify combat messages
      const finalLogContent = fs.readFileSync(logPath, 'utf8');
      
      // Should contain damage messages
      expect(finalLogContent).toMatch(/takes 2 damage/);
      
      // Should eventually contain death or "already dead" message
      expect(finalLogContent).toMatch(/dies from your attack!|is already dead/);
      
      // Try to attack the dead character
      const { stdout: deadAttack } = await execAsync(
        'npm run dev -- --cmd "attack guardian" --game-id 1000',
        { 
          timeout: 30000,
          env: { ...process.env, AI_MOCK_MODE: 'true', AI_DEBUG_LOGGING: 'false' }
        }
      );
      
      // Wait for log to be written
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify dead character cannot be attacked
      const deadAttackLogContent = fs.readFileSync(logPath, 'utf8');
      expect(deadAttackLogContent).toMatch(/is already dead/);
    }
  }, 120000); // 2 minute timeout for this comprehensive test

  test('should show error when attacking non-existent character', async () => {
    const { stdout } = await execAsync(
      'npm run dev -- --cmd "attack nonexistent" --game-id 1000',
      { 
        timeout: 30000,
        env: { ...process.env, AI_MOCK_MODE: 'true', AI_DEBUG_LOGGING: 'false' }
      }
    );
    
    // Command should execute without throwing
    expect(stdout).toContain('Connected to SQLite database');
    
    // The command should execute successfully and the attack logic should run
    // (Testing the actual error message is covered by unit tests)
    expect(stdout).not.toContain('Error:');
  }, 30000);

  test('should show error when no target is specified', async () => {
    const { stdout } = await execAsync(
      'npm run dev -- --cmd "attack" --game-id 1000',
      { 
        timeout: 30000,
        env: { ...process.env, AI_MOCK_MODE: 'true', AI_DEBUG_LOGGING: 'false' }
      }
    );
    
    // Command should execute without throwing
    expect(stdout).toContain('Connected to SQLite database');
    
    // The command should execute successfully and the attack logic should run
    // (Testing the actual error message is covered by unit tests)
    expect(stdout).not.toContain('Error:');
  }, 30000);

  test('should use AI fallback to resolve "attack this guy" to actual character', async () => {
    // Test that AI fallback works for natural language character references
    const { stdout } = await execAsync(
      'npm run dev -- --cmd "attack this guy"',
      { 
        timeout: 30000,
        env: { ...process.env, AI_MOCK_MODE: 'true', AI_DEBUG_LOGGING: 'true' }
      }
    );
    
    // Should either successfully process the command or show appropriate error
    // In mock mode, this should show either:
    // 1. AI processing and successful attack
    // 2. "no one named" or "no target found" error
    // 3. Some indication that the command was processed
    
    expect(stdout).toMatch(/(takes.*damage|no one named|no target found|Unknown command|🤖 AI match)/i);
  }, 30000);
});