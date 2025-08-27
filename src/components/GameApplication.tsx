import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useApp, useStdout } from 'ink';
import type { Room } from '@prisma/client';
import type { GameSession } from '../services/gameStateManager';
import { GamePane } from './GamePane';
import { InputBar } from './InputBar';
import { StatusPane } from './StatusPane';
import { GameEngine } from '../services/gameEngine';
import { GameStateManager } from '../services/gameStateManager';
import { CommandRouter } from '../services/commandRouter';
import { RoomNavigationEngine } from '../services/roomNavigationEngine';
import { PrismaService } from '../services/prismaService';
import { ClaudeRegionService } from '../services/claudeRegionService';
import { LoggingService, MessageType } from '../services/loggingService';
import { ColorThemeService } from '../services/colorThemeService';
import { Message, createMessage } from '../types/Message';
import { addMessagesToBuffer, getBufferStats } from '../utils/messageBuffer';

interface GameApplicationProps {
  programmaticCommand?: string;
  debugMode?: boolean;
}

interface GameState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  currentRoom: Room | null;
  gameSession: GameSession | null;
}

export const GameApplication: React.FC<GameApplicationProps> = ({
  programmaticCommand,
  debugMode = false,
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [statusInfo, setStatusInfo] = useState<{
    status?: string;
    statusLines?: string[];
    version?: string;
    mode?: string;
    connection?: string;
    [key: string]: string | number | string[] | undefined;
  }>({});
  const [navigationHints, setNavigationHints] = useState<string[]>([]);
  const [terminalSize, setTerminalSize] = useState({ width: 80, height: 24 });

  // Service instances
  const servicesRef = useRef<{
    gameEngine: GameEngine | null;
    gameStateManager: GameStateManager | null;
    commandRouter: CommandRouter | null;
    navigationEngine: RoomNavigationEngine | null;
    prismaService: PrismaService | null;
    claudeRegionService: ClaudeRegionService | null;
    loggingService: LoggingService | null;
    colorThemeService: ColorThemeService | null;
  }>({
    gameEngine: null,
    gameStateManager: null,
    commandRouter: null,
    navigationEngine: null,
    prismaService: null,
    claudeRegionService: null,
    loggingService: null,
    colorThemeService: null,
  });

  // Hooks
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Helper function to add messages with logging
  // Don't use useCallback here to avoid dependency issues
  const addMessage = (message: string | string[], type: MessageType = 'RESPONSE'): void => {
    const messageStrings = Array.isArray(message) ? message : [message];

    // Update UI state with scrollback buffer management
    setMessages(prev => {
      // Create Message objects for new messages
      const messageObjects = messageStrings.map(content => createMessage(content));
      // Use buffer utility for automatic trimming
      const updatedMessages = addMessagesToBuffer(prev, messageObjects);

      // Log buffer stats in debug mode
      if (debugMode) {
        const stats = getBufferStats(updatedMessages);
        if (stats.isFull) {
          console.log('[DEBUG] Message buffer is full, trimming old messages');
        }
      }

      return updatedMessages;
    });

    // Debug output
    if (process.env.DEBUG_LOGGING === 'true') {
      console.log(
        `[DEBUG-APP] addMessage called with ${messageStrings.length} messages, type: ${type}`
      );
      console.log(`[DEBUG-APP] loggingService exists: ${!!servicesRef.current.loggingService}`);
    }

    // Log to file if logging service is available
    // Access ref directly to get current value
    if (servicesRef.current.loggingService && servicesRef.current.loggingService.isEnabled()) {
      // Join multi-line messages for logging
      const logMessage = messageStrings.join('\n');
      servicesRef.current.loggingService.logMessage(logMessage, type).catch(error => {
        if (debugMode) {
          console.warn('Failed to log message:', error);
        }
      });
    } else if (process.env.DEBUG_LOGGING === 'true') {
      console.log('[DEBUG-APP] Logging service not available or disabled');
      console.log('[DEBUG-APP] servicesRef.current:', servicesRef.current);
    }
  };

  // Handle terminal resize
  useEffect(() => {
    if (!stdout) return;

    const updateSize = () => {
      if (!stdout) return;
      setTerminalSize({
        width: stdout.columns || 80,
        height: stdout.rows || 24,
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

      // Initialize logging service first
      const loggingService = LoggingService.getInstance();
      await loggingService.logSessionStart();

      // Initialize color theme service
      const colorThemeService = new ColorThemeService();
      await colorThemeService.loadTheme();
      if (debugMode) {
        console.log('ColorThemeService initialized and theme loaded');
      }

      // Initialize services in dependency order
      const prismaService = PrismaService.getInstance();

      // Initialize database if needed (create, schema, seed)
      await prismaService.initialize();

      const gameStateManager = new GameStateManager(prismaService);

      // Initialize ClaudeRegionService if Claude API is available
      let claudeRegionService: ClaudeRegionService | undefined;
      if (process.env.CLAUDE_API_KEY || process.env.CLAUDE_MOCK_MODE === 'true') {
        claudeRegionService = new ClaudeRegionService(prismaService, gameStateManager);
        if (debugMode) {
          console.log('ClaudeRegionService initialized');
        }
      } else if (debugMode) {
        console.log('ClaudeRegionService not initialized (no API key or mock mode)');
      }

      const gameEngine = new GameEngine(prismaService, gameStateManager, claudeRegionService);
      const navigationEngine = new RoomNavigationEngine(
        gameStateManager,
        prismaService,
        claudeRegionService
      );
      const commandRouter = new CommandRouter(gameStateManager, prismaService);

      // Store service references
      servicesRef.current = {
        gameEngine,
        gameStateManager,
        commandRouter,
        navigationEngine,
        prismaService,
        claudeRegionService: claudeRegionService || null,
        loggingService,
        colorThemeService,
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

      // Show welcome message and initial room
      addMessage(
        [
          '=== Shadow Kingdom ===',
          '',
          'Welcome to your adventure! Type "help" for available commands.',
          '',
        ],
        'SYSTEM'
      );

      // Display the initial room description
      if (currentRoom) {
        const roomInfo = await gameStateManager.getCurrentRoomInfo();
        // Split room info into separate messages for proper coloring
        if (roomInfo.includes('===')) {
          const lines = roomInfo.split('\n');
          let currentMessage = '';
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if this is a room title (next line has ===)
            if (i + 1 < lines.length && lines[i + 1].match(/^=+$/)) {
              // Send any accumulated message first
              if (currentMessage.trim()) {
                addMessage(currentMessage.trim(), 'ROOM');
                currentMessage = '';
              }
              // Send room title with its underline as one message
              addMessage(`${line}\n${lines[i + 1]}`, 'ROOM');
              i++; // Skip the underline line
            } else if (line.startsWith('Exits:') || line.startsWith('You can see:')) {
              // Send accumulated message
              if (currentMessage.trim()) {
                addMessage(currentMessage.trim(), 'ROOM');
                currentMessage = '';
              }
              // Send this line separately
              addMessage(line, 'ROOM');
            } else {
              // Accumulate regular lines
              if (currentMessage) currentMessage += '\n';
              currentMessage += line;
            }
          }
          
          // Send any remaining message
          if (currentMessage.trim()) {
            addMessage(currentMessage.trim(), 'ROOM');
          }
        } else {
          addMessage(roomInfo, 'ROOM');
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

      // Log the error
      const { loggingService } = servicesRef.current;
      if (loggingService && loggingService.isEnabled()) {
        await loggingService.logMessage(`Failed to start game: ${errorMessage}`, 'ERROR');
      }

      setGameState(prev => ({
        ...prev,
        isLoading: false,
        error: `Failed to start game: ${errorMessage}`,
      }));
    }
  }, [programmaticCommand, debugMode]);

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
      let hints: string[] = [];
      if (currentRoom) {
        hints = await navigationEngine.getNavigationHints();
        setNavigationHints(hints);
      }

      // Update status display directly here to avoid circular dependency
      if (!session || !currentRoom) {
        setStatusInfo({ status: 'No active session' });
      } else {
        const statusLines = [
          `Shadow Kingdom - Game ${session.gameId}`,
          `Location: ${currentRoom.name}`,
          `Region: ${currentRoom.regionId || 'Unknown'}`,
        ];

        // Add navigation hints
        if (hints && hints.length > 0) {
          statusLines.push('---');
          statusLines.push(...hints);
        }

        setStatusInfo({ statusLines });
      }
    } catch (error) {
      if (debugMode) {
        console.error('Error updating game state:', error);
      }
    }
  }, [debugMode]);

  // Handle programmatic command execution
  const handleProgrammaticCommand = useCallback(
    async (command: string): Promise<void> => {
      const { commandRouter } = servicesRef.current;
      if (!commandRouter) return;

      try {
        addMessage(`> ${command}`, 'COMMAND');

        const result = await commandRouter.executeCommand(command);

        if (result.success) {
          // Log and display response as single message to preserve formatting
          addMessage(result.response, 'RESPONSE');

          // Handle quit command - exit immediately for programmatic mode
          if (result.metadata?.shouldExit) {
            // Quick cleanup for programmatic mode
            const { prismaService } = servicesRef.current;
            if (prismaService) {
              await prismaService.disconnect().catch(() => {});
            }
            setTimeout(() => {
              exit();
              // Force exit if needed
              setTimeout(() => process.exit(0), 100);
            }, 0);
            return;
          }

          // Update state if room changed
          if (result.metadata?.roomChanged) {
            await updateGameState();
          }
        } else {
          // Log and display error
          addMessage(result.response, 'ERROR');
        }

        // Exit after programmatic command execution
        setTimeout(() => exit(), 100);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        addMessage(`Error: ${errorMsg}`, 'ERROR');
        setTimeout(() => exit(), 100);
      }
    },
    [exit]
  );

  // Handle interactive command submission
  const handleCommandSubmit = useCallback(
    async (command: string): Promise<void> => {
      const { commandRouter, gameStateManager } = servicesRef.current;
      if (!commandRouter || !gameStateManager) {
        addMessage('Game services not available. Please wait...', 'ERROR');
        return;
      }

      try {
        // Log the command
        addMessage(`> ${command}`, 'COMMAND');

        // Execute the command through the router
        const result = await commandRouter.executeCommand(command);

        if (result.success) {
          // Split room descriptions into separate messages for proper coloring
          if (result.response.includes('===')) {
            // This looks like a room description, split it carefully
            const lines = result.response.split('\n');
            let currentMessage = '';
            let inRoomTitle = false;
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              // Check if this is a room title (next line has ===)
              if (i + 1 < lines.length && lines[i + 1].match(/^=+$/)) {
                // Send any accumulated message first
                if (currentMessage.trim()) {
                  addMessage(currentMessage.trim(), 'RESPONSE');
                  currentMessage = '';
                }
                // Send room title with its underline as one message
                addMessage(`${line}\n${lines[i + 1]}`, 'RESPONSE');
                i++; // Skip the underline line
                inRoomTitle = true;
              } else if (line.startsWith('Exits:') || line.startsWith('You can see:')) {
                // Send accumulated message
                if (currentMessage.trim()) {
                  addMessage(currentMessage.trim(), 'RESPONSE');
                  currentMessage = '';
                }
                // Send this line separately
                addMessage(line, 'RESPONSE');
              } else {
                // Accumulate regular lines
                if (currentMessage) currentMessage += '\n';
                currentMessage += line;
              }
            }
            
            // Send any remaining message
            if (currentMessage.trim()) {
              addMessage(currentMessage.trim(), 'RESPONSE');
            }
          } else {
            // Display the response as single message to preserve formatting
            addMessage(result.response, 'RESPONSE');
          }

          // Handle quit command
          if (result.metadata?.shouldExit) {
            addMessage('Shutting down...', 'SYSTEM');

            // Ensure cleanup happens before exit
            const performQuickCleanup = async () => {
              try {
                const { prismaService, loggingService, claudeRegionService } = servicesRef.current;

                // Stop Claude region generation if active
                if (claudeRegionService) {
                  await claudeRegionService.cleanup().catch(() => {});
                }

                if (loggingService) {
                  await loggingService.logSessionEnd().catch(() => {});
                }

                if (prismaService) {
                  await prismaService.disconnect().catch(() => {});
                }
              } catch (_) {
                // Ignore errors during quick cleanup
              }

              // Force immediate exit
              process.exit(0);
            };

            performQuickCleanup();
            return;
          }

          // Update state if room changed
          if (result.metadata?.roomChanged) {
            await updateGameState();
          }
        } else {
          // Display error message
          addMessage(result.response, 'ERROR');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        addMessage(`Error: ${errorMsg}`, 'ERROR');

        if (debugMode) {
          console.error('Command execution error:', error);
        }
      }
    },
    [addMessage, exit, updateGameState, debugMode]
  );

  // Update status display
  const updateStatusDisplay = useCallback(
    (session: GameSession | null, room: Room | null): void => {
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
    },
    [navigationHints]
  );

  // Initialize on mount
  useEffect(() => {
    initializeServices();

    // Cleanup on unmount
    return () => {
      const { gameEngine, gameStateManager, navigationEngine, prismaService, loggingService } =
        servicesRef.current;

      // Perform cleanup operations in sequence to avoid race conditions
      // GameStateManager needs to save state before database disconnects
      const performCleanup = async () => {
        try {
          // Log session end first
          if (loggingService) {
            await loggingService.logSessionEnd().catch(error => {
              if (debugMode) {
                console.error('Failed to log session end:', error);
              }
            });
          }

          // Save game state before disconnecting database
          if (gameStateManager?.shutdown) {
            await gameStateManager.shutdown().catch(error => {
              if (debugMode) {
                console.error('GameStateManager shutdown error:', error);
              }
            });
          }

          // Cleanup navigation engine
          if (navigationEngine?.cleanup) {
            await navigationEngine.cleanup().catch(error => {
              if (debugMode) {
                console.error('NavigationEngine cleanup error:', error);
              }
            });
          }

          // Shutdown game engine
          if (gameEngine?.shutdown) {
            await gameEngine.shutdown().catch(error => {
              if (debugMode) {
                console.error('GameEngine shutdown error:', error);
              }
            });
          }

          // Finally disconnect database
          if (prismaService?.disconnect) {
            await prismaService.disconnect().catch(error => {
              if (debugMode) {
                console.error('PrismaService disconnect error:', error);
              }
            });
          }

          // Shutdown logging service last
          if (loggingService?.shutdown) {
            await loggingService.shutdown().catch(error => {
              if (debugMode) {
                console.error('LoggingService shutdown error:', error);
              }
            });
          }
        } catch (error) {
          if (debugMode) {
            console.error('Cleanup sequence error:', error);
          }
        }
      };

      performCleanup();
    };
  }, [initializeServices, debugMode]);

  // Update status when hints change
  useEffect(() => {
    updateStatusDisplay(gameState.gameSession, gameState.currentRoom);
  }, [navigationHints, gameState.gameSession, gameState.currentRoom, updateStatusDisplay]);

  // Calculate layout
  const statusHeight = Array.isArray(statusInfo.statusLines) ? statusInfo.statusLines.length : 1;
  const inputBarHeight = 3;
  const fixedBottomHeight = inputBarHeight + statusHeight;
  const gameAreaHeight = Math.max(1, terminalSize.height - fixedBottomHeight);

  // Show loading state
  if (gameState.isLoading) {
    return (
      <Box
        flexDirection="column"
        height="100%"
        width="100%"
        justifyContent="center"
        alignItems="center"
      >
        <Box marginBottom={1}>
          <Text>📚 Loading Shadow Kingdom...</Text>
        </Box>
        {debugMode && <Text color="gray">Initializing services and launching game...</Text>}
      </Box>
    );
  }

  // Show error state
  if (gameState.error) {
    return (
      <Box
        flexDirection="column"
        height="100%"
        width="100%"
        justifyContent="center"
        alignItems="center"
      >
        <Box marginBottom={1}>
          <Text color="red">⚠️ {gameState.error}</Text>
        </Box>
        <Text color="gray">Please try restarting the application.</Text>
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
        <GamePane messages={messages} maxLines={gameAreaHeight} colorThemeService={servicesRef.current.colorThemeService || undefined} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Game Pane - fills remaining space */}
      <Box flexGrow={1} width="100%" flexDirection="column" flexShrink={1}>
        <GamePane messages={messages} maxLines={gameAreaHeight} colorThemeService={servicesRef.current.colorThemeService || undefined} />
      </Box>

      {/* Bottom section - Input Bar and Status Pane */}
      <Box flexShrink={0} width="100%" flexDirection="column" flexGrow={0}>
        <InputBar
          onSubmit={handleCommandSubmit}
          placeholder=""
          commandHistory={commandHistory}
          onHistoryUpdate={setCommandHistory}
        />
        <StatusPane {...statusInfo} />
      </Box>
    </Box>
  );
};
