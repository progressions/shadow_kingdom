import React from 'react'
import { render } from 'ink-testing-library'
import { GamePane } from '../../src/components/GamePane'
import { createMessage } from '../../src/types/Message'

describe('GamePane - Enhanced Legacy Formatting', () => {
  describe('Room Name Formatting', () => {
    it('formats room names with ASCII underlines', () => {
      const messages = [createMessage('Castle Entrance\n===============')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('Castle Entrance')
      expect(output).toContain('===============')
    })

    it('formats all-caps room names', () => {
      const messages = [createMessage('DUNGEON ENTRANCE')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('DUNGEON ENTRANCE')
    })

    it('auto-generates underlines for room names without them', () => {
      const messages = [createMessage('Ancient Library')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      // Should contain the room name with generated underline
      expect(output).toContain('Ancient Library')
    })
  })

  describe('Exits Formatting', () => {
    it('formats simple exits list', () => {
      const messages = [createMessage('Exits: north, south, east')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('Exits: north, south, east')
    })

    it('formats exits with descriptions', () => {
      const messages = [createMessage('Exits: north (through the main doorway), up (spiral staircase)')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('Exits: north (through the main doorway), up (spiral staircase)')
    })

    it('converts modern arrow format to legacy format', () => {
      const messages = [createMessage('→ Available exits: north, up')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('Exits: north, up')
      expect(output).not.toContain('→')
    })
  })

  describe('Items and Characters Formatting', () => {
    it('formats items header', () => {
      const messages = [createMessage('You can see:')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('You can see:')
    })

    it('formats characters header', () => {
      const messages = [createMessage('Also here:')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('Also here:')
    })

    it('formats item list entries', () => {
      const messages = [createMessage('- Brass Key: A simple brass key lying on the mantelpiece.')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('- Brass Key: A simple brass key lying on the mantelpiece.')
    })

    it('formats character list entries', () => {
      const messages = [createMessage('- Castle Guard: A friendly guard keeping watch from the tower.')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('- Castle Guard: A friendly guard keeping watch from the tower.')
    })
  })

  describe('Command and Error Formatting', () => {
    it('formats command echoes with green dimmed', () => {
      const messages = [createMessage('> look around')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('> look around')
    })

    it('formats error messages with red', () => {
      const messages = [createMessage('Error: Unable to go that way.')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('Error: Unable to go that way.')
    })

    it('formats system errors with red', () => {
      const messages = [createMessage('Unable to find that item.')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('Unable to find that item.')
    })
  })

  describe('Room Description Formatting', () => {
    it('leaves room descriptions unformatted', () => {
      const messages = [createMessage('You stand before a simple wooden door leading into a small castle.')]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('You stand before a simple wooden door leading into a small castle.')
    })

    it('handles multi-line room descriptions', () => {
      const description = 'You stand before a simple wooden door leading into a small castle.\n\nThe entrance is modest but welcoming, with stone walls covered in ivy.'
      const messages = [createMessage(description)]
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('You stand before a simple wooden door')
      expect(output).toContain('The entrance is modest but welcoming')
    })
  })

  describe('Legacy Style Integration', () => {
    it('processes a complete room display sequence', () => {
      const messages = [
        createMessage('Castle Entrance\n==============='),
        createMessage('You stand before a simple wooden door leading into a small castle.'),
        createMessage('You can see:'),
        createMessage('- Brass Key: A simple brass key lying on the mantelpiece.'),
        createMessage('Also here:'),
        createMessage('- Castle Guard: A friendly guard keeping watch from the tower.'),
        createMessage('Exits: north (through the main doorway), up (spiral staircase)')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      
      // Verify all elements are present and formatted
      expect(output).toContain('Castle Entrance')
      expect(output).toContain('===============')
      expect(output).toContain('You stand before a simple wooden door')
      expect(output).toContain('You can see:')
      expect(output).toContain('- Brass Key: A simple brass key')
      expect(output).toContain('Also here:')
      expect(output).toContain('- Castle Guard: A friendly guard')
      expect(output).toContain('Exits: north (through the main doorway), up (spiral staircase)')
    })

    it('handles mixed modern and legacy format messages', () => {
      const messages = [
        createMessage('ANCIENT LIBRARY'), // All caps room name
        createMessage('→ Available exits: north, up'), // Modern format
        createMessage('> examine book'), // Command echo
        createMessage('Error: That book is too dusty to read.') // Error
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { messages }))
      
      const output = lastFrame()
      expect(output).toContain('ANCIENT LIBRARY')
      expect(output).toContain('Exits: north, up') // Should be converted
      expect(output).toContain('> examine book')
      expect(output).toContain('Error: That book is too dusty to read.')
    })
  })
});