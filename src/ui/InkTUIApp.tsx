import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { MessageType } from './MessageFormatter';
import { GameState } from './StatusManager';
import { HistoryManager } from '../utils/historyManager';
import { EventEmitter } from 'events';

export interface Message {
  id: string;
  content: string;
  type: MessageType;
  timestamp: Date;
}

export interface InkTUIAppProps {
  messages: Message[];
  gameState: GameState;
  onInput: (input: string) => void;
  onKeyPress?: (key: string) => void;
  waiting?: boolean;
  historyManager?: HistoryManager;
  eventEmitter?: EventEmitter;
}

interface ContentAreaProps {
  messages: Message[];
  maxHeight?: number;
}

interface InputBarProps {
  onSubmit: (input: string) => void;
  waiting?: boolean;
  onKeyPress?: (key: string) => void;
  historyManager?: HistoryManager;
  eventEmitter?: EventEmitter;
}

interface StatusBarProps {
  gameState: GameState;
}

// Color mapping for message types
const getMessageColor = (type: MessageType): string => {
  switch (type) {
    case MessageType.ROOM_TITLE:
      return 'yellow';
    case MessageType.ROOM_DESCRIPTION:
      return 'white';
    case MessageType.EXITS:
      return 'cyan';
    case MessageType.ERROR:
      return 'red';
    case MessageType.AI_GENERATION:
      return 'green';
    case MessageType.SYSTEM:
      return 'gray';
    case MessageType.COMMAND_ECHO:
      return 'cyan';
    default:
      return 'white';
  }
};

// Content area component - scrollable message list
const ContentArea: React.FC<ContentAreaProps> = ({ messages, maxHeight }) => {
  // Use calculated maxHeight or show all messages if not specified
  const visibleMessages = maxHeight ? messages.slice(-maxHeight) : messages;

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1} minHeight={maxHeight || 20}>
      {visibleMessages.map((message) => (
        <Box key={message.id}>
          <Text color={getMessageColor(message.type)} bold={message.type === MessageType.ROOM_TITLE}>
            {message.content}
          </Text>
        </Box>
      ))}
      {/* Fill remaining space if content is shorter than available height */}
      <Box flexGrow={1} />
    </Box>
  );
};

// Input bar component - manual input handling
const InputBar: React.FC<InputBarProps> = ({ onSubmit, waiting = false, onKeyPress, historyManager, eventEmitter }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [originalInput, setOriginalInput] = useState('');

  // Function to refresh history from file
  const refreshHistory = useCallback(async () => {
    if (historyManager) {
      const loadedHistory = await historyManager.loadHistory();
      setHistory(loadedHistory);
    }
  }, [historyManager]);

  // Load history on component mount and track unmount for cleanup
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialHistory = async () => {
      if (isMounted) {
        await refreshHistory();
      }
    };
    
    loadInitialHistory();
    
    return () => {
      isMounted = false;
    };
  }, [refreshHistory]);

  // Listen for refreshHistory events from the bridge
  useEffect(() => {
    if (!eventEmitter) return;

    const handleRefreshHistory = async () => {
      await refreshHistory();
    };

    eventEmitter.on('refreshHistory', handleRefreshHistory);

    return () => {
      eventEmitter.off('refreshHistory', handleRefreshHistory);
    };
  }, [eventEmitter, refreshHistory]);

  useInput((ch, key) => {
    if (waiting) return; // Don't handle input when processing commands
    
    if (key.upArrow && history.length > 0) {
      // Navigate backwards through history (towards older commands)
      if (historyIndex === -1) {
        // Starting history navigation, save current input
        setOriginalInput(input);
        const newIndex = history.length - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
      } else if (historyIndex > 0) {
        // Go to previous command (older)
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
      }
      return;
    }
    
    if (key.downArrow) {
      // Navigate forwards through history (towards newer commands)
      if (historyIndex > 0) {
        // Go to next command (newer)
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
      } else if (historyIndex === 0) {
        // Return to original input
        setHistoryIndex(-1);
        setInput(originalInput);
        setOriginalInput('');
      }
      return;
    }
    
    if (key.return) {
      // Submit on Enter
      if (input.trim()) {
        onSubmit(input.trim());
        setInput('');
        // Reset history navigation
        setHistoryIndex(-1);
        setOriginalInput('');
        // History will be refreshed via event after command processing completes
      }
      return;
    }
    
    if (key.backspace || key.delete) {
      // Handle backspace
      setInput(prev => prev.slice(0, -1));
      // Reset history navigation when user starts editing
      setHistoryIndex(-1);
      setOriginalInput('');
      return;
    }
    
    if (key.ctrl) {
      switch (ch) {
        case 'c':
          process.exit(0);
          break;
        case 'l':
          onKeyPress?.('clear');
          break;
      }
      return;
    }
    
    if (key.pageUp) {
      onKeyPress?.('pageup');
      return;
    }
    
    if (key.pageDown) {
      onKeyPress?.('pagedown');
      return;
    }
    
    // Add regular characters
    if (ch && ch.length === 1 && !key.ctrl && !key.meta) {
      setInput(prev => prev + ch);
      // Reset history navigation when user starts typing
      setHistoryIndex(-1);
      setOriginalInput('');
    }
  });

  const displayText = waiting ? 'Processing...' : `${input}_`;

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text color="cyan">{'> '}</Text>
      <Text>{displayText}</Text>
    </Box>
  );
};

// Status bar component - game state display
const StatusBar: React.FC<StatusBarProps> = ({ gameState }) => {
  const statusParts: string[] = [];
  
  statusParts.push('Shadow Kingdom');
  
  if (gameState.currentRoomName) {
    statusParts.push(`Room: ${gameState.currentRoomName}`);
  }
  
  if (gameState.roomCount !== undefined) {
    statusParts.push(`Rooms: ${gameState.roomCount}`);
  }

  const statusText = statusParts.join(' | ');

  return (
    <Box paddingX={1}>
      <Text color="gray">{statusText}</Text>
    </Box>
  );
};

// Main TUI App component
export const InkTUIApp: React.FC<InkTUIAppProps> = ({ 
  messages, 
  gameState, 
  onInput, 
  onKeyPress,
  waiting = false,
  historyManager,
  eventEmitter
}) => {
  const { stdout } = useStdout();
  
  // Clear screen on component mount
  useEffect(() => {
    process.stdout.write('\x1b[2J\x1b[0f'); // Clear screen and move cursor to top
  }, []);
  
  const terminalHeight = stdout?.rows || 24; // Default to 24 if unavailable
  // Give content area nearly the full screen height, leave 6 lines for status + input + padding
  const contentHeight = Math.max(20, terminalHeight - 6);
  
  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Content Area - fills nearly entire screen */}
      <ContentArea messages={messages} maxHeight={contentHeight} />
      
      {/* Input Bar */}
      <InputBar onSubmit={onInput} waiting={waiting} onKeyPress={onKeyPress} historyManager={historyManager} eventEmitter={eventEmitter} />
      
      {/* Status Bar - at very bottom, below input */}
      <StatusBar gameState={gameState} />
    </Box>
  );
};