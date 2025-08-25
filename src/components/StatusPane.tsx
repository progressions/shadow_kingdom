import React, { useMemo } from 'react'
import { Box, Text } from 'ink'

interface StatusPaneProps {
  status?: string
  statusInfo?: {
    version?: string
    mode?: string
    connection?: string
    [key: string]: any
  }
  statusLines?: string[]
}

export const StatusPane: React.FC<StatusPaneProps> = ({ status, statusInfo, statusLines }) => {
  // Calculate dynamic height based on content with minimum height
  const contentHeight = useMemo(() => {
    let height = 1;
    if (statusLines) {
      height = Math.max(2, statusLines.length)
    } else if (status) {
      // Count newlines in status string + 1
      height = Math.max(1, status.split('\n').length)
    } else if (statusInfo) {
      // Count number of info items
      height = Math.max(1, Object.keys(statusInfo).length)
    }
    // Ensure minimum height and maximum reasonable height
    return Math.min(Math.max(1, height), 10);
  }, [status, statusInfo, statusLines])

  return (
    <Box 
      height={contentHeight}
      paddingX={1}
      width="100%"
      flexDirection="column"
      flexShrink={0}
      minWidth={0}
    >
      {statusLines ? (
        // Render array of status lines
        statusLines.map((line, index) => (
          <Text key={index} color="yellow" wrap="wrap">
            {line}
          </Text>
        ))
      ) : status ? (
        // Handle multi-line status string
        status.split('\n').map((line, index) => (
          <Text key={index} color="yellow" wrap="wrap">
            {line}
          </Text>
        ))
      ) : statusInfo ? (
        // Render structured info as separate lines
        Object.entries(statusInfo).map(([key, value]) => (
          <Text key={key} color="blue" wrap="wrap">
            {key === 'version' ? value : `${key}: ${value}`}
          </Text>
        ))
      ) : (
        <Text color="gray">
          Ready
        </Text>
      )}
    </Box>
  )
}