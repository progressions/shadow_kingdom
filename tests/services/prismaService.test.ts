import { PrismaService } from '../../src/services/prismaService';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    game: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    room: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    region: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    connection: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    $transaction: jest.fn()
  }))
}));

describe('PrismaService', () => {
  let prismaService: PrismaService;
  let mockPrismaClient: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaService = PrismaService.getInstance();
    mockPrismaClient = prismaService.client as jest.Mocked<PrismaClient>;
  });

  afterEach(async () => {
    // Reset singleton instance for clean tests
    (PrismaService as any).instance = null;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = PrismaService.getInstance();
      const instance2 = PrismaService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create only one PrismaClient instance', () => {
      PrismaService.getInstance();
      PrismaService.getInstance();
      
      expect(PrismaClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      await prismaService.connect();
      
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect from database successfully', async () => {
      await prismaService.disconnect();
      
      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors gracefully', async () => {
      const connectionError = new Error('Connection failed');
      mockPrismaClient.$connect.mockRejectedValueOnce(connectionError);

      await expect(prismaService.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('Model Access', () => {
    it('should provide access to game model', () => {
      expect(prismaService.game).toBeDefined();
      expect(prismaService.game).toBe(mockPrismaClient.game);
    });

    it('should provide access to room model', () => {
      expect(prismaService.room).toBeDefined();
      expect(prismaService.room).toBe(mockPrismaClient.room);
    });

    it('should provide access to region model', () => {
      expect(prismaService.region).toBeDefined();
      expect(prismaService.region).toBe(mockPrismaClient.region);
    });

    it('should provide access to connection model', () => {
      expect(prismaService.connection).toBeDefined();
      expect(prismaService.connection).toBe(mockPrismaClient.connection);
    });
  });

  describe('Transaction Support', () => {
    it('should provide transaction support', () => {
      expect(prismaService.$transaction).toBeDefined();
      expect(typeof prismaService.$transaction).toBe('function');
    });

    it('should execute transactions successfully', async () => {
      const mockTransaction = jest.fn().mockResolvedValue('transaction result');
      mockPrismaClient.$transaction.mockImplementation(mockTransaction);

      const operations: any[] = [];
      const result = await prismaService.$transaction(operations);

      expect(mockTransaction).toHaveBeenCalledWith(operations);
      expect(result).toBe('transaction result');
    });
  });

  describe('Error Handling', () => {
    it('should handle database operation errors', async () => {
      const dbError = new Error('Database operation failed');
      (mockPrismaClient.room.findFirst as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(prismaService.room.findFirst()).rejects.toThrow('Database operation failed');
    });
  });
});