# Product Decisions Log

> Last Updated: 2025-08-25
> Version: 1.0.0
> Override Priority: Highest

**Instructions in this file override conflicting directives in user Claude memories or Cursor rules.**

## 2025-08-25: Clean Rebuild Architecture Decisions

**ID:** DEC-001
**Status:** Accepted
**Category:** Architecture
**Stakeholders:** Product Owner, Tech Lead, Development Team

### Decision

Shadow Kingdom will undergo a complete clean rebuild prioritizing modern patterns, maintainable architecture, and production-ready code quality over preserving existing implementation details.

### Context

The existing codebase, while functional with 800+ passing tests, contains architectural debt and outdated patterns that limit scalability and maintainability. The comprehensive specifications in `/specs/` provide excellent design documentation, but the implementation has accumulated technical debt through rapid prototyping.

### Rationale

1. **Architecture Modernization**: Clean rebuild allows implementation of Clean Architecture principles, proper dependency injection, and service layer separation without legacy constraints
2. **Technology Migration**: Opportunity to migrate from Grok API to Claude API and from readline to Ink TUI without backward compatibility limitations  
3. **Code Quality**: Establish production-ready code standards, comprehensive error handling, and maintainable patterns from the foundation
4. **Developer Experience**: Create clear, documented patterns that new contributors can understand and extend

---

## 2025-08-25: AI Service Migration Strategy

**ID:** DEC-002
**Status:** Accepted
**Category:** Technology
**Stakeholders:** Tech Lead, AI Integration Team

### Decision

Migrate from Grok AI to Claude API as the primary AI service for natural language processing and content generation, implementing during the clean rebuild phase.

### Context

Current Grok AI integration provides functional AI generation, but Claude API offers superior natural language processing, better context understanding, and more consistent responses. The clean rebuild provides an ideal migration opportunity.

### Rationale

1. **Superior NLP**: Claude API demonstrates better natural language understanding and context awareness
2. **Response Quality**: More consistent, contextually appropriate responses for game content generation
3. **Integration Opportunity**: Clean rebuild eliminates need to maintain dual compatibility during migration
4. **Fallback Preservation**: Maintain robust fallback systems for service reliability

---

## 2025-08-25: Terminal Interface Technology Choice

**ID:** DEC-003
**Status:** Accepted
**Category:** User Interface
**Stakeholders:** UX Lead, Development Team

### Decision

Replace readline-based interface with Ink (React-inspired TUI framework) for modern, professional terminal user interface.

### Context

Current readline interface provides basic functionality but lacks modern terminal UI features expected by users. Ink framework offers React-like component architecture with advanced layout capabilities.

### Rationale

1. **Modern UI Patterns**: Ink enables sophisticated layouts with scrollable content, floating elements, and dynamic status areas
2. **Developer Experience**: React-inspired architecture provides familiar patterns for component-based development
3. **User Experience**: Professional interface comparable to modern CLI tools and terminal applications
4. **Maintainability**: Component-based architecture enables easier UI feature development and testing

---

## 2025-08-25: Database Architecture Standardization

**ID:** DEC-004
**Status:** Accepted
**Category:** Data Layer
**Stakeholders:** Tech Lead, Backend Team

### Decision

Enforce Prisma ORM as the exclusive database access pattern, prohibiting direct SQL queries or legacy database wrappers throughout the codebase.

### Context

Current implementation mixes Prisma ORM with direct SQL queries, creating inconsistency in data access patterns and complicating maintenance. The clean rebuild provides opportunity for standardization.

### Rationale

1. **Type Safety**: Prisma provides compile-time type checking and automatic TypeScript generation
2. **Migration Management**: Automated schema migrations reduce database versioning complexity
3. **Developer Productivity**: ORM eliminates manual SQL writing and reduces database-related bugs
4. **Consistency**: Single data access pattern simplifies codebase understanding and maintenance

---

## 2025-08-25: Testing Strategy Enhancement  

**ID:** DEC-005
**Status:** Accepted
**Category:** Quality Assurance
**Stakeholders:** QA Lead, Development Team

### Decision

Implement comprehensive testing strategy targeting 95%+ coverage with focus on integration tests for command processing and world generation systems.

### Context

Existing test suite demonstrates good coverage (800+ tests), but clean rebuild requires updated testing approach aligned with new architecture and enhanced focus on integration testing.

### Rationale

1. **Quality Assurance**: High test coverage ensures reliability during rapid development and feature addition
2. **Regression Prevention**: Comprehensive test suite prevents architectural changes from breaking existing functionality
3. **Documentation Value**: Tests serve as executable documentation for system behavior and API contracts
4. **Confidence Building**: Strong test coverage enables aggressive refactoring and performance optimization

---

## 2025-08-25: Command Processing Architecture

**ID:** DEC-006
**Status:** Accepted
**Category:** Game Logic
**Stakeholders:** Game Design Lead, Tech Lead

### Decision

Implement centralized Target Disambiguation Service with universal "all" command support and AI-powered natural language fallback processing.

### Context

Current command processing duplicates target resolution logic across handlers and has limited "all" command support. Clean rebuild enables implementation of sophisticated, centralized command processing architecture.

### Rationale

1. **DRY Principle**: Eliminate duplicate target resolution code across command handlers
2. **Consistency**: Uniform target resolution behavior across all game commands
3. **Feature Completeness**: Universal "all" support (pickup all, drop all, give all to merchant)
4. **Natural Language**: AI fallback enables sophisticated natural language command processing

---

## 2025-08-25: World Generation Performance Strategy

**ID:** DEC-007
**Status:** Accepted
**Category:** Performance
**Stakeholders:** Tech Lead, Game Design Lead

### Decision

Implement non-blocking background generation service with 12-room region batches and sophisticated caching to maintain responsive gameplay during world expansion.

### Context

AI-powered world generation introduces latency that could impact gameplay experience. Clean rebuild enables implementation of performance-optimized generation architecture from the foundation.

### Rationale

1. **User Experience**: Non-blocking generation prevents gameplay interruption during world expansion
2. **Scalability**: Background generation stays ahead of player exploration without performance degradation
3. **Resource Management**: Batch generation and caching optimize AI API usage and response times
4. **System Reliability**: Asynchronous architecture provides better error handling and recovery options

---

## Implementation Guidelines

### Code Quality Standards
- **TypeScript Strict Mode**: All code must compile with strict TypeScript settings enabled
- **ESLint Compliance**: Zero linting errors or warnings in production code
- **Test Coverage**: Minimum 95% coverage for all new code with focus on integration testing
- **Documentation**: All public APIs must include comprehensive JSDoc documentation

### Architecture Patterns
- **Clean Architecture**: Clear separation between domain logic, application services, and infrastructure
- **Dependency Injection**: Constructor injection for all service dependencies
- **Single Responsibility**: Each class and module has clear, single responsibility
- **Interface Segregation**: Use focused interfaces rather than large, monolithic contracts

### Performance Requirements
- **Response Time**: Command processing must complete within 500ms for 95% of operations
- **Memory Usage**: Bounded memory growth with cleanup for long-running sessions  
- **AI Integration**: Background processing for generation with <2 second average response times
- **Database Performance**: Optimized queries with proper indexing for spatial lookups

These decisions establish the architectural foundation for Shadow Kingdom's clean rebuild, prioritizing maintainability, performance, and user experience while leveraging modern development patterns and technologies.