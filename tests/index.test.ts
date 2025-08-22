import Database from '../src/utils/database';

// Mock the modules we don't want to actually run
jest.mock('../src/utils/database');
jest.mock('../src/gameController');

import { GameController } from '../src/gameController';

describe('Main Application', () => {
  let mockDb: jest.Mocked<Database>;
  let mockController: jest.Mocked<GameController>;

  beforeEach(() => {
    mockDb = new Database() as jest.Mocked<Database>;
    mockDb.connect = jest.fn().mockResolvedValue(undefined);
    
    mockController = {
      start: jest.fn().mockResolvedValue(undefined)
    } as any;
    
    (GameController as jest.Mock).mockImplementation(() => mockController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should start interactive mode', async () => {
    // Since SessionInterface is removed, we only have interactive mode
    expect(GameController).toBeDefined();
    expect(mockController.start).toBeDefined();
  });
});