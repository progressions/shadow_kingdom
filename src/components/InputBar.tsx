import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'

interface InputBarProps {
  onSubmit: (command: string) => void
  placeholder: string
  commandHistory?: string[]
  onHistoryUpdate?: (history: string[]) => void
  isFocused?: boolean
}

export const InputBar: React.FC<InputBarProps> = ({ 
  onSubmit, 
  placeholder, 
  commandHistory = [], 
  onHistoryUpdate, 
  isFocused = true
}) => {
  const [value, setValue] = useState('')
  const [historyIndex, setHistoryIndex] = useState(commandHistory.length)
  const [currentInput, setCurrentInput] = useState('')

  // Complete input handling with history navigation
  useInput((input, key) => {
    if (!isFocused) return

    // Handle Enter key - submit
    if (key.return) {
      handleSubmit(value)
      return
    }

    // Handle up arrow for history navigation
    if (key.upArrow && commandHistory.length > 0) {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setValue(commandHistory[newIndex] || '')
      }
      return
    }

    // Handle down arrow for history navigation
    if (key.downArrow && commandHistory.length > 0) {
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setValue(commandHistory[newIndex] || '')
      } else if (historyIndex === commandHistory.length - 1) {
        setHistoryIndex(commandHistory.length)
        setValue(currentInput || '')
      }
      return
    }

    // Handle backspace and delete keys (multiple ways to detect them)
    // Different terminals send different codes for backspace:
    // - key.backspace: Ink's standard backspace detection
    // - key.delete: Ink's standard delete key detection
    // - \b (0x08): Ctrl+H or traditional backspace
    // - \u007f (0x7f): DEL character (common on Unix/macOS)
    // - \u0008: Another backspace variant
    if (key.backspace || key.delete || input === '\b' || input === '\u007f' || input === '\u0008') {
      setValue(prev => prev.length > 0 ? prev.slice(0, -1) : prev)
      // Reset to current input mode when editing
      if (historyIndex !== commandHistory.length) {
        setHistoryIndex(commandHistory.length)
      }
      return
    }

    // Handle regular character input (exclude backspace and control characters)
    if (input && !key.ctrl && !key.meta && input !== '\b' && input !== '\u007f' && input !== '\u0008') {
      setValue(prev => prev + input)
      // Reset to current input mode when typing
      if (historyIndex !== commandHistory.length) {
        setHistoryIndex(commandHistory.length)
      }
    }
  })

  // Update current input when typing (not from history)
  useEffect(() => {
    if (historyIndex === commandHistory.length) {
      setCurrentInput(value)
    }
  }, [value, historyIndex, commandHistory.length])

  const handleSubmit = (submittedValue: string) => {
    // Guard against undefined or null
    if (!submittedValue) {
      submittedValue = ''
    }
    const trimmedValue = submittedValue.trim()
    
    onSubmit(submittedValue)
    setValue('')
    setHistoryIndex(commandHistory.length + 1)
    setCurrentInput('')

    // Add to history if not empty and not duplicate of last command
    if (trimmedValue && onHistoryUpdate) {
      const lastCommand = commandHistory[commandHistory.length - 1]
      if (trimmedValue !== lastCommand) {
        const newHistory = [...commandHistory, trimmedValue]
        onHistoryUpdate(newHistory)
      }
    }
  }

  // Update history index when command history changes
  useEffect(() => {
    setHistoryIndex(commandHistory.length)
  }, [commandHistory.length])

  return (
    <Box 
      borderStyle="single" 
      borderColor="white"
      paddingX={1}
      width="100%"
    >
      <Text color="green">Command: </Text>
      <Text>
        {value || (
          <Text color="gray">{placeholder}</Text>
        )}
        {isFocused && <Text color="white">█</Text>}
      </Text>
    </Box>
  )
}