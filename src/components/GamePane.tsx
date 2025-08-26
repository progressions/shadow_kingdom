import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

interface GamePaneProps {
  messages: string[]
  maxLines?: number
  width?: number
}

export const GamePane: React.FC<GamePaneProps> = ({ messages, maxLines, width }) => {
  // If maxLines is set, only show the last N messages
  const displayMessages = useMemo(() => {
    if (maxLines && maxLines > 0) {
      // Don't subtract padding since we're handling individual lines now
      if (messages.length > maxLines) {
        return messages.slice(-maxLines);
      }
    }
    return messages;
  }, [messages, maxLines]);
  
  // Process messages to handle special formatting
  const formatMessage = (message: string) => {
    // Check for headers (lines with === or lines that are all caps)
    if (message.includes('===') || message === message.toUpperCase()) {
      return { text: message, color: 'cyan', bold: true };
    }
    // Check for error messages
    if (message.startsWith('Error:') || message.startsWith('Unable to')) {
      return { text: message, color: 'red' };
    }
    // Check for commands (lines starting with >)
    if (message.startsWith('> ')) {
      return { text: message, color: 'green', dimColor: true };
    }
    // Check for exits line
    if (message.startsWith('Exits:')) {
      return { text: message, color: 'yellow' };
    }
    // Check for items/characters headers
    if (message.startsWith('You can see:') || message.startsWith('Also here:')) {
      return { text: message, color: 'magenta' };
    }
    // Default formatting
    return { text: message, color: undefined };
  };
  
  return (
    <Box flexDirection="column" padding={0} width={width}>
      {displayMessages.map((message, index) => {
        const formatted = formatMessage(message);
        return (
          <Box key={`msg-${index}-${message.substring(0, 10)}`}>
            <Text 
              color={formatted.color} 
              bold={formatted.bold}
              dimColor={formatted.dimColor}
              wrap="wrap"
            >
              {formatted.text}
            </Text>
          </Box>
        );
      })}
    </Box>
  )
}