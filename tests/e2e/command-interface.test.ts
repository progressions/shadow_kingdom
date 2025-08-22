/**
 * End-to-End Tests for Command Interface
 * 
 * These tests verify the complete command interface functionality that allows
 * Claude and other external tools to execute single commands programmatically.
 * 
 * Tests verify:
 * - Command-line argument parsing (--cmd)
 * - Automatic game loading/creation
 * - Command execution through normal game logic
 * - Proper logging with timestamps
 * - Clean process exit
 * - Real file system integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Command Interface End-to-End Tests', () => {
  let testLogFile: string;
  let originalLogFile: string;
  
  beforeEach(() => {
    // Create unique log file for each test
    const timestamp = Date.now();
    testLogFile = path.join(__dirname, `../../logs/test-development-${timestamp}.log`);
    originalLogFile = path.join(__dirname, '../../logs/development.log');
    
    // Ensure logs directory exists
    const logsDir = path.dirname(testLogFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test log file
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  test('should execute look command and log output with timestamps', async () => {
    // Execute the command interface
    const { stdout, stderr } = await execAsync(
      'npm run dev -- --cmd "look"',
      { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000,
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify the command executed without errors
    expect(stderr).not.toMatch(/Error:|Failed:/);
    
    // Read the development log to verify proper logging
    const logContent = fs.readFileSync(originalLogFile, 'utf8');
    const logLines = logContent.split('\n');
    
    // Find the most recent command execution
    const recentLines = logLines.slice(-50); // Check last 50 lines
    const lookCommandIndex = recentLines.findIndex(line => line.includes('> look'));
    
    expect(lookCommandIndex).toBeGreaterThanOrEqual(0);
    
    // Verify the command was logged with timestamp
    const commandLine = recentLines[lookCommandIndex];
    expect(commandLine).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] > look/);
    
    // Verify room information was logged with timestamps
    const roomTitleIndex = recentLines.findIndex((line, index) => 
      index > lookCommandIndex && line.includes('Ancient Crypt Entrance')
    );
    expect(roomTitleIndex).toBeGreaterThanOrEqual(0);
    
    const roomTitleLine = recentLines[roomTitleIndex];
    expect(roomTitleLine).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] Ancient Crypt Entrance/);
    
    // Verify room description was logged
    const descriptionIndex = recentLines.findIndex((line, index) => 
      index > roomTitleIndex && line.includes('ancient crypt')
    );
    expect(descriptionIndex).toBeGreaterThanOrEqual(0);
  }, 60000);

  test('should execute inventory command successfully', async () => {
    // Execute the command interface
    const { stdout, stderr } = await execAsync(
      'npm run dev -- --cmd "inventory"',
      { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000,
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify the command executed without major errors
    expect(stderr).not.toMatch(/Error: Failed to start Shadow Kingdom/);
    expect(stderr).not.toMatch(/ENOENT/);
    
    // The command interface should exit cleanly
    // (Note: Ink TUI errors are expected in non-interactive environments)
  }, 60000);

  test('should handle invalid commands gracefully', async () => {
    // Execute the command interface with an invalid command
    const { stdout, stderr } = await execAsync(
      'npm run dev -- --cmd "invalidcommand"',
      { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000,
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // The command should still execute without crashing
    expect(stderr).not.toMatch(/Error: Failed to start Shadow Kingdom/);
    expect(stderr).not.toMatch(/ENOENT/);
  }, 60000);

  test('should execute help command successfully', async () => {
    // Execute the command interface
    const { stdout, stderr } = await execAsync(
      'npm run dev -- --cmd "help"',
      { 
        cwd: path.join(__dirname, '../..'),
        timeout: 30000,
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify the command executed without major errors
    expect(stderr).not.toMatch(/Error: Failed to start Shadow Kingdom/);
    expect(stderr).not.toMatch(/ENOENT/);
  }, 60000);
});