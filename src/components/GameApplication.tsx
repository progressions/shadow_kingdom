import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useApp, useStdout } from 'ink';
import { GamePane } from './GamePane';
import { InputBar } from './InputBar';
import { StatusPane } from './StatusPane';
import { GameEngine } from '../services/gameEngine';
import { GameStateManager } from '../services/gameStateManager';
import { CommandRouter } from '../services/commandRouter';
import { RoomNavigationEngine } from '../services/roomNavigationEngine';
import { PrismaService } from '../services/prismaService';

interface GameApplicationProps {
  programmaticCommand?: string;
  debugMode?: boolean;
}

interface GameState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  currentRoom: any | null;
  gameSession: any | null;
}

export const GameApplication: React.FC<GameApplicationProps> = ({ 
  programmaticCommand,
  debugMode = false 
}) => {
  // Core application state
  const [gameState, setGameState] = useState<GameState>({
    isInitialized: false,
    isLoading: true,
    error: null,
    currentRoom: null,
    gameSession: null,
  });

  // UI state
  const [messages, setMessages] = useState<string[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [statusInfo, setStatusInfo] = useState<any>({});
  const [navigationHints, setNavigationHints] = useState<string[]>([]);
  const [terminalSize, setTerminalSize] = useState({ width: 80, height: 24 });

  // Service instances
  const servicesRef = useRef<{
    gameEngine: GameEngine | null;
    gameStateManager: GameStateManager | null;
    commandRouter: CommandRouter | null;
    navigationEngine: RoomNavigationEngine | null;
    prismaService: PrismaService | null;
  }>({
    gameEngine: null,
    gameStateManager: null,
    commandRouter: null,
    navigationEngine: null,
    prismaService: null,
  });

  // Hooks
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Handle terminal resize
  useEffect(() => {
    if (!stdout) return;
    
    const updateSize = () => {
      if (!stdout) return;
      setTerminalSize({
        width: stdout.columns || 80,
        height: stdout.rows || 24
      });
    };

    updateSize();
    stdout.on('resize', updateSize);

    return () => {
      stdout.off('resize', updateSize);
    };
  }, [stdout]);

  // Initialize services
  const initializeServices = useCallback(async (): Promise<void> => {
    try {
      setGameState(prev => ({ ...prev, isLoading: true, error: null }));

      // Initialize services in dependency order
      const prismaService = PrismaService.getInstance();
      const gameStateManager = new GameStateManager(prismaService);
      const gameEngine = new GameEngine(prismaService, gameStateManager);
      const navigationEngine = new RoomNavigationEngine(gameStateManager, prismaService);
      const commandRouter = new CommandRouter(gameStateManager, prismaService);

      // Store service references
      servicesRef.current = {
        gameEngine,
        gameStateManager,
        commandRouter,
        navigationEngine,
        prismaService,
      };

      // Initialize game engine
      await gameEngine.initialize();

      // Launch the game
      const launchResult = await gameEngine.safeLaunch();

      // Initialize game state manager with the launched game
      await gameStateManager.initializeGame(launchResult.game);

      // Get initial game state
      const session = gameStateManager.getCurrentSession();
      const currentRoom = gameStateManager.getCurrentRoom();

      if (debugMode) {
        console.log('Game launched:', launchResult);
        console.log('Session:', session);
        console.log('Current room:', currentRoom);
      }

      setGameState({
        isInitialized: true,
        isLoading: false,
        error: null,
        currentRoom,
        gameSession: session,
      });

      // Show initial room description
      if (currentRoom && navigationEngine) {
        try {
          const roomDescription = await navigationEngine.generateRoomDescription(currentRoom);
          // Split room description into lines for proper display
          const roomLines = roomDescription.split('\n');
          setMessages([
            '=== Shadow Kingdom ===',
            '',
            'Welcome to Shadow Kingdom! Type a command to begin...',
            '',
            ...roomLines
          ]);

          // Get navigation hints
          const hints = await navigationEngine.getNavigationHints();
          setNavigationHints(hints);
        } catch (error) {
          // Fallback room description
          const fallbackDescription = `**${currentRoom.name}**\n\n${currentRoom.description}`;
          // Split fallback description into lines for proper display
          const fallbackLines = fallbackDescription.split('\n');
          setMessages([
            '=== Shadow Kingdom ===',
            '',
            'Welcome to Shadow Kingdom! Type a command to begin...',
            '',
            ...fallbackLines
          ]);
        }
      }

      // Update status
      updateStatusDisplay(session, currentRoom);

      // Handle programmatic command if provided
      if (programmaticCommand) {
        await handleProgrammaticCommand(programmaticCommand);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to initialize game:', error);
      
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        error: `Failed to start game: ${errorMessage}`
      }));
    }
  }, [programmaticCommand, debugMode]);

  // Handle programmatic command execution
  const handleProgrammaticCommand = useCallback(async (command: string): Promise<void> => {
    const { commandRouter } = servicesRef.current;
    if (!commandRouter) return;

    try {
      setMessages(prev => [...prev, `> ${command}`]);
      
      const result = await commandRouter.executeCommand(command);
      
      if (result.success) {
        // Split response into lines for proper display
        const responseLines = result.response.split('\n');
        setMessages(prev => [...prev, ...responseLines]);
        
        // Handle quit command - exit immediately for programmatic mode
        if (result.metadata?.shouldExit) {
          setTimeout(() => exit(), 100);
          return;
        }
        
        // Update state if room changed
        if (result.metadata?.roomChanged) {
          await updateGameState();
        }
      } else {
        // Split error response into lines for proper display
        const errorLines = result.response.split('\n');
        setMessages(prev => [...prev, ...errorLines]);
      }

      // Exit after programmatic command execution
      setTimeout(() => exit(), 100);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setMessages(prev => [...prev, `Error: ${errorMsg}`]);
      setTimeout(() => exit(), 100);
    }
  }, [exit]);

  // Handle interactive command submission
  const handleCommandSubmit = useCallback(async (command: string): Promise<void> => {
    const { commandRouter } = servicesRef.current;
    if (!commandRouter || !command.trim()) return;

    try {
      setMessages(prev => [...prev, `> ${command}`]);
      
      const result = await commandRouter.executeCommand(command);
      
      if (result.success) {
        // Split response into lines for proper display
        const responseLines = result.response.split('\n');
        setMessages(prev => [...prev, ...responseLines]);
        
        // Handle quit command
        if (result.metadata?.shouldExit) {
          setTimeout(() => {
            process.exit(0);
          }, 1500); // Give time to show the goodbye message
          return;
        }
        
        // Update state if room changed
        if (result.metadata?.roomChanged) {
          await updateGameState();
        }
      } else {
        // Split error response into lines for proper display
        const errorLines = result.response.split('\n');
        setMessages(prev => [...prev, ...errorLines]);
      }

    } catch (error) {
      const errorMsg = 'An error occurred while processing your command. Please try again.';
      setMessages(prev => [...prev, errorMsg]);
      
      if (debugMode) {
        console.error('Command execution error:', error);
      }
    }
  }, [debugMode]);

  // Update game state after room changes
  const updateGameState = useCallback(async (): Promise<void> => {
    const { gameStateManager, navigationEngine } = servicesRef.current;
    if (!gameStateManager || !navigationEngine) return;

    try {
      const session = gameStateManager.getCurrentSession();
      const currentRoom = gameStateManager.getCurrentRoom();

      setGameState(prev => ({
        ...prev,
        currentRoom,
        gameSession: session,
      }));

      // Update navigation hints
      if (currentRoom) {
        const hints = await navigationEngine.getNavigationHints();
        setNavigationHints(hints);
      }

      // Update status display
      updateStatusDisplay(session, currentRoom);

    } catch (error) {
      if (debugMode) {
        console.error('Error updating game state:', error);
      }
    }
  }, [debugMode]);

  // Update status display
  const updateStatusDisplay = useCallback((session: any, room: any): void => {
    if (!session || !room) {
      setStatusInfo({ status: 'No active session' });
      return;
    }

    const statusLines = [
      `Shadow Kingdom - Game ${session.gameId}`,
      `Location: ${room.name}`,
      `Region: ${room.regionId || 'Unknown'}`,
    ];

    // Add navigation hints
    if (navigationHints && navigationHints.length > 0) {
      statusLines.push('---');
      // Show all navigation hints to prevent truncation
      statusLines.push(...navigationHints);
    }

    setStatusInfo({ statusLines });
  }, [navigationHints]);

  // Initialize on mount
  useEffect(() => {
    initializeServices();

    // Cleanup on unmount
    return () => {
      const { gameEngine, gameStateManager, navigationEngine, prismaService } = servicesRef.current;
      
      Promise.all([
        gameStateManager?.shutdown?.(),
        navigationEngine?.cleanup?.(),
        gameEngine?.shutdown?.(),
        prismaService?.disconnect?.(),
      ]).catch(error => {
        if (debugMode) {
          console.error('Cleanup error:', error);
        }
      });
    };
  }, [initializeServices, debugMode]);

  // Update status when hints change
  useEffect(() => {
    updateStatusDisplay(gameState.gameSession, gameState.currentRoom);
  }, [navigationHints, gameState.gameSession, gameState.currentRoom, updateStatusDisplay]);

  // Calculate layout
  const statusHeight = statusInfo.statusLines ? statusInfo.statusLines.length : 1;
  const inputBarHeight = 3;
  const fixedBottomHeight = inputBarHeight + statusHeight;
  const gameAreaHeight = Math.max(1, terminalSize.height - fixedBottomHeight);

  // Show loading state
  if (gameState.isLoading) {
    return (
      <Box flexDirection="column" height="100%" width="100%" justifyContent="center" alignItems="center">
        <Box marginBottom={1}>
          <Text>📚 Loading Shadow Kingdom...</Text>
        </Box>
        {debugMode && (
          <Text color="gray">
            Initializing services and launching game...
          </Text>
        )}
      </Box>
    );
  }

  // Show error state
  if (gameState.error) {
    return (
      <Box flexDirection="column" height="100%" width="100%" justifyContent="center" alignItems="center">
        <Box marginBottom={1}>
          <Text color="red">⚠️  {gameState.error}</Text>
        </Box>
        <Text color="gray">
          Please try restarting the application.
        </Text>
        {debugMode && (
          <Box marginTop={1}>
            <Text color="dim">Press Ctrl+C to exit</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Show main game interface (only for interactive mode)
  if (programmaticCommand) {
    return (
      <Box flexDirection="column" height="100%" width="100%">
        <GamePane messages={messages} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Game Pane - fills available height */}
      <Box height={gameAreaHeight} width="100%">
        <GamePane messages={messages} />
      </Box>
      
      {/* Spacer to push bottom bars down */}
      <Box flexGrow={1} />
      
      {/* Bottom section - Input Bar and Status Pane */}
      <Box flexShrink={0} width="100%" flexDirection="column">
        <InputBar 
          onSubmit={handleCommandSubmit}
          placeholder="Enter command..."
          commandHistory={commandHistory}
          onHistoryUpdate={setCommandHistory}
        />
        <StatusPane {...statusInfo} />
      </Box>
    </Box>
  );
};