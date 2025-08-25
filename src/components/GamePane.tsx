import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

interface GamePaneProps {
  messages: string[]
  maxLines?: number
}

export const GamePane: React.FC<GamePaneProps> = ({ messages }) => {
  // Just render ALL messages - let terminal handle scrolling naturally
  const fullText = useMemo(() => {
    return messages.map(message => {
      const isCommand = message.startsWith('>');
      const isHeader = message.includes('=== Shadow Kingdom ===');
      // Add indentation for non-command/header lines
      return (isCommand || isHeader) ? message : `  ${message}`;
    }).join('\n');
  }, [messages]);

  return (
    <Box padding={1} width="100%">
      <Text>{fullText}</Text>
    </Box>
  )
}