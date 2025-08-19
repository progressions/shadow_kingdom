import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';
import Database from '../utils/database';

/**
 * DatabaseAdapter - Compatibility layer for migrating from custom Database to Prisma
 * 
 * This adapter provides the same interface as the current Database class
 * but uses Prisma underneath. This allows for incremental migration of services.
 * 
 * Usage:
 * 1. Replace Database imports with DatabaseAdapter
 * 2. Services continue to work with existing interface
 * 3. Gradually migrate services to use Prisma directly
 * 4. Remove adapter when all services are migrated
 */
export class DatabaseAdapter {
  private prisma: PrismaClient;
  private dbPath: string;

  constructor(dbPath: string = 'data/db/shadow_kingdom.db') {
    this.prisma = getPrismaClient();
    this.dbPath = dbPath;
  }

  /**
   * Connect to database (Prisma connects automatically)
   */
  async connect(): Promise<void> {
    // Prisma connects automatically, but we can test the connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      console.log('Connected to SQLite database via Prisma:', this.dbPath);
    } catch (error) {
      console.error('Error connecting to database via Prisma:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect();
    console.log('Database connection closed via Prisma.');
  }

  /**
   * Execute SQL command (INSERT, UPDATE, DELETE)
   * Maps to Prisma's $executeRaw for compatibility
   */
  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    try {
      // Use $executeRawUnsafe for dynamic SQL (needed for compatibility)
      const result = await this.prisma.$executeRawUnsafe(sql, ...params);
      
      // For INSERT operations, try to get the last inserted ID
      let lastID = 0;
      if (sql.trim().toUpperCase().startsWith('INSERT')) {
        try {
          const lastInsertRow = await this.prisma.$queryRawUnsafe('SELECT last_insert_rowid() as id');
          lastID = (lastInsertRow as any[])[0]?.id || 0;
        } catch {
          // If we can't get last ID, use 0 (some operations don't need it)
          lastID = 0;
        }
      }
      
      return {
        lastID,
        changes: result
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single row
   * Maps to Prisma's $queryRaw for compatibility
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    try {
      const result = await this.prisma.$queryRawUnsafe(sql, ...params) as T[];
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get multiple rows
   * Maps to Prisma's $queryRaw for compatibility
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await this.prisma.$queryRawUnsafe(sql, ...params) as T[];
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if connected (always true for Prisma)
   */
  isConnected(): boolean {
    return true; // Prisma handles connections automatically
  }

  /**
   * Get database path (for compatibility)
   */
  getDbPath(): string {
    return this.dbPath;
  }

  /**
   * Get the underlying Prisma client for services that want to migrate
   */
  getPrismaClient(): PrismaClient {
    return this.prisma;
  }
}

/**
 * Factory function that creates the appropriate database instance
 * based on configuration. This allows gradual migration.
 */
export function createDatabaseInstance(dbPath?: string): Database | DatabaseAdapter {
  // Check if we should use Prisma (via environment variable or configuration)
  const usePrisma = process.env.USE_PRISMA === 'true' || 
                   process.env.NODE_ENV === 'prisma-migration';
  
  if (usePrisma) {
    return new DatabaseAdapter(dbPath);
  } else {
    return new Database(dbPath);
  }
}