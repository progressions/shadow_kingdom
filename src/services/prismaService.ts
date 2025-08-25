import { PrismaClient } from '@prisma/client';

export class PrismaService {
  private static instance: PrismaService | null = null;
  public client: PrismaClient;

  private constructor() {
    this.client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
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