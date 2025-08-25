import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

interface GamePaneProps {
  messages: string[]
  maxLines?: number
}

export const GamePane: React.FC<GamePaneProps> = ({ messages }) => {
  // Dead simple - just join and display
  const text = messages.join('\n');
  
  return (
    <Box padding={1}>
      <Text>{text}</Text>
    </Box>
  )
}