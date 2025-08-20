// Test setup file
import * as fs from 'fs';
import * as path from 'path';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console.log and console.clear to reduce test output noise
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'clear').mockImplementation(() => {});
});

afterAll(async () => {
  jest.restoreAllMocks();
  
  // Clean up any test database files at the end
  const testDbFiles = [
    'test_shadow_kingdom.db',
    'test_shadow_kingdom.db-journal',
    'test_shadow_kingdom.db-wal',
    'test_shadow_kingdom.db-shm'
  ];
  
  testDbFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  // Clean up any temp test files
  try {
    const tempFiles = fs.readdirSync(process.cwd()).filter(file => 
      file.startsWith('temp_test_') && file.endsWith('.db')
    );
    
    tempFiles.forEach(file => {
      try {
        fs.unlinkSync(path.join(process.cwd(), file));
        // Also clean up journal files
        const journalFile = file + '-journal';
        const journalPath = path.join(process.cwd(), journalFile);
        if (fs.existsSync(journalPath)) {
          fs.unlinkSync(journalPath);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  } catch (error) {
    // Ignore directory read errors
  }

  // Clean up PrismaService singleton at the very end
  try {
    const { PrismaService } = await import('../src/services/prismaService');
    if (PrismaService) {
      // Properly destroy the singleton and all its connections
      await PrismaService.destroy();
    }
  } catch (error) {
    // Ignore prisma cleanup errors
  }

  // Force cleanup of any remaining HTTP connections from axios/HTTP clients
  try {
    // Clear any potential global HTTP agent pools
    if (process.env.NODE_ENV === 'test') {
      // Force close all HTTP connections
      const http = require('http');
      const https = require('https');
      
      if (http.globalAgent) {
        http.globalAgent.destroy();
      }
      if (https.globalAgent) {
        https.globalAgent.destroy();
      }
    }
  } catch (error) {
    // Ignore HTTP cleanup errors
  }

  // Force cleanup of any Node.js handles and timers
  if (typeof global.gc === 'function') {
    global.gc();
  }

  // Clear all timers and intervals that might be lingering
  try {
    // Clear all possible timer IDs (crude but effective)
    for (let i = 1; i < 1000; i++) {
      clearTimeout(i);
      clearInterval(i);
    }
  } catch (error) {
    // Ignore timer cleanup errors
  }

  // Longer delay to allow any pending async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));

  // Final process cleanup
  try {
    if (process.stdin && typeof process.stdin.destroy === 'function') {
      process.stdin.destroy();
    }
    if (process.stdout && typeof process.stdout.end === 'function') {
      // Don't close stdout as it breaks Jest output
    }
  } catch (error) {
    // Ignore process cleanup errors
  }
});

// Set test timeout
jest.setTimeout(10000);