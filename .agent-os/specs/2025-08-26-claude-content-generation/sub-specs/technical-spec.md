# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-26-claude-content-generation/spec.md

## Technical Requirements

### Claude API Integration
- **Authentication**: Secure API key management using environment variables (CLAUDE_API_KEY)
- **Request Handling**: Async request processing with proper error handling and timeout management
- **Rate Limiting**: Configurable rate limiting (CLAUDE_RATE_LIMIT) with exponential backoff
- **Response Processing**: JSON parsing with schema validation and sanitization
- **Model Selection**: Support for different Claude models (claude-3-opus, claude-3-sonnet) based on use case

### Prompt Engineering System
- **Phase 1 Region Theme Prompt**:
  - Input: Previous region theme, direction of travel, world seed
  - Output: JSON with theme, name, atmosphere, guardian concept, key concept
  - Token budget: ~500 input, ~200 output
  - Example template: "Generate a fantasy region theme connecting from {previous_theme} heading {direction}..."
- **Phase 2 Room Generation Prompt**:
  - Input: Region theme, guardian/key placement requirements, connection constraints
  - Output: JSON array of 12 room descriptions with names and details
  - Token budget: ~1000 input, ~2000 output
  - Template includes room numbering and connection requirements
- **Consistency Enforcement**:
  - Explicit theme reminders in each prompt
  - Previous region context for smooth transitions
  - Connection point specifications (entrance and locked exit)
- **Response Validation**:
  - JSON schema validation for structured responses
  - Fallback to parsing free text if JSON fails
  - Automatic retry with refined prompt on parse failure

### Content Generation Architecture
- **Service Layer**: ClaudeRegionService extending existing service architecture
- **Two-Phase Generation Pipeline**:
  - **Phase 1 - Region Creation**: 
    - Single Claude request for regional theme and metadata
    - Determines theme name, description, atmosphere
    - Identifies locked connection nature and placement
    - Specifies guardian type and key concept
    - Returns in < 2 seconds
  - **Phase 2 - Room Population**:
    - Asynchronous Claude request for 12 room descriptions
    - Batch generation maintaining thematic consistency
    - Includes room names, descriptions, discoverable details
    - Designates guardian room and key room
    - Complete within 10-15 seconds
- **Connection Management**:
  - Exactly one entrance from previous region (unlocked)
  - Exactly one exit to next region (locked, requires key)
  - Connection descriptions that maintain narrative flow
- **Asynchronous Trigger**:
  - Fires immediately when player enters a new region
  - Non-blocking background process
  - Queue management for multiple pending generations
- **Cache Strategy**: 
  - In-memory cache for current and adjacent regions
  - SQLite persistence for all generated regions
  - Lazy loading of room details as needed

### Context Management System
- **Region Context Builder**: Specialized context for region generation
- **Context Components**:
  - Adjacent regions (themes, connection types, narrative links)
  - Player progression (regions explored, keys collected, guardians defeated)
  - World seed (ensures consistency in regeneration scenarios)
  - Regional constraints (12-room structure, single locked exit, guardian/key placement)
  - Theme coherence rules (compatible/incompatible theme combinations)
  - Difficulty progression (guardian strength scaling, puzzle complexity)
- **Generation Context**:
  - Theme determination based on adjacent regions and unexplored directions
  - Guardian design influenced by theme and player power level
  - Key complexity and puzzle hints based on player experience
  - Room variety while maintaining thematic coherence
- **Context Persistence**: Store complete region generation context for consistency

### Performance Optimization
- **Two-Phase Generation Timing**:
  - Phase 1 (Region Theme): < 2 seconds, triggered on region entry
  - Phase 2 (12 Rooms): < 15 seconds, starts immediately after Phase 1
  - Total generation time: < 20 seconds from trigger
- **Request Optimization**: 
  - Phase 1: Single focused request for theme and structure
  - Phase 2: Single comprehensive request for all 12 rooms
  - Shared context between phases for consistency
  - Token-optimized prompts (< 2000 tokens per request)
- **Asynchronous Processing**:
  - Event-driven trigger when player enters new region
  - Non-blocking worker thread or process
  - Progress tracking with ability to query generation status
  - Graceful handling of player moving quickly through regions
- **Fallback Strategy**:
  1. Check database for existing region (< 10ms)
  2. Generate via Claude API (Phase 1 + Phase 2)
  3. Procedural generation fallback if API fails (< 500ms)
  4. Emergency static content as final fallback

### Error Handling & Resilience
- **Retry Logic**: Exponential backoff with jitter for transient failures
- **Circuit Breaker**: Automatic fallback after consecutive failures
- **Graceful Degradation**: Progressive feature reduction under load
- **Monitoring**: Metrics for response times, cache hits, API failures
- **Logging**: Structured logging with correlation IDs for debugging

### Testing Requirements
- **Region Generation Tests**: 
  - Verify 12-room structure with proper connections
  - Validate single locked exit and guardian/key placement
  - Ensure thematic consistency across all rooms
- **Asynchronous Tests**: 
  - Test generation triggers at correct proximity
  - Verify non-blocking operation during generation
  - Validate queue management and pre-generation
- **Integration Tests**: 
  - Full region generation with real Claude API
  - Region-to-region transition and connection logic
  - Guardian combat and key mechanics
- **Performance Tests**: 
  - Region generation under 30 seconds
  - Multiple simultaneous region generations
  - Memory management with 50+ generated regions
- **Fallback Tests**: 
  - Procedural generation when Claude unavailable
  - Partial generation recovery
  - Seed-based regeneration consistency

## External Dependencies

- **@anthropic-ai/sdk** - Official Anthropic SDK for Claude API integration
  - **Justification:** Official SDK provides type safety, automatic retries, and proper error handling for Claude API communication
  - **Version:** ^0.24.0 or latest stable
  
- **handlebars** - Template engine for prompt construction
  - **Justification:** Powerful templating with helpers and partials for complex prompt generation while maintaining readability
  - **Version:** ^4.7.8
  
- **node-cache** - In-memory caching solution
  - **Justification:** Lightweight, performant caching with TTL support for response caching without external dependencies
  - **Version:** ^5.1.2