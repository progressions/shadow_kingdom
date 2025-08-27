import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load local .env file
dotenv.config();

export class PrismaService {
  private static instance: PrismaService | null = null;
  public client: PrismaClient;
  private initialized: boolean = false;

  private constructor() {
    // Use our specific database URL, falling back to DATABASE_URL if needed
    const dbUrl =
      process.env.SHADOW_KINGDOM_DB || process.env.DATABASE_URL || 'file:./prisma/dev.db';

    // Set DATABASE_URL for Prisma to use
    process.env.DATABASE_URL = dbUrl;

    this.client = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  // Initialize database if needed
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Skip database initialization in test environment
    if (process.env.NODE_ENV === 'test') {
      this.initialized = true;
      return;
    }

    try {
      // Check if database exists and has schema
      await this.checkAndInitializeDatabase();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async checkAndInitializeDatabase(): Promise<void> {
    // Use a fixed database location relative to project root
    const projectRoot = process.cwd();
    const dbPath = path.join(projectRoot, 'data', 'shadow_kingdom.db');
    const dbUrl = `file:${dbPath}`;

    // Log the path for debugging
    console.log('Using database at:', dbPath);

    const fullDbPath = dbPath;
    const dbDir = path.dirname(fullDbPath);

    // Ensure database directory exists
    if (!fs.existsSync(dbDir)) {
      console.log('Creating database directory:', dbDir);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Check if database file exists
    const dbExists = fs.existsSync(fullDbPath);
    let needsSeeding = false;

    if (!dbExists) {
      console.log('Database not found. Creating new database...');
      // Apply schema to create database
      try {
        console.log('Applying database schema...');
        execSync('npx prisma db push --skip-generate', {
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: dbUrl, SHADOW_KINGDOM_DB: dbUrl },
        });
        console.log('Database created successfully');
        needsSeeding = true;
      } catch (error) {
        console.error('Failed to create database:', error);
        throw error;
      }
    } else {
      // Database exists, check if it has schema and data
      try {
        const gameCount = await this.client.game.count();
        if (gameCount === 0) {
          console.log('No games found in database');
          needsSeeding = true;
        }
      } catch (error) {
        // If table doesn't exist, push schema
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('no such table')) {
          console.log('Database schema missing. Applying schema...');
          try {
            execSync('npx prisma db push --skip-generate', {
              stdio: 'inherit',
              env: { ...process.env, DATABASE_URL: dbUrl, SHADOW_KINGDOM_DB: dbUrl },
            });
            console.log('Schema applied successfully');
            needsSeeding = true;
          } catch (pushError) {
            console.error('Failed to push schema:', pushError);
            throw pushError;
          }
        } else {
          throw error;
        }
      }
    }

    // Seed if needed
    if (needsSeeding) {
      console.log('Seeding database with initial world...');
      await this.seedInitialData();
    }
  }

  private async seedInitialData(): Promise<void> {
    const yamlPath = path.join(process.cwd(), 'worlds', 'starting-region.yml');

    if (fs.existsSync(yamlPath)) {
      // Use the YamlWorldService to seed
      console.log('Seeding initial world data...');
      try {
        const { YamlWorldService } = await import('./yamlWorldService');
        const yamlService = new YamlWorldService();
        await yamlService.createWorldFromYaml(yamlPath);
        console.log('Initial world data seeded successfully');
      } catch (error) {
        console.error('Failed to seed world data:', error);
        // Don't throw - game can still create a new world dynamically
      }
    }
  }

  // Convenience getters for model access
  public get game() {
    return this.client.game;
  }

  public get room() {
    return this.client.room;
  }

  public get region() {
    return this.client.region;
  }

  public get connection() {
    return this.client.connection;
  }

  // Connection management
  public async connect(): Promise<void> {
    await this.client.$connect();
  }

  public async disconnect(): Promise<void> {
    await this.client.$disconnect();
    PrismaService.instance = null;
  }

  // Transaction support
  public get $transaction() {
    return this.client.$transaction.bind(this.client);
  }

  // Raw query support for complex operations
  public get $queryRaw() {
    return this.client.$queryRaw.bind(this.client);
  }

  public get $executeRaw() {
    return this.client.$executeRaw.bind(this.client);
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Graceful shutdown helper
  public async gracefulShutdown(): Promise<void> {
    try {
      await this.disconnect();
      console.log('Database connection closed gracefully');
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      throw error;
    }
  }
}

// Export a singleton instance for convenience
export const prismaService = PrismaService.getInstance();

// Handle process termination gracefully
const handleShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  try {
    await prismaService.gracefulShutdown();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Only add listeners if we're not in a test environment
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('beforeExit', () => handleShutdown('beforeExit'));
}
