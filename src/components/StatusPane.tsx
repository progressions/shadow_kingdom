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
  // Calculate dynamic height based on content
  const contentHeight = useMemo(() => {
    if (statusLines) {
      return statusLines.length
    }
    if (status) {
      // Count newlines in status string + 1
      return status.split('\n').length
    }
    if (statusInfo) {
      // Count number of info items
      return Math.max(1, Object.keys(statusInfo).length)
    }
    return 1
  }, [status, statusInfo, statusLines])

  return (
    <Box 
      height={contentHeight}
      paddingX={1}
      width="100%"
      flexDirection="column"
    >
      {statusLines ? (
        // Render array of status lines
        statusLines.map((line, index) => (
          <Text key={index} color="yellow">
            {line}
          </Text>
        ))
      ) : status ? (
        // Handle multi-line status string
        status.split('\n').map((line, index) => (
          <Text key={index} color="yellow">
            {line}
          </Text>
        ))
      ) : statusInfo ? (
        // Render structured info as separate lines
        Object.entries(statusInfo).map(([key, value]) => (
          <Text key={key} color="blue">
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