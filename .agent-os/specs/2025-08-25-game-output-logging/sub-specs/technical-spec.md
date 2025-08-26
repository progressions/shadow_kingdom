# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-25-game-output-logging/spec.md

> Created: 2025-08-25
> Version: 1.0.0

## Technical Requirements

### Core Logging Service
- Create a new LoggingService class in src/services/loggingService.ts
- Singleton pattern to ensure single log file handle across the application
- Async file operations using Node.js fs.promises API for non-blocking writes
- Automatic directory creation if log/ directory doesn't exist
- File handle management with proper cleanup on application exit

### Message Interception Architecture
- Implement a message interceptor in the GameApplication component
- Hook into the addMessage function that feeds the GamePane component
- Preserve original message flow while duplicating to logging service
- Support for all message types: room descriptions, commands, responses, errors, system messages

### Log Entry Format
- ISO 8601 timestamps for each entry (YYYY-MM-DD HH:mm:ss.SSS)
- Session UUID generated at startup using crypto.randomUUID()
- Message type classification (ROOM, COMMAND, RESPONSE, ERROR, SYSTEM)
- Structured format: `[timestamp] [session-id] [type] message content`
- Preserve original line breaks and formatting within message content

### Integration Points
- GameApplication.tsx: Add LoggingService initialization and message interception
- index.ts: Initialize logging service before game launch
- Add graceful shutdown handler to close log file properly
- Environment variable support: LOG_ENABLED (default: true), LOG_PATH (default: log/development.log)

### Performance Considerations
- Use write buffering with periodic flushes (every 100ms or 10 messages)
- Implement circular buffer if log file exceeds 50MB
- Async/non-blocking writes to prevent UI lag
- Error resilience: Continue game operation even if logging fails

### Error Handling
- Graceful fallback if log file cannot be created
- Silent failure with optional console warning for logging errors
- No interruption to game flow due to logging issues
- Automatic retry logic for transient file system errors

## External Dependencies

**winston** - Production-grade logging library
- Purpose: Robust logging with built-in rotation, formatting, and error handling
- Version: ^3.11.0
- Justification: Provides file rotation, multiple transports, and battle-tested reliability compared to custom implementation
- Alternative considered: Building custom logger, but winston provides essential features out-of-box