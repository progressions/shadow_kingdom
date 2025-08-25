import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

interface GamePaneProps {
  messages: string[]
  maxLines?: number
}

export const GamePane: React.FC<GamePaneProps> = ({ messages, maxLines = 20 }) => {
  // Create all content as a single array, including header
  const allContent = useMemo(() => {
    const content = ['=== Shadow Kingdom ===', ''];
    
    if (messages.length === 0) {
      content.push('Welcome to Shadow Kingdom! Type a command to begin...', '');
      content.push('Try: help, hello, look, status');
    } else {
      content.push(...messages);
    }
    
    // Simple truncation - show the most recent content that fits
    const availableLines = Math.max(5, maxLines - 2); // Reserve minimal space for padding
    if (content.length <= availableLines) {
      return content;
    }
    return content.slice(-availableLines);
  }, [messages, maxLines])

  return (
    <Box 
      flexDirection="column" 
      width="100%"
      padding={1}
    >
      {allContent.map((line, index) => {
        const isHeader = line === '=== Shadow Kingdom ===';
        const isCommand = line.startsWith('>');
        const isEmpty = line === '';
        
        if (isEmpty) {
          return <Text key={index}> </Text>;
        }
        
        return (
          <Text 
            key={index}
            color={isHeader ? "cyan" : (isCommand ? "green" : "white")}
            bold={isHeader}
            wrap="wrap"
          >
            {isCommand || isHeader ? line : `  ${line}`}
          </Text>
        );
      })}
    </Box>
  )
}