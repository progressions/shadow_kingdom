import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

interface GamePaneProps {
  messages: string[]
  maxLines?: number
}

export const GamePane: React.FC<GamePaneProps> = ({ messages, maxLines }) => {
  // If maxLines is set, only show the last N messages
  const displayMessages = useMemo(() => {
    if (maxLines && maxLines > 0) {
      // Account for padding (1 line top, 1 line bottom)
      const availableLines = maxLines - 2;
      if (messages.length > availableLines) {
        return messages.slice(-availableLines);
      }
    }
    return messages;
  }, [messages, maxLines]);
  
  return (
    <Box flexDirection="column" padding={1}>
      {displayMessages.map((message, index) => (
        <Box key={`msg-${index}-${message.substring(0, 10)}`}>
          <Text>{message}</Text>
        </Box>
      ))}
    </Box>
  )
}