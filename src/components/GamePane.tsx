import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

interface GamePaneProps {
  messages: string[]
  maxLines?: number
}

export const GamePane: React.FC<GamePaneProps> = ({ messages, maxLines = 20 }) => {
  // Calculate which messages to display (show most recent)
  const displayMessages = useMemo(() => {
    if (messages.length <= maxLines - 3) { // Reserve space for header and welcome text
      return messages
    }
    return messages.slice(-(maxLines - 3))
  }, [messages, maxLines])
  return (
    <Box 
      flexDirection="column" 
      flexGrow={1}
      width="100%"
      padding={1}
    >
      <Text color="cyan" bold>
        === Shadow Kingdom ===
      </Text>
      
      <Box flexDirection="column" marginTop={1}>
        {displayMessages.length === 0 ? (
          <Text color="gray">
            Welcome to Shadow Kingdom! Type a command to begin...
          </Text>
        ) : (
          displayMessages.map((message, index) => (
            <Text key={index}>
              {`> ${message}`}
            </Text>
          ))
        )}
      </Box>
    </Box>
  )
}