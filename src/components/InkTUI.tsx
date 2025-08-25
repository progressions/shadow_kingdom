import React, { useState, useEffect, useMemo } from 'react'
import { Box, useApp, useStdout, useInput } from 'ink'
import { GamePane } from './GamePane'
import { InputBar } from './InputBar'
import { StatusPane } from './StatusPane'

export const InkTUI: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([])
  const [commandHistory, setCommandHistory] = useState<string[]>(['help', 'look', 'status'])
  const [terminalSize, setTerminalSize] = useState({ width: 80, height: 24 })
  const [statusContent, setStatusContent] = useState("Shadow Kingdom v1.0 - Ready (Use arrow keys for history)")
  const { stdout } = useStdout()
  const { exit } = useApp()

  // Handle terminal resize events
  useEffect(() => {
    if (!stdout) return
    
    const updateSize = () => {
      if (!stdout) return
      setTerminalSize({
        width: stdout.columns || 80,
        height: stdout.rows || 24
      })
    }

    // Initial size
    updateSize()

    // Listen for resize events
    stdout.on('resize', updateSize)

    return () => {
      stdout.off('resize', updateSize)
    }
  }, [stdout])

  // Global keyboard shortcuts
  useInput((input, key) => {
    // Ctrl+C - Graceful exit
    if (key.ctrl && input === 'c') {
      exit()
      return
    }

    // Ctrl+H - Help system
    if (key.ctrl && input === 'h') {
      setMessages(prev => [...prev, '> help'])
      setMessages(prev => [...prev, 'Available commands: hello, look, help, status, info, reset, quit'])
      setMessages(prev => [...prev, 'Global shortcuts: Ctrl+C (exit), Ctrl+H (help)'])
      return
    }
  })

  const handleSubmit = (command: string) => {
    // Echo the command back to the game pane with ">" prefix
    setMessages(prev => [...prev, `> ${command}`])
    
    // Handle game commands
    if (command.toLowerCase() === 'hello') {
      setMessages(prev => [...prev, 'Hello there, adventurer!'])
    } else if (command.toLowerCase() === 'look') {
      setMessages(prev => [...prev, 'You are standing in a dimly lit chamber with stone walls.'])
    } else if (command.toLowerCase() === 'help') {
      setMessages(prev => [...prev, 'Available commands: hello, look, help, status, info, reset, quit'])
      setMessages(prev => [...prev, 'Global shortcuts: Ctrl+C (exit), Ctrl+H (help)'])
    } else if (command.toLowerCase() === 'quit') {
      setMessages(prev => [...prev, 'Goodbye, adventurer!'])
      setTimeout(() => exit(), 1000) // Give time to see the message
    } else if (command.trim() && !['status', 'info', 'reset'].includes(command.toLowerCase())) {
      setMessages(prev => [...prev, `Unknown command: ${command}`])
    }

    // Handle status content updates
    if (command === 'status') {
      setStatusContent("Shadow Kingdom v1.0\nLocation: Starting Room\nHealth: 100/100")
    } else if (command === 'info') {
      setStatusContent("Shadow Kingdom v1.0\nPlayer: Adventure Seeker\nLocation: Entrance Hall\nItems: Iron Sword, Health Potion\nGold: 50")
    } else if (command === 'reset') {
      setStatusContent("Shadow Kingdom v1.0 - Ready (Use arrow keys for history)")
    }
  }

  const handleHistoryUpdate = (newHistory: string[]) => {
    setCommandHistory(newHistory)
  }

  // Calculate status height dynamically
  const statusHeight = useMemo(() => {
    return statusContent.split('\n').length
  }, [statusContent])

  // Calculate spacing to push bottom bars to the bottom
  const inputBarHeight = 3 // Input bar with borders
  const fixedBottomHeight = inputBarHeight + statusHeight
  const gameAreaHeight = Math.max(1, terminalSize.height - fixedBottomHeight)

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Game Pane - fills available height */}
      <Box height={gameAreaHeight} width="100%">
        <GamePane messages={messages} maxLines={Math.max(5, gameAreaHeight - 2)} />
      </Box>
      
      {/* Spacer to push bottom bars down */}
      <Box flexGrow={1} />
      
      {/* Bottom section - Input Bar and Status Pane */}
      <Box flexShrink={0} width="100%" flexDirection="column">
        <InputBar 
          onSubmit={handleSubmit}
          placeholder="Enter command..."
          commandHistory={commandHistory}
          onHistoryUpdate={handleHistoryUpdate}
        />
        <StatusPane status={statusContent} />
      </Box>
    </Box>
  )
}