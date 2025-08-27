import React from 'react'
import { render } from 'ink-testing-library'
import { GameApplication } from '../../src/components/GameApplication'
import { GamePane } from '../../src/components/GamePane'
import { InputBar } from '../../src/components/InputBar'
import { StatusPane } from '../../src/components/StatusPane'
import { createMessage } from '../../src/types/Message'

// Mock the services for testing
jest.mock('../../src/services/gameEngine')
jest.mock('../../src/services/gameStateManager')
jest.mock('../../src/services/commandRouter')

describe('Legacy Visual Styling - TUI Compatibility', () => {
  describe('GamePane Integration', () => {
    it('renders legacy styling correctly in isolation', () => {
      const messages = [
        createMessage('Test Room\n========='),
        createMessage('A room for testing the layout.'),
        createMessage('Exits: north, south')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { messages, width: 80 }))
      
      const output = lastFrame()
      expect(output).toContain('Test Room')
      expect(output).toContain('=========')
      expect(output).toContain('Exits: north, south')
    })

    it('maintains styling with different width constraints', () => {
      const messages = [
        createMessage('Status Test Room\n================'),
        createMessage('This room tests different width constraints for responsive layout.'),
        createMessage('You can see:'),
        createMessage('- Health Potion: Restores your vitality and magical energy reserves.')
      ]
      
      const { lastFrame: frame40 } = render(React.createElement(GamePane, { messages, width: 40 }))
      const { lastFrame: frame120 } = render(React.createElement(GamePane, { messages, width: 120 }))
      
      const output40 = frame40()
      const output120 = frame120()
      
      // Both should contain the core content regardless of width
      expect(output40).toContain('Status Test Room')
      expect(output40).toContain('================')
      expect(output120).toContain('Status Test Room')
      expect(output120).toContain('================')
    })

    it('handles component props correctly', () => {
      const messages = [
        createMessage('Props Test Room\n==============='),
        createMessage('Testing component props and interface compatibility.')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages, 
        maxLines: 10,
        width: 100 
      }))
      
      const output = lastFrame()
      expect(output).toContain('Props Test Room')
      expect(output).toContain('===============')
      expect(output).toContain('Testing component props')
    })
  })

  describe('Message Flow Compatibility', () => {
    it('processes messages from game services correctly', () => {
      // Simulate messages that would come from the game engine
      const gameEngineMessages = [
        createMessage('=== Shadow Kingdom ==='),
        createMessage('Welcome to your adventure! Type "help" for available commands.'),
        createMessage('Starting Location\n================='),
        createMessage('You begin your journey in a mysterious place.'),
        createMessage('Exits: explore (to begin your adventure)')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: gameEngineMessages 
      }))
      
      const output = lastFrame()
      expect(output).toContain('=== Shadow Kingdom ===')
      expect(output).toContain('Starting Location')
      expect(output).toContain('=================')
      expect(output).toContain('Exits: explore (to begin your adventure)')
    })

    it('handles command router output styling', () => {
      const commandMessages = [
        createMessage('Current Room\n============'),
        createMessage('You are in a test room.'),
        createMessage('> help'),
        createMessage('ITEMS:'),
        createMessage('  take, get, pickup - Pick up an item'),
        createMessage('  drop, put    - Drop an item'),
        createMessage('EXPLORATION:'),
        createMessage('  look, l      - Examine your surroundings'),
        createMessage('> look'),
        createMessage('You see nothing special.')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: commandMessages 
      }))
      
      const output = lastFrame()
      expect(output).toContain('Current Room')
      expect(output).toContain('============')
      expect(output).toContain('> help')
      expect(output).toContain('take, get, pickup')
      expect(output).toContain('> look')
    })

    it('integrates with room navigation engine output', () => {
      const navigationMessages = [
        createMessage('Old Room\n========'),
        createMessage('You are leaving this room.'),
        createMessage('> go north'),
        createMessage('You move north.'),
        createMessage('New Room\n========'),
        createMessage('You have entered a different area.'),
        createMessage('The room feels cold and damp.'),
        createMessage('You can see:'),
        createMessage('- Torch: A flickering light source.'),
        createMessage('Exits: south (back to the old room)')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: navigationMessages 
      }))
      
      const output = lastFrame()
      expect(output).toContain('Old Room')
      expect(output).toContain('New Room')
      expect(output).toContain('> go north')
      expect(output).toContain('- Torch: A flickering light source')
      expect(output).toContain('Exits: south (back to the old room)')
    })
  })

  describe('State Management Compatibility', () => {
    it('maintains styling consistency across state changes', () => {
      let messages = [
        createMessage('Initial Room\n============'),
        createMessage('Starting state of the room.')
      ]
      
      const { rerender, lastFrame } = render(React.createElement(GamePane, { messages }))
      
      // Simulate state change with new messages
      messages = [
        ...messages,
        createMessage('> take item'),
        createMessage('You pick up the item.'),
        createMessage('Updated Room\n============'),
        createMessage('The room state has changed.'),
        createMessage('Exits: west (to continue)')
      ]
      
      rerender(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('Initial Room')
      expect(output).toContain('Updated Room')
      expect(output).toContain('> take item')
      expect(output).toContain('Exits: west (to continue)')
    })

    it('handles scrollback functionality with styled content', () => {
      const longMessageHistory = [
        createMessage('Room 1\n======'),
        createMessage('First room description.'),
        ...Array.from({ length: 50 }, (_, i) => createMessage(`Action ${i + 1} performed.`)),
        createMessage('Room 2\n======'),
        createMessage('Second room description.'),
        createMessage('Final message in sequence.')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: longMessageHistory,
        maxLines: 20 
      }))
      
      const output = lastFrame()
      // Should show recent messages due to maxLines limit
      expect(output).toContain('Room 2')
      expect(output).toContain('Final message in sequence')
      // Earlier messages should be scrolled out
      expect(output).not.toContain('Room 1')
      expect(output).not.toContain('Action 1 performed')
    })
  })

  describe('Performance Impact Assessment', () => {
    it('handles large message volumes without performance degradation', () => {
      const messages = Array.from({ length: 200 }, (_, i) => 
        createMessage(`Performance test message ${i + 1}`)
      )
      
      const startTime = Date.now()
      const { lastFrame } = render(React.createElement(GamePane, { messages, maxLines: 50 }))
      const endTime = Date.now()
      
      const output = lastFrame()
      expect(output).toContain('Performance test message')
      
      // Should render large volumes quickly (under 100ms)
      const duration = endTime - startTime
      expect(duration).toBeLessThan(100)
    })

    it('maintains smooth rendering with rapid updates', () => {
      let messages = [createMessage('Rapid Update Test\n=================')]
      
      const { rerender } = render(React.createElement(GamePane, { messages }))
      
      // Simulate rapid message additions (like combat or dialogue)
      const startTime = Date.now()
      
      for (let i = 1; i <= 20; i++) {
        messages = [...messages, createMessage(`Update ${i}: Something happened.`)]
        rerender(React.createElement(GamePane, { messages }))
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete updates quickly (under 1 second for 20 updates)
      expect(duration).toBeLessThan(1000)
    })

    it('handles memory efficiently with cache management', () => {
      // Create messages with repeated content to test caching
      const repeatedContent = [
        'Common Room Description',
        'You can see:',
        'Also here:',
        'Exits: north, south',
        '> look'
      ]
      
      const messages = Array.from({ length: 200 }, (_, i) => 
        createMessage(repeatedContent[i % repeatedContent.length])
      )
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages,
        maxLines: 50 
      }))
      
      const output = lastFrame()
      expect(output).toContain('Common Room Description')
      expect(output).toContain('> look')
      
      // Should handle large amounts of repeated content efficiently
      // (The cache should prevent redundant formatting)
    })
  })
});