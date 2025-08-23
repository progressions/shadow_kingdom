import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { CharacterService } from '../../src/services/characterService';
import { CharacterSentiment, CharacterType } from '../../src/types/character';

describe('AI Character Behavioral Prompts (Phase 15)', () => {
  let db: Database;
  let characterService: CharacterService;
  let gameId: number;
  let roomId: number;
  let hostileCharacterId: number;
  let aggressiveCharacterId: number;
  let indifferentCharacterId: number;
  let friendlyCharacterId: number;
  let alliedCharacterId: number;

  beforeEach(async () => {
    // Set test environment
    process.env.AI_MOCK_MODE = 'true';
    process.env.AI_DEBUG_LOGGING = 'false';
    
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    characterService = new CharacterService(db);

    // Create test game
    const gameResult = await db.run(`
      INSERT INTO games (name, created_at, last_played_at) 
      VALUES ('Behavioral Test Game', '2025-08-23 10:00:00', '2025-08-23 10:00:00')
    `);
    gameId = gameResult.lastID as number;

    // Create test room
    const roomResult = await db.run(`
      INSERT INTO rooms (game_id, name, description) 
      VALUES (?, 'Test Behavioral Room', 'A room for testing character behavioral responses')
    `, [gameId]);
    roomId = roomResult.lastID as number;

    // Create characters with different sentiments for testing
    hostileCharacterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Hostile Bandit',
      type: CharacterType.ENEMY,
      current_room_id: roomId,
      sentiment: CharacterSentiment.HOSTILE,
      description: 'A dangerous bandit with murderous intent'
    });

    aggressiveCharacterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Aggressive Guard',
      type: CharacterType.ENEMY,
      current_room_id: roomId,
      sentiment: CharacterSentiment.AGGRESSIVE,
      description: 'A stern guard who distrusts strangers'
    });

    indifferentCharacterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Neutral Clerk',
      type: CharacterType.NPC,
      current_room_id: roomId,
      sentiment: CharacterSentiment.INDIFFERENT,
      description: 'A businesslike clerk focused on their work'
    });

    friendlyCharacterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Kind Merchant',
      type: CharacterType.NPC,
      current_room_id: roomId,
      sentiment: CharacterSentiment.FRIENDLY,
      description: 'A welcoming merchant eager to help'
    });

    alliedCharacterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Trusted Ally',
      type: CharacterType.NPC,
      current_room_id: roomId,
      sentiment: CharacterSentiment.ALLIED,
      description: 'A loyal companion who would die for you'
    });
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('Sentiment-Based Dialogue Generation', () => {
    it('should generate hostile dialogue with threatening tone', async () => {
      const result = await characterService.generateBehavioralDialogue(hostileCharacterId, {
        playerCommand: 'talk to bandit',
        context: 'Player approaches the bandit cautiously'
      });

      expect(result).not.toBeNull();
      expect(result.sentimentContext).toBe('hostile');
      expect(result.tone).toBe('threatening');
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
      expect(result.response.length).toBeGreaterThan(0);
      
      // Hostile characters should suggest combat-related actions
      expect(result.suggestedPlayerActions).toContain('retreat');
      expect(result.suggestedPlayerActions).toContain('attack');
    });

    it('should generate aggressive dialogue with suspicious tone', async () => {
      const result = await characterService.generateBehavioralDialogue(aggressiveCharacterId, {
        playerCommand: 'talk to guard',
        context: 'Player tries to start conversation'
      });

      expect(result).not.toBeNull();
      expect(result.sentimentContext).toBe('aggressive');
      expect(result.tone).toBe('suspicious');
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
      expect(result.response.length).toBeGreaterThan(0);
    });

    it('should generate indifferent dialogue with neutral tone', async () => {
      mockGrokClient.generateSentimentBasedDialogue = jest.fn().mockResolvedValue({
        response: "Yes? What do you need? I'm quite busy with these ledgers.",
        tone: 'neutral',
        action: 'continues_working',
        sentimentContext: 'indifferent'
      });

      const result = await characterService.generateBehavioralDialogue(indifferentCharacterId, {
        playerCommand: 'talk to clerk',
        context: 'Player interrupts clerk\'s work'
      });

      expect(result).not.toBeNull();
      expect(result.response).toContain('busy');
      expect(result.tone).toBe('neutral');
      expect(result.action).toBe('continues_working');
      expect(result.sentimentContext).toBe('indifferent');
    });

    it('should generate friendly dialogue with welcoming tone', async () => {
      mockGrokClient.generateSentimentBasedDialogue = jest.fn().mockResolvedValue({
        response: "Welcome, friend! How wonderful to see a new face. How can I help you today?",
        tone: 'welcoming',
        action: 'smiles_warmly',
        sentimentContext: 'friendly'
      });

      const result = await characterService.generateBehavioralDialogue(friendlyCharacterId, {
        playerCommand: 'talk to merchant',
        context: 'Player approaches the friendly merchant'
      });

      expect(result).not.toBeNull();
      expect(result.response).toContain('Welcome');
      expect(result.tone).toBe('welcoming');
      expect(result.action).toBe('smiles_warmly');
      expect(result.sentimentContext).toBe('friendly');
    });

    it('should generate allied dialogue with devoted tone', async () => {
      mockGrokClient.generateSentimentBasedDialogue = jest.fn().mockResolvedValue({
        response: "My trusted friend! I would follow you to the ends of the earth. What is our next move?",
        tone: 'devoted',
        action: 'stands_ready',
        sentimentContext: 'allied'
      });

      const result = await characterService.generateBehavioralDialogue(alliedCharacterId, {
        playerCommand: 'talk to ally',
        context: 'Player seeks counsel from their trusted ally'
      });

      expect(result).not.toBeNull();
      expect(result.response).toContain('trusted friend');
      expect(result.tone).toBe('devoted');
      expect(result.action).toBe('stands_ready');
      expect(result.sentimentContext).toBe('allied');
    });
  });

  describe('Dynamic Response to Player Actions', () => {
    it('should adjust dialogue based on player actions and sentiment history', async () => {
      // First, improve the aggressive guard's sentiment through giving a gift
      await characterService.changeSentiment(aggressiveCharacterId, 1); // aggressive -> indifferent

      mockGrokClient.generateSentimentBasedDialogue = jest.fn().mockResolvedValue({
        response: "You again? That gift you gave me... it was unexpected. Perhaps you're not so bad after all.",
        tone: 'softening',
        action: 'reconsiders_position',
        sentimentContext: 'indifferent',
        sentimentChange: 'recently_improved'
      });

      const result = await characterService.generateBehavioralDialogue(aggressiveCharacterId, {
        playerCommand: 'talk to guard',
        context: 'Player returns to talk after giving gift',
        recentActions: ['gave_gift']
      });

      expect(result).not.toBeNull();
      expect(result.response).toContain('unexpected');
      expect(result.tone).toBe('softening');
      expect(result.sentimentChange).toBe('recently_improved');
    });

    it('should generate context-aware responses based on room and situation', async () => {
      mockGrokClient.generateSentimentBasedDialogue = jest.fn().mockResolvedValue({
        response: "In this sacred place, even I must speak softly. What brings you to this holy ground?",
        tone: 'reverent',
        action: 'speaks_quietly',
        sentimentContext: 'aggressive',
        locationModifier: 'sacred_space'
      });

      // Update room to be a temple
      await db.run(
        'UPDATE rooms SET name = ?, description = ? WHERE id = ?',
        ['Sacred Temple', 'A holy place of worship and contemplation', roomId]
      );

      const result = await characterService.generateBehavioralDialogue(aggressiveCharacterId, {
        playerCommand: 'talk to guard',
        context: 'Player talks to guard in sacred temple',
        roomContext: {
          name: 'Sacred Temple',
          description: 'A holy place of worship and contemplation',
          type: 'sacred'
        }
      });

      expect(result).not.toBeNull();
      expect(result.response).toContain('sacred');
      expect(result.locationModifier).toBe('sacred_space');
    });
  });

  describe('Behavioral Action Suggestions', () => {
    it('should suggest appropriate actions based on character sentiment', async () => {
      mockGrokClient.generateSentimentBasedDialogue = jest.fn().mockResolvedValue({
        response: "You look lost, friend. Let me share what I know about these lands.",
        tone: 'helpful',
        action: 'offers_guidance',
        sentimentContext: 'friendly',
        suggestedPlayerActions: ['ask_for_directions', 'accept_help', 'trade_items']
      });

      const result = await characterService.generateBehavioralDialogue(friendlyCharacterId, {
        playerCommand: 'talk to merchant',
        context: 'Player seems lost and confused'
      });

      expect(result).not.toBeNull();
      expect(result.suggestedPlayerActions).toContain('ask_for_directions');
      expect(result.suggestedPlayerActions).toContain('accept_help');
      expect(result.suggestedPlayerActions).toContain('trade_items');
    });

    it('should limit action suggestions for hostile characters', async () => {
      mockGrokClient.generateSentimentBasedDialogue = jest.fn().mockResolvedValue({
        response: "This is your last warning. Leave now or face the consequences!",
        tone: 'threatening',
        action: 'draws_weapon',
        sentimentContext: 'hostile',
        suggestedPlayerActions: ['retreat', 'defend', 'attack']
      });

      const result = await characterService.generateBehavioralDialogue(hostileCharacterId, {
        playerCommand: 'talk to bandit',
        context: 'Player persists despite threats'
      });

      expect(result).not.toBeNull();
      expect(result.suggestedPlayerActions).toEqual(['retreat', 'defend', 'attack']);
      expect(result.suggestedPlayerActions).not.toContain('trade_items');
      expect(result.suggestedPlayerActions).not.toContain('ask_for_help');
    });
  });

  describe('AI Prompt Construction for Behavioral Responses', () => {
    it('should build comprehensive behavioral prompts with sentiment context', async () => {
      mockGrokClient.generateSentimentBasedDialogue = jest.fn().mockResolvedValue({
        response: "Test response",
        tone: 'neutral',
        sentimentContext: 'indifferent'
      });

      await characterService.generateBehavioralDialogue(indifferentCharacterId, {
        playerCommand: 'examine clerk',
        context: 'Player studies the clerk carefully'
      });

      const calledPrompt = mockGrokClient.generateSentimentBasedDialogue.mock.calls[0][0];
      
      // Verify prompt includes sentiment-specific behavioral guidelines
      expect(calledPrompt).toContain('indifferent');
      expect(calledPrompt).toContain('Neutral Clerk');
      expect(calledPrompt).toContain('businesslike');
      expect(calledPrompt).toContain('tone');
      expect(calledPrompt).toContain('action');
      expect(calledPrompt).toContain('examine clerk');
    });

    it('should include conversation history and context in prompts', async () => {
      mockGrokClient.generateSentimentBasedDialogue = jest.fn().mockResolvedValue({
        response: "We've spoken before. What more do you want?",
        tone: 'impatient',
        sentimentContext: 'aggressive'
      });

      await characterService.generateBehavioralDialogue(aggressiveCharacterId, {
        playerCommand: 'talk to guard',
        context: 'Third conversation attempt',
        conversationHistory: [
          { speaker: 'player', message: 'Hello' },
          { speaker: 'character', message: 'What do you want?' },
          { speaker: 'player', message: 'Just being friendly' },
          { speaker: 'character', message: 'I have work to do' }
        ]
      });

      const calledPrompt = mockGrokClient.generateSentimentBasedDialogue.mock.calls[0][0];
      
      expect(calledPrompt).toContain('conversation history');
      expect(calledPrompt).toContain('Hello');
      expect(calledPrompt).toContain('What do you want?');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle AI generation failure with sentiment-appropriate fallback', async () => {
      // Mock AI failure
      mockGrokClient.generateSentimentBasedDialogue = jest.fn().mockRejectedValue(new Error('AI generation failed'));

      const result = await characterService.generateBehavioralDialogue(hostileCharacterId, {
        playerCommand: 'talk to bandit',
        context: 'Player tries to talk'
      });

      // Should return hostile fallback
      expect(result).not.toBeNull();
      expect(result.response).toMatch(/hostile|threatening|aggressive|weapon/i);
      expect(result.tone).toBe('threatening');
      expect(result.sentimentContext).toBe('hostile');
    });

    it('should provide appropriate fallbacks for each sentiment level', async () => {
      mockGrokClient.generateSentimentBasedDialogue = jest.fn().mockRejectedValue(new Error('AI failed'));

      // Test friendly fallback
      const friendlyResult = await characterService.generateBehavioralDialogue(friendlyCharacterId, {
        playerCommand: 'talk to merchant',
        context: 'AI failure test'
      });

      expect(friendlyResult.response).toMatch(/friendly|welcome|help/i);
      expect(friendlyResult.tone).toBe('welcoming');

      // Test indifferent fallback
      const indifferentResult = await characterService.generateBehavioralDialogue(indifferentCharacterId, {
        playerCommand: 'talk to clerk',
        context: 'AI failure test'
      });

      expect(indifferentResult.response).toMatch(/busy|work|quick/i);
      expect(indifferentResult.tone).toBe('neutral');
    });

    it('should handle non-existent character gracefully', async () => {
      const nonExistentId = 9999;

      await expect(characterService.generateBehavioralDialogue(nonExistentId, {
        playerCommand: 'talk',
        context: 'test'
      })).rejects.toThrow('Character 9999 not found');
    });
  });

  describe('Performance Requirements', () => {
    it('should generate behavioral responses under 500ms for optimal UX', async () => {
      mockGrokClient.generateSentimentBasedDialogue = jest.fn().mockResolvedValue({
        response: "Quick response test",
        tone: 'neutral',
        sentimentContext: 'indifferent'
      });

      const startTime = performance.now();
      
      await characterService.generateBehavioralDialogue(indifferentCharacterId, {
        playerCommand: 'talk to clerk',
        context: 'Performance test'
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should be very fast in mock mode
    });
  });
});