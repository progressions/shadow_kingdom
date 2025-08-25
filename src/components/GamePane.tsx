import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

interface GamePaneProps {
  messages: string[]
  maxLines?: number
}

export const GamePane: React.FC<GamePaneProps> = ({ messages, maxLines = 20 }) => {
  // Calculate which messages to display (show most recent)
  const displayMessages = useMemo(() => {
    // More conservative calculation to prevent overflow - account for header
    const availableLines = Math.max(2, maxLines - 6); // Reserve space for header, margins, and welcome text
    if (messages.length <= availableLines) {
      return messages
    }
    return messages.slice(-availableLines)
  }, [messages, maxLines])
  return (
    <Box 
      flexDirection="column" 
      height="100%"
      width="100%"
      padding={1}
      flexShrink={0}
      minWidth={0}
    >
      <Box flexDirection="column" width="100%" minWidth={0}>
        {/* Header - now part of scrolling content */}
        <Text color="cyan" bold>
          === Shadow Kingdom ===
        </Text>
        
        <Box marginTop={1}>
          {displayMessages.length === 0 ? (
            <Box flexDirection="column">
              <Text color="gray" wrap="wrap">
                Welcome to Shadow Kingdom! Type a command to begin...
              </Text>
              <Box marginTop={1}>
                <Text color="dim" wrap="wrap">
                  Try: help, hello, look, status
                </Text>
              </Box>
            </Box>
          ) : (
            displayMessages.map((message, index) => {
              const isCommand = message.startsWith('>')
              
              return (
                <Box key={index} width="100%" minWidth={0}>
                  <Text 
                    color={isCommand ? "green" : "white"}
                    wrap="wrap"
                  >
                    {isCommand ? message : `  ${message}`}
                  </Text>
                </Box>
              )
            })
          )}
        </Box>
      </Box>
    </Box>
  )
}