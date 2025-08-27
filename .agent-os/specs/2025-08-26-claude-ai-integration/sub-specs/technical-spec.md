# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-26-claude-ai-integration/spec.md

> Created: 2025-08-26
> Version: 1.0.0

## Technical Requirements

- **ClaudeService Core** - Main service class implementing Anthropic Claude API client with authentication, request management, response parsing, and comprehensive error handling
- **AI Request Manager** - Request throttling, rate limiting, retry logic with exponential backoff, and queue management for optimal API usage within Anthropic's limits
- **Prompt Template Engine** - Structured prompt generation system with regional context, character personality integration, and dynamic content assembly based on game state
- **Response Processing Pipeline** - AI response validation, parsing, and formatting system that extracts structured content from natural language responses and validates against expected formats
- **Content Cache System** - Redis-like caching layer for AI responses to reduce API calls, improve performance, and provide offline capabilities during development
- **Mock AI Service** - Development and testing mock implementation that provides deterministic responses for reliable CI/CD pipeline and offline development
- **Fallback Content Generator** - Keyword-based content generation system that provides backup content when AI services are unavailable or rate-limited
- **Context Assembly Engine** - System that aggregates regional themes, adjacent room data, player history, NPC relationships, and world state for intelligent AI prompt construction

## Integration Points

- **GameEngine Service**: ClaudeService injected as dependency for AI-powered game initialization and world expansion triggers
- **RoomNavigationEngine**: Integration for real-time room generation during player movement with spatial consistency validation
- **CommandRouter**: AI-powered command interpretation and response generation for natural language processing enhancement
- **GameStateManager**: Context provision for AI generation including player history, current location, and relationship states
- **Character Database Model**: NPC personality profiles, dialogue history, and relationship tracking for consistent character interactions
- **Prisma Database Layer**: All AI-generated content persisted through existing database schema with proper relationships and caching
- **YAML World Service**: Hybrid approach using YAML templates enhanced with AI-generated details and contextual content
- **Logging Service**: Comprehensive AI request/response logging with sensitive data filtering and performance metrics

## Architecture Design

### Service Layer Architecture
```typescript
ClaudeService {
  - apiClient: AnthropicClient
  - requestManager: AIRequestManager
  - promptEngine: PromptTemplateEngine
  - responseParser: AIResponseParser
  - cacheManager: ContentCacheManager
  - mockService: MockAIService
  - fallbackGenerator: FallbackContentGenerator
}
```

### Prompt Template Structure
```yaml
# Room Generation Template
system: "You are a fantasy world builder creating coherent game environments"
context:
  region: "{{ region.theme }} - {{ region.description }}"
  adjacent_rooms: "{{ adjacentRooms.descriptions }}"
  player_history: "{{ player.visitedRegions }}"
constraints:
  tone: "immersive fantasy adventure"
  length: "2-3 sentences for descriptions"
  format: "structured JSON response"
```

### Response Caching Strategy
```typescript
interface CacheStrategy {
  roomDescriptions: TTL_24_HOURS;
  npcDialogue: TTL_1_HOUR;
  itemDescriptions: TTL_7_DAYS;
  environmentalDetails: TTL_12_HOURS;
}
```

### Error Handling Hierarchy
1. **API Timeout**: Retry with exponential backoff (3 attempts)
2. **Rate Limiting**: Queue requests with appropriate delays
3. **Authentication Error**: Log critical error and switch to mock mode
4. **Malformed Response**: Request regeneration once, then fallback
5. **Service Unavailable**: Switch to cached content or fallback generator

## Environment Configuration

### Required Variables
```bash
CLAUDE_API_KEY=sk-ant-... # Anthropic Claude API key
DATABASE_URL=file:./data/shadow_kingdom.db # Existing Prisma database
```

### Development Variables
```bash
AI_MOCK_MODE=true # Enable mock AI responses for development
AI_DEBUG_LOGGING=true # Detailed AI request/response logging
AI_CACHE_ENABLED=true # Enable response caching (default: true)
AI_REQUEST_TIMEOUT=10000 # Request timeout in milliseconds
AI_RETRY_ATTEMPTS=3 # Number of retry attempts for failed requests
AI_RATE_LIMIT_RPM=100 # Requests per minute rate limit
```

## Performance Requirements

- **Response Time**: Average AI generation under 2 seconds for real-time gameplay
- **Cache Hit Rate**: Target 70%+ cache hits for repeated content requests
- **API Efficiency**: Maximum 50 API calls per hour during normal gameplay
- **Background Generation**: Pre-generate 4+ rooms ahead of player movement
- **Fallback Speed**: Fallback content generation under 100ms when AI unavailable

## Data Flow Architecture

### Room Generation Flow
```
Player Movement → RoomNavigationEngine → ClaudeService → Context Assembly → 
Prompt Generation → API Request → Response Parsing → Database Storage → 
Cache Update → Room Display → Background Pre-generation
```

### NPC Dialogue Flow
```
Player Command → CommandRouter → ClaudeService → Character Context → 
Personality Prompt → API Request → Response Parsing → Relationship Update → 
Database Storage → Dialogue Display
```

### Content Generation Pipeline
```
Content Request → Cache Check → AI Generation (if miss) → Response Validation → 
Content Processing → Database Storage → Cache Update → Content Delivery
```

## Testing Strategy

- **Unit Tests**: Individual service methods with mocked dependencies and deterministic responses
- **Integration Tests**: AI service integration with game systems using mock Claude responses
- **Performance Tests**: API response time benchmarks and cache effectiveness measurements  
- **Error Scenario Tests**: Comprehensive testing of all failure modes and recovery mechanisms
- **Mock Service Tests**: Validation that mock responses match actual Claude API response formats