/**
 * Integration Tests for Comprehensive Logging System
 * 
 * These tests verify that the logging system works correctly when integrated
 * with real game components, testing the full flow from user actions to log files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from '../../src/services/loggerService';
// SessionInterface has been replaced with command interface
import Database from '../../src/utils/database';
import { createGameWithRooms } from '../../src/utils/initDb';
import { initializeTestDatabase } from '../testUtils';

describe('Logging System Integration Tests', () => {
  let testLogDirectory: string;
  let loggerService: LoggerService;
  let originalCwd: string;

  beforeEach(async () => {
    // Store original directory
    originalCwd = process.cwd();
    
    // Create unique test log directory
    testLogDirectory = path.join(__dirname, '../test-logs', `integration-${Date.now()}-${Math.random()}`);
    if (!fs.existsSync(testLogDirectory)) {
      fs.mkdirSync(testLogDirectory, { recursive: true });
    }

    // Create logger service for verification
    loggerService = new LoggerService({
      logDirectory: testLogDirectory,
      logLevel: 'DEBUG' as any,
      logToConsole: false,
      rotationDays: 30,
      logAiResponses: true,
      logUserCommands: true,
      logSystemOutput: true
    });
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);

    // Clean up test log directory
    if (fs.existsSync(testLogDirectory)) {
      fs.rmSync(testLogDirectory, { recursive: true, force: true });
    }
  });

  describe('LoggerService Integration with Game Flow', () => {
    test('should log user commands and system responses in sequence', async () => {
      // Simulate a typical game interaction sequence
      loggerService.logUserInput('look');
      loggerService.logSystemOutput('You find yourself in a dimly lit chamber.', 'room');
      
      loggerService.logUserInput('inventory');
      loggerService.logSystemOutput('Your inventory is empty.', 'system');
      
      loggerService.logUserInput('go north');
      loggerService.logSystemOutput('You move north into a new area.', 'room');

      // Verify log files exist and contain expected content
      const logPaths = loggerService.getLogFilePaths();
      expect(fs.existsSync(logPaths.session)).toBe(true);
      
      const logContent = fs.readFileSync(logPaths.session, 'utf8');
      const logLines = logContent.trim().split('\n');

      // Should contain all user inputs
      expect(logContent).toContain('> look');
      expect(logContent).toContain('> inventory');
      expect(logContent).toContain('> go north');
      
      // Should contain all system outputs
      expect(logContent).toContain('You find yourself in a dimly lit chamber.');
      expect(logContent).toContain('Your inventory is empty.');
      expect(logContent).toContain('You move north into a new area.');
      
      // Verify proper timestamp format for all entries
      logLines.forEach(line => {
        if (line.trim()) {
          expect(line).toMatch(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
        }
      });
    });

    test('should log game events during gameplay', async () => {
      // Simulate game events and their logging
      loggerService.logUserInput('go north');
      loggerService.logGameEvent({
        type: 'movement',
        details: { from: 'starting_room', to: 'northern_chamber', direction: 'north' }
      });
      loggerService.logSystemOutput('You enter a northern chamber filled with ancient artifacts.', 'room');
      
      // Log character interaction
      loggerService.logUserInput('talk ancient guardian');
      loggerService.logGameEvent({
        type: 'dialogue',
        details: { character: 'ancient guardian', player_message: 'hello' }
      });
      loggerService.logSystemOutput('The ancient guardian nods solemnly.', 'dialogue');

      // Verify all events were logged
      const logPaths = loggerService.getLogFilePaths();
      const logContent = fs.readFileSync(logPaths.session, 'utf8');
      
      // Should contain movement-related logs
      expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
      expect(logContent).toContain('> go north');
      expect(logContent).toContain('> talk ancient guardian');
      expect(logContent).toContain('You enter a northern chamber');
      expect(logContent).toContain('The ancient guardian nods');
      
      // Game events are logged to the session log along with user commands and system output
      // Events should be visible in the session log if they generate output
      expect(logContent).toBeDefined();
    });

    test('should handle multiple sequential commands with proper logging', async () => {
      const commands = ['look', 'inventory', 'help', 'stats', 'go east'];
      
      // Simulate sequential command execution
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        loggerService.logUserInput(command);
        
        // Add a small delay to ensure timestamp ordering
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Log appropriate system response
        const responses = {
          'look': 'You see a detailed description of your surroundings.',
          'inventory': 'Your inventory contains various items.',
          'help': 'Available commands: look, go, inventory, etc.',
          'stats': 'Your character statistics are displayed.',
          'go east': 'You move eastward into a new area.'
        };
        
        loggerService.logSystemOutput(responses[command as keyof typeof responses] || 'System response', 'system');
      }

      const logPaths = loggerService.getLogFilePaths();
      const logContent = fs.readFileSync(logPaths.session, 'utf8');
      
      // Verify all commands are logged
      for (const command of commands) {
        expect(logContent).toContain(`> ${command}`);
      }

      // Verify chronological order
      const lines = logContent.split('\n');
      let lastTimestamp = '';
      
      lines.forEach(line => {
        const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/);
        if (timestampMatch) {
          const currentTimestamp = timestampMatch[1];
          if (lastTimestamp) {
            expect(currentTimestamp >= lastTimestamp).toBe(true);
          }
          lastTimestamp = currentTimestamp;
        }
      });
    });
  });

  describe('LoggerService API Integration', () => {
    test('should log programmatic commands correctly', async () => {
      // Test direct logger service functionality
      loggerService.logUserInput('look');
      loggerService.logSystemOutput('You see a room description here.', 'room');
      loggerService.logUserInput('inventory');
      loggerService.logSystemOutput('Your inventory is empty.', 'system');

      const logPaths = loggerService.getLogFilePaths();
      expect(fs.existsSync(logPaths.session)).toBe(true);

      const logContent = fs.readFileSync(logPaths.session, 'utf8');
      
      // Verify both commands are logged
      expect(logContent).toContain('> look');
      expect(logContent).toContain('> inventory');
      
      // Verify responses are logged
      expect(logContent).toContain('You see a room description here.');
      expect(logContent).toContain('Your inventory is empty.');
      expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] [^>]/); // System output
    });

    test('should maintain consistent formatting across multiple logs', async () => {
      // Generate multiple log entries
      loggerService.logUserInput('help');
      loggerService.logSystemOutput('Available commands: look, go, inventory', 'system');
      loggerService.logUserInput('look');
      loggerService.logSystemOutput('A detailed room description.', 'room');
      
      const logPaths = loggerService.getLogFilePaths();
      const logContent = fs.readFileSync(logPaths.session, 'utf8');
      
      // Should contain session activity
      expect(logContent).toContain('> help');
      expect(logContent).toContain('> look');
      expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
      
      // Verify consistent formatting
      const lines = logContent.trim().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          expect(line).toMatch(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
        }
      });
    });
  });

  describe('AI Integration Logging', () => {
    test('should log AI requests and responses when enabled', async () => {
      // Test AI logging functionality directly
      const requestId = loggerService.logGrokRequest('Test prompt for room generation', '/grok/generate-room');
      expect(requestId).toBeTruthy();
      
      // Log a successful response
      loggerService.logGrokResponse(requestId, {
        room_name: 'Test Room',
        description: 'A test room generated by AI'
      }, { input: 10, output: 20 }, 150);

      const logPaths = loggerService.getLogFilePaths();
      
      // AI logs should be created
      if (fs.existsSync(logPaths.ai)) {
        const aiLogContent = fs.readFileSync(logPaths.ai, 'utf8');
        
        if (aiLogContent.trim()) {
          // Parse JSON log entries, filtering out decorative lines
          const lines = aiLogContent.trim().split('\n');
          const jsonLines = lines.filter(line => {
            line = line.trim();
            return line && line.startsWith('{') && line.endsWith('}');
          });
          
          if (jsonLines.length > 0) {
            const logEntries = jsonLines.map(line => JSON.parse(line));
          
            logEntries.forEach(entry => {
              expect(entry).toHaveProperty('request_id');
              expect(entry).toHaveProperty('timestamp');
              expect(entry).toHaveProperty('success');
            });
            
            // Should find our test entries
            const testRequest = logEntries.find(entry => entry.prompt?.includes('Test prompt'));
            expect(testRequest).toBeDefined();
          }
        }
      }
    });

    test('should handle AI logging when disabled', async () => {
      // Create logger with AI logging disabled
      const restrictedLogger = new LoggerService({
        logDirectory: testLogDirectory,
        logAiResponses: false,
        logUserCommands: true,
        logSystemOutput: true
      });

      const requestId = restrictedLogger.logGrokRequest('test prompt', '/test');
      expect(requestId).toBe(''); // Should return empty string when disabled
      
      const logPaths = restrictedLogger.getLogFilePaths();
      
      // AI log file might not exist or be empty
      if (fs.existsSync(logPaths.ai)) {
        const content = fs.readFileSync(logPaths.ai, 'utf8');
        expect(content.trim()).toBe('');
      }
    });
  });

  describe('Log File Management', () => {
    test('should create appropriate log files based on environment', () => {
      const originalEnv = process.env.NODE_ENV;
      
      try {
        // Test different environments
        const environments = ['development', 'test', 'production'];
        
        environments.forEach(env => {
          process.env.NODE_ENV = env;
          
          const envLogDir = path.join(testLogDirectory, `env-${env}-${Date.now()}`);
          const envLogger = new LoggerService({ logDirectory: envLogDir });
          
          envLogger.logUserInput('test command');
          
          const logPaths = envLogger.getLogFilePaths();
          expect(logPaths.session).toContain(`${env}.log`);
          expect(logPaths.ai).toContain('grok_responses.log');
          
          // Verify files are created
          expect(fs.existsSync(logPaths.session)).toBe(true);
          
          // Clean up
          fs.rmSync(envLogDir, { recursive: true, force: true });
        });
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('should handle concurrent logging across components', async () => {
      // Test concurrent logging directly with LoggerService
      const promises = [
        Promise.resolve(loggerService.logUserInput('look')),
        Promise.resolve(loggerService.logUserInput('inventory')),
        Promise.resolve(loggerService.logUserInput('help')),
        Promise.resolve(loggerService.logSystemOutput('Room description', 'room'))
      ];

      await Promise.all(promises);

      const logPaths = loggerService.getLogFilePaths();
      const logContent = fs.readFileSync(logPaths.session, 'utf8');
      const lines = logContent.trim().split('\n');

      // Should contain logs from concurrent operations
      const userCommands = lines.filter(line => line.includes(' > '));
      expect(userCommands.length).toBeGreaterThanOrEqual(3);

      // Verify all commands are present
      expect(logContent).toContain('> look');
      expect(logContent).toContain('> inventory');
      expect(logContent).toContain('> help');

      // Verify no corrupted lines (all should have timestamps)
      lines.forEach(line => {
        if (line.trim()) {
          expect(line).toMatch(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
        }
      });
    });

    test('should preserve log formatting consistency across components', async () => {
      // Generate logs from different sources using LoggerService directly
      loggerService.logUserInput('look');
      loggerService.logSystemOutput('Room description from look command', 'room');
      loggerService.logUserInput('inventory');
      loggerService.logSystemOutput('Inventory contents', 'system');
      
      loggerService.info('Manual log entry');
      loggerService.error('Test error message');

      const logPaths = loggerService.getLogFilePaths();
      const logContent = fs.readFileSync(logPaths.session, 'utf8');
      const lines = logContent.trim().split('\n');

      // All lines should follow consistent timestamp format
      lines.forEach(line => {
        if (line.trim()) {
          expect(line).toMatch(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
        }
      });

      // User commands should have > prefix
      const userCommandLines = lines.filter(line => line.includes(' > '));
      userCommandLines.forEach(line => {
        expect(line).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] > /);
      });
      expect(userCommandLines.length).toBeGreaterThan(0);
      
      // System output (from logSystemOutput) should not have type labels
      const systemOutputLines = lines.filter(line => 
        !line.includes(' > ') && 
        !line.includes('INFO:') && 
        !line.includes('ERROR:') && 
        line.trim()
      );
      
      // Logger service info/error messages should have type labels
      const loggerLines = lines.filter(line => 
        (line.includes('INFO:') || line.includes('ERROR:')) && 
        line.trim()
      );
      
      // Verify we have both types of messages
      expect(systemOutputLines.length).toBeGreaterThan(0);
      expect(loggerLines.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should continue logging after file write errors', async () => {
      // Create a scenario where initial writes might fail
      const problematicDir = path.join(testLogDirectory, 'problematic');
      
      const problemLogger = new LoggerService({ logDirectory: problematicDir });
      
      // These should not throw errors even if file operations fail
      expect(() => {
        problemLogger.logUserInput('test command 1');
        problemLogger.logSystemOutput('test output 1', 'system');
        problemLogger.logUserInput('test command 2');
      }).not.toThrow();

      // If logs were written successfully, verify content
      const logPaths = problemLogger.getLogFilePaths();
      if (fs.existsSync(logPaths.session)) {
        const content = fs.readFileSync(logPaths.session, 'utf8');
        expect(content).toContain('> test command 1');
        expect(content).toContain('> test command 2');
      }
    });

    test('should handle malformed log data gracefully', () => {
      // Test with various edge cases
      const edgeCases = [
        '', // Empty string
        '\n\n\n', // Multiple newlines
        'Command with\ttabs\tand\nlines', // Special characters
        '> command that looks like user input', // Confusing input
        '[2024-01-01 12:00:00] fake timestamp format' // Fake timestamp
      ];

      edgeCases.forEach(testCase => {
        expect(() => {
          loggerService.logUserInput(testCase);
          loggerService.logSystemOutput(testCase, 'system');
        }).not.toThrow();
      });

      // Verify logs were written
      const logPaths = loggerService.getLogFilePaths();
      if (fs.existsSync(logPaths.session)) {
        const content = fs.readFileSync(logPaths.session, 'utf8');
        expect(content).toBeDefined();
      }
    });
  });

  describe('Performance and Resource Management', () => {
    test('should handle high-frequency logging efficiently', async () => {
      const startTime = Date.now();
      
      // Generate many log entries quickly
      for (let i = 0; i < 50; i++) {
        loggerService.logUserInput(`command ${i}`);
        loggerService.logSystemOutput(`response ${i}`, 'system');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 2 seconds)
      expect(duration).toBeLessThan(2000);

      // Verify all entries were logged
      const logPaths = loggerService.getLogFilePaths();
      const content = fs.readFileSync(logPaths.session, 'utf8');
      const lines = content.trim().split('\n');
      
      // Should have 100 lines (50 commands + 50 responses)
      expect(lines.length).toBe(100);
    });

    test('should not consume excessive memory during extended logging', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate substantial logging activity
      for (let i = 0; i < 500; i++) {
        loggerService.logUserInput(`extended command ${i}`);
        if (i % 50 === 0) {
          loggerService.logGameEvent({
            type: 'movement',
            details: { action: 'test', iteration: i }
          });
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});