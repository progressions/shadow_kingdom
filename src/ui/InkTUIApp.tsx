import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { MessageType } from './MessageFormatter';
import { GameState } from './StatusManager';

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
}

interface ContentAreaProps {
  messages: Message[];
  maxHeight?: number;
}

interface InputBarProps {
  onSubmit: (input: string) => void;
  waiting?: boolean;
  onKeyPress?: (key: string) => void;
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
      return 'blue';
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
const ContentArea: React.FC<ContentAreaProps> = ({ messages, maxHeight = 20 }) => {
  // Show only the last N messages that fit in the display area
  const visibleMessages = messages.slice(-maxHeight);

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {visibleMessages.map((message) => (
        <Box key={message.id}>
          <Text color={getMessageColor(message.type)} bold={message.type === MessageType.ROOM_TITLE}>
            {message.content}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

// Input bar component - manual input handling
const InputBar: React.FC<InputBarProps> = ({ onSubmit, waiting = false, onKeyPress }) => {
  const [input, setInput] = useState('');

  useInput((ch, key) => {
    if (waiting) return; // Don't handle input when processing commands
    
    if (key.return) {
      // Submit on Enter
      if (input.trim()) {
        onSubmit(input.trim());
        setInput('');
      }
      return;
    }
    
    if (key.backspace || key.delete) {
      // Handle backspace
      setInput(prev => prev.slice(0, -1));
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
    <Box borderStyle="single" paddingX={1}>
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
  waiting = false 
}) => {
  return (
    <Box flexDirection="column" height="100%">
      {/* Content Area */}
      <ContentArea messages={messages} />
      
      {/* Input Bar */}
      <InputBar onSubmit={onInput} waiting={waiting} onKeyPress={onKeyPress} />
      
      {/* Status Bar */}
      <StatusBar gameState={gameState} />
    </Box>
  );
};