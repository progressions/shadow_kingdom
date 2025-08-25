import React, { useState } from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

interface InputBarProps {
  onSubmit: (command: string) => void
  placeholder: string
}

export const InputBar: React.FC<InputBarProps> = ({ onSubmit, placeholder }) => {
  const [value, setValue] = useState('')

  const handleSubmit = (submittedValue: string) => {
    onSubmit(submittedValue)
    setValue('')
  }

  return (
    <Box 
      borderStyle="single" 
      borderColor="white"
      paddingX={1}
      width="100%"
    >
      <Text color="green">Command: </Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        onChange={setValue}
        onSubmit={handleSubmit}
      />
    </Box>
  )
}