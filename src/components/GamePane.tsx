import React, { useMemo } from 'react'
import { Box, Text } from 'ink'
import { Message } from '../types/Message'

interface GamePaneProps {
  messages: Message[]
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
  const formatMessage = (message: Message) => {
    const content = message.content;
    // Check for headers (lines with === or lines that are all caps)
    if (content.includes('===') || content === content.toUpperCase()) {
      return { text: content, color: 'cyan', bold: true };
    }
    // Check for error messages
    if (content.startsWith('Error:') || content.startsWith('Unable to')) {
      return { text: content, color: 'red' };
    }
    // Check for commands (lines starting with >)
    if (content.startsWith('> ')) {
      return { text: content, color: 'green', dimColor: true };
    }
    // Check for exits line
    if (content.startsWith('Exits:')) {
      return { text: content, color: 'yellow' };
    }
    // Check for items/characters headers
    if (content.startsWith('You can see:') || content.startsWith('Also here:')) {
      return { text: content, color: 'magenta' };
    }
    // Default formatting
    return { text: content, color: undefined };
  };
  
  return (
    <Box flexDirection="column" padding={0} width={width}>
      {displayMessages.map((message, index) => {
        const formatted = formatMessage(message);
        return (
          <Box key={message.id}>
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