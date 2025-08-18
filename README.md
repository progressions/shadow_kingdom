# Shadow Kingdom

A dynamic, AI-powered text adventure game built with Node.js, TypeScript, and Grok AI.

## Overview

Shadow Kingdom is an interactive text-based adventure game that uses AI to generate rich, atmospheric rooms and connections on-demand. Players explore a mysterious fantasy kingdom where each room is uniquely crafted with thematic descriptions and atmospheric connections.

## Features

- **AI-Generated Content**: Rooms, descriptions, and connections dynamically created by Grok AI
- **Thematic Connections**: Navigate using either cardinal directions ("north") or atmospheric descriptions ("through the crystal archway")
- **Persistent Worlds**: Save and load multiple game sessions with SQLite database
- **Smart Generation**: AI-controlled room density with 30% probability connections for realistic exploration
- **Visit-to-Lock System**: Rooms maintain consistent layout after first visit
- **Interactive CLI**: Full command-line interface with help system and shortcuts

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/progressions/shadow_kingdom.git
   cd shadow_kingdom
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your Grok API key
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

## Configuration

### Required Environment Variables

- `GROK_API_KEY`: Your Grok API key from [x.ai](https://x.ai)

### Optional Settings

- `GROK_MODEL`: AI model to use (default: "grok-3")
- `MAX_ROOMS_PER_GAME`: Maximum rooms per game (default: 100)
- `AI_MOCK_MODE`: Use mock AI responses for testing (default: false)

See `.env` for all available configuration options.

## Usage

### Starting the Game

```bash
npm start
```

### Main Menu Commands

- `new` - Start a new game
- `load` - Load an existing game
- `delete` - Delete a saved game
- `help` - Show available commands
- `exit` - Quit the application

### In-Game Commands

- `look` - Examine your current location
- `go <direction>` - Move in a direction (e.g., "go north")
- `<direction>` - Direct movement shortcuts (n, s, e, w, up, down)
- `<thematic name>` - Use atmospheric connection names
- `help` - Show game commands
- `menu` - Return to main menu

### Example Gameplay

```
> look

Grand Entrance Hall
===================
You stand in a magnificent entrance hall that speaks of forgotten grandeur. 
Towering marble columns stretch up to a vaulted ceiling painted with faded 
celestial murals...

Exits: through the ornate archway beneath celestial murals (north), 
through the glass doors that shimmer with moonlight (east), 
up the stone steps to the winding tower (west)

> go through the glass doors
> north
> through ornate archway
```

## Architecture

### Core Components

- **GameController** (`src/gameController.ts`): Main game logic and command processing
- **GrokClient** (`src/ai/grokClient.ts`): AI integration for content generation
- **Database** (`src/utils/database.ts`): SQLite database wrapper
- **CLI Interface**: Interactive command-line interface with readline

### Database Schema

- **games**: Game sessions with metadata
- **rooms**: Generated rooms with descriptions
- **connections**: Bidirectional room connections with thematic names
- **game_state**: Current player position and game state

### AI Integration

The game uses Grok AI to generate:
- Room names and atmospheric descriptions
- Thematic connection names and layouts
- Variable room density (average 2-4 connections per room)
- Contextually appropriate content based on game history

## Development

### Scripts

```bash
npm run dev     # Start development server with hot reload
npm run build   # Build TypeScript to JavaScript
npm run start   # Run the built application
npm run lint    # Run ESLint
```

### Project Structure

```
src/
├── ai/             # AI integration
│   └── grokClient.ts
├── utils/          # Utilities
│   ├── database.ts
│   └── initDb.ts
├── gameController.ts
└── index.ts
```

### Key Features Implementation

#### Thematic Connections
- Dual navigation system supporting both "north" and "through the crystal archway"
- AI generates atmospheric connection names that fit room themes
- 30% probability per direction creates realistic room layouts

#### Visit-to-Lock System
- Rooms lock their layout when first visited by the player
- Prevents "phantom connections" appearing on return visits
- Maintains world consistency and player spatial memory

#### Background Generation
- Rooms generated ahead of player movement
- Configurable generation limits and cooldown periods
- Race condition prevention for duplicate content

## API Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GROK_API_KEY` | Required | API key for Grok AI |
| `MAX_ROOMS_PER_GAME` | 100 | Maximum rooms per game |
| `MAX_GENERATION_DEPTH` | 5 | Levels of background generation |
| `GENERATION_COOLDOWN_MS` | 5000 | Cooldown between generations |
| `AI_MOCK_MODE` | false | Use mock responses for testing |

### Connection Format

Connections support dual addressing:
- **Direction**: Cardinal directions (north, south, east, west, up, down)
- **Thematic Name**: AI-generated atmospheric descriptions

Example:
```sql
INSERT INTO connections (direction, name) VALUES 
('north', 'through the ornate archway beneath celestial murals');
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Grok AI](https://x.ai) for content generation
- Inspired by classic text adventure games
- Uses SQLite for persistent game storage