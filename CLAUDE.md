# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Shadow Kingdom TypeScript CLI project.

## Project Overview

Shadow Kingdom is a dynamic, AI-powered adventure game built as an interactive TypeScript CLI. The game allows players to use natural language to navigate through procedurally generated rooms, meet unique characters, and interact with items - all created dynamically by AI. 

**Core Game Concept:**
- Players explore a fantasy kingdom using conversational commands
- Rooms, characters, items, and scenarios are generated on-the-fly by AI
- Natural language processing interprets player actions and intentions
- Rich narrative storytelling adapts to player choices and actions
- Persistent game state tracks player progress, inventory, and world changes

**Key Features (Planned):**
- **Natural Language Interface**: Players type commands like "go north", "talk to the merchant", or "examine the glowing sword"
- **AI-Generated Content**: Rooms, NPCs, items, and storylines created dynamically
- **Persistent World**: Game state saves progress, inventory, character relationships
- **Adaptive Storytelling**: AI responds to player actions with contextual narrative
- **Character Interaction**: Engage in conversations with AI-generated NPCs
- **Inventory System**: Collect, use, and manage items throughout the adventure

## Development Commands

```bash
# Install dependencies
npm install

# Run development server with ts-node
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run compiled version
npm start

# Run as executable (after build)
./dist/index.js
```

## Architecture

- **Language**: TypeScript
- **Runtime**: Node.js
- **CLI Framework**: Built-in readline interface
- **AI Integration**: TBD - Consider OpenAI API, Anthropic Claude API, or local models
- **Game Engine**: Custom text-based adventure engine
- **Data Storage**: JSON files for game state, player data, and world persistence
- **Build Tool**: TypeScript Compiler (tsc)
- **Development**: ts-node for hot reloading

## Project Structure

- `src/` - TypeScript source code
- `dist/` - Compiled JavaScript output  
- `issues/` - Issue tracking (markdown files)
- Standard Node.js project files (package.json, tsconfig.json, etc.)

## Game Architecture

The main CLI class (`src/index.ts`) currently includes basic CLI functionality that will evolve into the game interface:

**Current CLI Features:**
- **Command System**: Extensible command registration via `addCommand()`
- **Interactive Interface**: Readline-based prompt with `>` indicator
- **Built-in Commands**: 
  - `help` - Show available commands
  - `echo <text>` - Echo back provided text
  - `clear` - Clear the screen
  - `exit` - Exit the CLI
- **Error Handling**: Unknown command detection and user feedback

**Planned Game Architecture:**
- **Game Engine**: Core game loop and state management
- **Natural Language Parser**: Interpret player commands like "go north", "talk to wizard"
- **AI Integration**: Generate rooms, NPCs, items, and narrative responses
- **World Management**: Track room connections, item locations, character states
- **Player System**: Character stats, inventory, quest progress
- **Save/Load System**: Persistent game state across sessions
- **Event System**: Handle game events, triggers, and story progression

## Development Guidelines

### Adding New Commands

To add a new command, use the `addCommand()` method in `setupCommands()`:

```typescript
this.addCommand({
  name: 'commandname',
  description: 'Brief description of what the command does',
  handler: (args) => {
    // Implementation here
    console.log('Command executed with args:', args);
  }
});
```

### Issue Tracking

- Use the `issues/` directory for tracking bugs, features, and enhancements
- Follow the naming convention: `YYYY-MM-DD-issue-name.md`
- Use the `issues/TEMPLATE.md` as a starting point for new issues
- Include status, priority, and category in each issue

### Code Style

- Use TypeScript strict mode
- Follow existing patterns for command implementation
- Use proper error handling in command handlers
- Keep commands focused and single-purpose

## Testing

Currently no formal test suite exists. When adding tests:
- Consider using Jest or similar testing framework
- Test command parsing and execution
- Test error scenarios and edge cases
- Add test scripts to package.json

## Deployment

The CLI can be:
1. **Installed locally**: `npm install -g .` (after build)
2. **Run directly**: `npm run dev` or `npm start`
3. **Distributed**: Package and publish to npm registry

## Common Tasks

**Current Development:**
- **Add new command**: Modify `setupCommands()` in `src/index.ts`
- **Change prompt**: Modify readline configuration in constructor
- **Add persistent data**: Consider using files in user home directory
- **Extend functionality**: Add new methods to CLI class

**Game Development (Planned):**
- **Add game commands**: Implement natural language parsing for adventure commands
- **Create AI integration**: Set up API connections for content generation
- **Build game engine**: Implement core game mechanics and state management
- **Design world system**: Create room generation and navigation systems
- **Implement NPCs**: Add character interaction and dialogue systems
- **Add inventory**: Create item management and usage systems
- **Create save system**: Implement game state persistence

## Known Issues

Check the `issues/` directory for current open issues and feature requests.