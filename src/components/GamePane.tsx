import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

interface GamePaneProps {
  messages: string[]
  maxLines?: number
}

export const GamePane: React.FC<GamePaneProps> = ({ messages, maxLines = 20 }) => {
  // Simple display of messages - no header, no complex logic
  const displayMessages = useMemo(() => {
    const availableLines = Math.max(3, maxLines - 2);
    if (messages.length <= availableLines) {
      return messages;
    }
    return messages.slice(-availableLines);
  }, [messages, maxLines])

  return (
    <Box 
      flexDirection="column" 
      width="100%"
      padding={1}
    >
      {displayMessages.map((message, index) => {
        const isCommand = message.startsWith('>');
        const isHeader = message.includes('=== Shadow Kingdom ===');
        
        return (
          <Text 
            key={index}
            color={isHeader ? "cyan" : (isCommand ? "green" : "white")}
            bold={isHeader}
            wrap="wrap"
          >
            {isCommand || isHeader ? message : `  ${message}`}
          </Text>
        );
      })}
    </Box>
  )
}