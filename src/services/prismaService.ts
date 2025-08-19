import { PrismaClient } from '../generated/prisma';

/**
 * PrismaService - Singleton pattern for Prisma client management
 * 
 * Provides centralized database connection management with:
 * - Singleton pattern for single connection instance
 * - Environment-aware configuration (test vs production)
 * - Graceful shutdown handling
 * - Connection state tracking
 */
export class PrismaService {
  private static instance: PrismaService;
  private client: PrismaClient | null = null;
  private isConnected: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of PrismaService
   */
  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  /**
   * Get or create the Prisma client
   */
  public getClient(): PrismaClient {
    if (!this.client) {
      this.client = new PrismaClient({
        log: process.env.AI_DEBUG_LOGGING === 'true' ? 
          ['query', 'info', 'warn', 'error'] : 
          ['warn', 'error'],
        datasources: {
          db: {
            url: this.getDatabaseUrl()
          }
        }
      });
      
      // Mark as connected once client is created
      this.isConnected = true;
      
      // Setup graceful shutdown
      this.setupShutdownHandlers();
    }
    
    return this.client;
  }

  /**
   * Check if the service is connected
   */
  public getConnectionStatus(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Gracefully disconnect from the database
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect();
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static reset(): void {
    if (PrismaService.instance?.client) {
      // Disconnect without waiting in reset to avoid hanging tests
      PrismaService.instance.client.$disconnect().catch(() => {
        // Ignore disconnect errors during reset
      });
    }
    PrismaService.instance = new PrismaService();
  }

  /**
   * Get the appropriate database URL based on environment
   */
  private getDatabaseUrl(): string {
    // Check if we're in test environment
    if (process.env.NODE_ENV === 'test' || process.env.DATABASE_URL?.includes(':memory:')) {
      return 'file::memory:';
    }
    
    // Use environment variable or default
    return process.env.DATABASE_URL || 'file:./data/db/shadow_kingdom.db';
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdownHandler = async (signal: string) => {
      console.log(`\nReceived ${signal}, closing database connection...`);
      await this.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('beforeExit', async () => {
      await this.disconnect();
    });
  }
}

/**
 * Convenience function to get the Prisma client
 */
export function getPrismaClient(): PrismaClient {
  return PrismaService.getInstance().getClient();
}