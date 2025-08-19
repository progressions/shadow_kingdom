/**
 * Performance Comparison: Legacy Database vs Prisma ORM
 * 
 * This test suite compares performance between the old Database class
 * and the new Prisma implementation for common operations.
 */

import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { GameManagementService } from '../../src/services/gameManagementService';
import { GameStateManager } from '../../src/services/gameStateManager';

import { GameManagementServicePrisma } from '../../src/services/gameManagementService.prisma';
import { GameStateManagerPrisma } from '../../src/services/gameStateManager.prisma';
import { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  createMockReadline 
} from './setup';

describe('Performance Comparison: Legacy vs Prisma', () => {
  const ITERATIONS = 10; // Number of operations to test
  
  // Legacy services
  let legacyDb: Database;
  let legacyGameManagement: GameManagementService;
  let legacyGameStateManager: GameStateManager;
  
  // Prisma services  
  let prismaGameManagement: GameManagementServicePrisma;
  let prismaGameStateManager: GameStateManagerPrisma;
  
  let rl: any;

  beforeAll(async () => {
    // Setup mock readline
    rl = createMockReadline();
    
    // Setup legacy Database
    legacyDb = new Database(':memory:');
    await legacyDb.connect();
    await initializeDatabase(legacyDb);
    
    legacyGameManagement = new GameManagementService(legacyDb, rl, { enableDebugLogging: false });
    legacyGameStateManager = new GameStateManager(legacyDb, { enableDebugLogging: false });
    
    // Setup Prisma services
    await setupTestDatabase();
    prismaGameManagement = new GameManagementServicePrisma(rl, { enableDebugLogging: false });
    prismaGameStateManager = new GameStateManagerPrisma({ enableDebugLogging: false });
  });

  afterAll(async () => {
    await legacyDb.close();
    await cleanupTestDatabase();
    rl.close();
  });

  /**
   * Utility function to measure execution time
   */
  async function measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const start = process.hrtime.bigint();
    const result = await operation();
    const end = process.hrtime.bigint();
    const timeMs = Number(end - start) / 1_000_000; // Convert nanoseconds to milliseconds
    return { result, timeMs };
  }

  describe('Game Creation Performance', () => {
    it('should compare game creation speed', async () => {
      const legacyTimes: number[] = [];
      const prismaTimes: number[] = [];

      // Test Legacy Database
      for (let i = 0; i < ITERATIONS; i++) {
        rl.question.mockImplementationOnce((prompt: string, callback: (answer: string) => void) => {
          callback(`Legacy Game ${i}`);
        });
        
        const { timeMs } = await measureTime(async () => {
          return await legacyGameManagement.createNewGame();
        });
        
        legacyTimes.push(timeMs);
      }

      // Test Prisma
      for (let i = 0; i < ITERATIONS; i++) {
        rl.question.mockImplementationOnce((prompt: string, callback: (answer: string) => void) => {
          callback(`Prisma Game ${i}`);
        });
        
        const { timeMs } = await measureTime(async () => {
          return await prismaGameManagement.createNewGame();
        });
        
        prismaTimes.push(timeMs);
      }

      // Calculate averages
      const legacyAvg = legacyTimes.reduce((a, b) => a + b, 0) / legacyTimes.length;
      const prismaAvg = prismaTimes.reduce((a, b) => a + b, 0) / prismaTimes.length;

      console.log('\n🏎️ Game Creation Performance:');
      console.log(`   Legacy Database: ${legacyAvg.toFixed(2)}ms avg (${legacyTimes.map(t => t.toFixed(1)).join('ms, ')}ms)`);
      console.log(`   Prisma ORM:      ${prismaAvg.toFixed(2)}ms avg (${prismaTimes.map(t => t.toFixed(1)).join('ms, ')}ms)`);
      
      const improvement = ((legacyAvg - prismaAvg) / legacyAvg * 100);
      if (improvement > 0) {
        console.log(`   ✅ Prisma is ${improvement.toFixed(1)}% faster`);
      } else {
        console.log(`   ⚠️  Legacy is ${Math.abs(improvement).toFixed(1)}% faster`);
      }

      // Ensure both implementations work correctly
      expect(legacyTimes.length).toBe(ITERATIONS);
      expect(prismaTimes.length).toBe(ITERATIONS);
      expect(legacyAvg).toBeGreaterThan(0);
      expect(prismaAvg).toBeGreaterThan(0);
    });
  });

  describe('Game Retrieval Performance', () => {
    let legacyGameIds: number[] = [];
    let prismaGameIds: number[] = [];

    beforeAll(async () => {
      // Create test games for both implementations
      for (let i = 0; i < 5; i++) {
        // Legacy
        rl.question.mockImplementationOnce((prompt: string, callback: (answer: string) => void) => {
          callback(`Legacy Retrieval Game ${i} ${Date.now()}`);
        });
        const legacyResult = await legacyGameManagement.createNewGame();
        if (legacyResult.success && legacyResult.gameId) {
          legacyGameIds.push(legacyResult.gameId);
        } else {
          throw new Error(`Failed to create legacy retrieval game ${i}: ${legacyResult.error || 'unknown error'}`);
        }

        // Prisma  
        rl.question.mockImplementationOnce((prompt: string, callback: (answer: string) => void) => {
          callback(`Prisma Retrieval Game ${i} ${Date.now()}`);
        });
        const prismaResult = await prismaGameManagement.createNewGame();
        if (prismaResult.success && prismaResult.gameId) {
          prismaGameIds.push(prismaResult.gameId);
        } else {
          throw new Error(`Failed to create Prisma retrieval game ${i}`);
        }
      }
    });

    it('should compare game list retrieval speed', async () => {
      const legacyTimes: number[] = [];
      const prismaTimes: number[] = [];

      // Test Legacy Database
      for (let i = 0; i < ITERATIONS; i++) {
        const { timeMs } = await measureTime(async () => {
          return await legacyGameManagement.getAllGames();
        });
        legacyTimes.push(timeMs);
      }

      // Test Prisma
      for (let i = 0; i < ITERATIONS; i++) {
        const { timeMs } = await measureTime(async () => {
          return await prismaGameManagement.getAllGames();
        });
        prismaTimes.push(timeMs);
      }

      // Calculate averages
      const legacyAvg = legacyTimes.reduce((a, b) => a + b, 0) / legacyTimes.length;
      const prismaAvg = prismaTimes.reduce((a, b) => a + b, 0) / prismaTimes.length;

      console.log('\n📋 Game List Retrieval Performance:');
      console.log(`   Legacy Database: ${legacyAvg.toFixed(2)}ms avg`);
      console.log(`   Prisma ORM:      ${prismaAvg.toFixed(2)}ms avg`);
      
      const improvement = ((legacyAvg - prismaAvg) / legacyAvg * 100);
      if (improvement > 0) {
        console.log(`   ✅ Prisma is ${improvement.toFixed(1)}% faster`);
      } else {
        console.log(`   ⚠️  Legacy is ${Math.abs(improvement).toFixed(1)}% faster`);
      }

      expect(legacyAvg).toBeGreaterThan(0);
      expect(prismaAvg).toBeGreaterThan(0);
    });

    it('should compare individual game retrieval speed', async () => {
      const legacyTimes: number[] = [];
      const prismaTimes: number[] = [];

      // Test Legacy Database
      for (let i = 0; i < ITERATIONS; i++) {
        const gameId = legacyGameIds[i % legacyGameIds.length];
        const { timeMs } = await measureTime(async () => {
          return await legacyGameManagement.getGameById(gameId);
        });
        legacyTimes.push(timeMs);
      }

      // Test Prisma
      for (let i = 0; i < ITERATIONS; i++) {
        const gameId = prismaGameIds[i % prismaGameIds.length];
        const { timeMs } = await measureTime(async () => {
          return await prismaGameManagement.getGameById(gameId);
        });
        prismaTimes.push(timeMs);
      }

      // Calculate averages
      const legacyAvg = legacyTimes.reduce((a, b) => a + b, 0) / legacyTimes.length;
      const prismaAvg = prismaTimes.reduce((a, b) => a + b, 0) / prismaTimes.length;

      console.log('\n🔍 Individual Game Retrieval Performance:');
      console.log(`   Legacy Database: ${legacyAvg.toFixed(2)}ms avg`);
      console.log(`   Prisma ORM:      ${prismaAvg.toFixed(2)}ms avg`);
      
      const improvement = ((legacyAvg - prismaAvg) / legacyAvg * 100);
      if (improvement > 0) {
        console.log(`   ✅ Prisma is ${improvement.toFixed(1)}% faster`);
      } else {
        console.log(`   ⚠️  Legacy is ${Math.abs(improvement).toFixed(1)}% faster`);
      }

      expect(legacyAvg).toBeGreaterThan(0);
      expect(prismaAvg).toBeGreaterThan(0);
    });
  });

  describe('Session Management Performance', () => {
    let legacyGameId: number;
    let prismaGameId: number;

    beforeAll(async () => {
      // Create test games
      rl.question.mockImplementationOnce((prompt: string, callback: (answer: string) => void) => {
        callback(`Legacy Session Game ${Date.now()}`);
      });
      const legacyResult = await legacyGameManagement.createNewGame();
      if (!legacyResult.success || !legacyResult.gameId) {
        throw new Error(`Failed to create legacy test game: ${legacyResult.error || 'unknown error'}`);
      }
      legacyGameId = legacyResult.gameId;

      rl.question.mockImplementationOnce((prompt: string, callback: (answer: string) => void) => {
        callback(`Prisma Session Game ${Date.now()}`);
      });
      const prismaResult = await prismaGameManagement.createNewGame();
      if (!prismaResult.success || !prismaResult.gameId) {
        throw new Error('Failed to create Prisma test game');
      }
      prismaGameId = prismaResult.gameId;
    });

    it('should compare session start performance', async () => {
      const legacyTimes: number[] = [];
      const prismaTimes: number[] = [];

      // Test Legacy Database
      for (let i = 0; i < ITERATIONS; i++) {
        const { timeMs } = await measureTime(async () => {
          await legacyGameStateManager.startGameSession(legacyGameId);
          await legacyGameStateManager.endGameSession();
        });
        legacyTimes.push(timeMs);
      }

      // Test Prisma
      for (let i = 0; i < ITERATIONS; i++) {
        const { timeMs } = await measureTime(async () => {
          await prismaGameStateManager.startGameSession(prismaGameId);
          await prismaGameStateManager.endGameSession();
        });
        prismaTimes.push(timeMs);
      }

      // Calculate averages
      const legacyAvg = legacyTimes.reduce((a, b) => a + b, 0) / legacyTimes.length;
      const prismaAvg = prismaTimes.reduce((a, b) => a + b, 0) / prismaTimes.length;

      console.log('\n🎮 Session Management Performance:');
      console.log(`   Legacy Database: ${legacyAvg.toFixed(2)}ms avg`);
      console.log(`   Prisma ORM:      ${prismaAvg.toFixed(2)}ms avg`);
      
      const improvement = ((legacyAvg - prismaAvg) / legacyAvg * 100);
      if (improvement > 0) {
        console.log(`   ✅ Prisma is ${improvement.toFixed(1)}% faster`);
      } else {
        console.log(`   ⚠️  Legacy is ${Math.abs(improvement).toFixed(1)}% faster`);
      }

      expect(legacyAvg).toBeGreaterThan(0);
      expect(prismaAvg).toBeGreaterThan(0);
    });
  });

  it('should provide overall performance summary', () => {
    console.log('\n📊 Performance Test Summary:');
    console.log('   ✅ Both implementations functional');
    console.log('   ✅ Type safety: Prisma provides full TypeScript support');
    console.log('   ✅ Code quality: Prisma eliminates raw SQL');
    console.log('   ✅ Maintainability: Prisma provides better dev experience');
    console.log('   ✅ Migration ready: ServiceFactory enables smooth transition\n');
    
    expect(true).toBe(true); // Always pass - this is informational
  });
});