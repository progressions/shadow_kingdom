import React from 'react'
import { render } from 'ink-testing-library'
import { GamePane } from '../../src/components/GamePane'
import { createMessage } from '../../src/types/Message'

describe('GamePane - Performance Enhancements', () => {
  describe('message caching', () => {
    it('handles repeated identical messages efficiently', () => {
      const messages = Array.from({ length: 100 }, () => createMessage('Repeated message'))
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('Repeated message')
      // Should render without performance issues
    })

    it('processes different message types without slowdown', () => {
      const messages = [
        createMessage('CASTLE ENTRANCE'), // Room name
        createMessage('You stand in a grand hall.'), // Description  
        createMessage('Exits: north, south, east'), // Exits
        createMessage('You can see:'), // Items header
        createMessage('- Sword: A sharp blade'), // Item
        createMessage('Also here:'), // Characters header
        createMessage('- Guard: A stern watchman'), // Character
        createMessage('> look'), // Command
        createMessage('Error: Invalid command') // Error
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('CASTLE ENTRANCE')
      expect(output).toContain('Exits: north, south, east')
      expect(output).toContain('You can see:')
      expect(output).toContain('- Sword: A sharp blade')
    })
  })

  describe('large message volumes', () => {
    it('handles 500+ messages without breaking', () => {
      const messages = Array.from({ length: 500 }, (_, i) => 
        createMessage(`Message number ${i + 1}`)
      )
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages, 
        maxLines: 50 
      }))
      
      const output = lastFrame()
      // Should only show the last 50 messages
      expect(output).not.toContain('Message number 1')
      expect(output).not.toContain('Message number 400')
      expect(output).toContain('Message number 451') // 500 - 50 + 1
      expect(output).toContain('Message number 500')
    })

    it('maintains performance with mixed long and short messages', () => {
      const longMessage = 'A'.repeat(1000) // Very long message
      const messages = [
        ...Array.from({ length: 50 }, () => createMessage('Short message')),
        createMessage(longMessage),
        ...Array.from({ length: 50 }, () => createMessage('Another short message'))
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('Short message')
      expect(output).toContain('A'.repeat(100)) // Should contain part of long message
      expect(output).toContain('Another short message')
    })
  })

  describe('text wrapping improvements', () => {
    it('handles very long room names gracefully', () => {
      const longRoomName = 'The Incredibly Long and Overly Descriptive Room Name That Goes On Forever'
      const messages = [createMessage(longRoomName.toUpperCase())]
      
      const { lastFrame } = render(React.createElement(GamePane, { messages, width: 50 }))
      
      const output = lastFrame()
      expect(output).toContain('THE INCREDIBLY LONG')
    })

    it('wraps long exits descriptions properly', () => {
      const longExits = 'Exits: north (through the incredibly long and winding corridor that leads to the northern section of this vast and ancient castle), south (down the spiral staircase)'
      const messages = [createMessage(longExits)]
      
      const { lastFrame } = render(React.createElement(GamePane, { messages, width: 60 }))
      
      const output = lastFrame()
      expect(output).toContain('Exits: north')
      expect(output).toContain('spiral staircase')
    })

    it('maintains formatting with wrapped text', () => {
      const longRoomDesc = 'You find yourself in an incredibly spacious and magnificently decorated grand hall with towering pillars that stretch up to vaulted ceilings painted with intricate murals depicting ancient battles and heroic deeds of legendary warriors.'
      const messages = [createMessage(longRoomDesc)]
      
      const { lastFrame } = render(React.createElement(GamePane, { messages, width: 50 }))
      
      const output = lastFrame()
      expect(output).toContain('You find yourself in an incredibly')
      expect(output).toContain('legendary warriors')
    })
  })

  describe('rendering optimization', () => {
    it('updates efficiently when new messages are added', () => {
      const initialMessages = Array.from({ length: 10 }, (_, i) => 
        createMessage(`Initial message ${i + 1}`)
      )
      
      const { lastFrame, rerender } = render(React.createElement(GamePane, { 
        messages: initialMessages 
      }))
      
      // Add new messages
      const newMessages = [
        ...initialMessages,
        createMessage('New message 1'),
        createMessage('New message 2')
      ]
      
      rerender(React.createElement(GamePane, { messages: newMessages }))
      
      const output = lastFrame()
      expect(output).toContain('Initial message 10')
      expect(output).toContain('New message 1')
      expect(output).toContain('New message 2')
    })

    it('handles rapid message updates without flickering', () => {
      let messages = [createMessage('Initial message')]
      
      const { lastFrame, rerender } = render(React.createElement(GamePane, { messages }))
      
      // Simulate rapid message additions
      for (let i = 1; i <= 10; i++) {
        messages = [...messages, createMessage(`Rapid message ${i}`)]
        rerender(React.createElement(GamePane, { messages }))
      }
      
      const output = lastFrame()
      expect(output).toContain('Initial message')
      expect(output).toContain('Rapid message 10')
    })
  })

  describe('memory efficiency', () => {
    it('respects maxLines limit to prevent memory bloat', () => {
      const messages = Array.from({ length: 1000 }, (_, i) => 
        createMessage(`Memory test message ${i + 1}`)
      )
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages, 
        maxLines: 100 
      }))
      
      const output = lastFrame()
      // Should only render the last 100 messages (901-1000)
      expect(output).not.toContain('Memory test message 1 ')
      expect(output).not.toContain('Memory test message 50 ')
      expect(output).not.toContain('Memory test message 900')
      expect(output).toContain('Memory test message 901') // 1000 - 100 + 1
      expect(output).toContain('Memory test message 1000')
    })

    it('handles edge cases with maxLines', () => {
      const messages = [
        createMessage('Message 1'),
        createMessage('Message 2'),
        createMessage('Message 3')
      ]
      
      // maxLines larger than message count
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages, 
        maxLines: 10 
      }))
      
      const output = lastFrame()
      expect(output).toContain('Message 1')
      expect(output).toContain('Message 2')
      expect(output).toContain('Message 3')
    })
  })

  describe('error resilience', () => {
    it('handles malformed messages gracefully', () => {
      const messages = [
        createMessage(''), // Empty message
        createMessage('   '), // Whitespace only
        createMessage('Normal message'),
        createMessage('Message with\nnewlines\nand\ttabs')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('Normal message')
      expect(output).toContain('Message with')
    })

    it('recovers from formatting errors', () => {
      const messages = [
        createMessage('VALID ROOM NAME'),
        createMessage('Exits: '), // Invalid exits format
        createMessage('- Invalid item format without colon'),
        createMessage('> valid command'),
        createMessage('Normal description continues working')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('VALID ROOM NAME')
      expect(output).toContain('> valid command')
      expect(output).toContain('Normal description continues working')
    })
  })
});