// Test setup file
import * as fs from 'fs';
import * as path from 'path';

// Mock console.log and console.clear to reduce test output noise
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'clear').mockImplementation(() => {});
});

afterAll(() => {
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
});

// Set test timeout
jest.setTimeout(10000);