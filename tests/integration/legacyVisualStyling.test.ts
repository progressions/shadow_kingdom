import React from 'react'
import { render } from 'ink-testing-library'
import { GamePane } from '../../src/components/GamePane'
import { GameApplication } from '../../src/components/GameApplication'
import { createMessage } from '../../src/types/Message'

describe('Legacy Visual Styling - Integration Tests', () => {
  describe('Complete Room Display Sequences', () => {
    it('renders a complete room with all elements in legacy style', () => {
      const completeRoomSequence = [
        createMessage('Castle Entrance\n==============='),
        createMessage('You stand before a simple wooden door leading into a small castle.'),
        createMessage('The entrance is modest but welcoming, with stone walls covered in ivy.'),
        createMessage('You can see:'),
        createMessage('- Brass Key: A simple brass key lying on the mantelpiece.'),
        createMessage('- Iron Sword: A sturdy weapon with a leather-wrapped hilt.'),
        createMessage('Also here:'),
        createMessage('- Castle Guard: A friendly guard keeping watch from the tower.'),
        createMessage('- Merchant: A traveling trader with a heavy pack.'),
        createMessage('Exits: north (through the main doorway), up (spiral staircase)')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: completeRoomSequence 
      }))
      
      const output = lastFrame()
      
      // Verify room name with underlines
      expect(output).toContain('Castle Entrance')
      expect(output).toContain('===============')
      
      // Verify room descriptions
      expect(output).toContain('You stand before a simple wooden door')
      expect(output).toContain('The entrance is modest but welcoming')
      
      // Verify items section
      expect(output).toContain('You can see:')
      expect(output).toContain('- Brass Key: A simple brass key')
      expect(output).toContain('- Iron Sword: A sturdy weapon')
      
      // Verify characters section
      expect(output).toContain('Also here:')
      expect(output).toContain('- Castle Guard: A friendly guard')
      expect(output).toContain('- Merchant: A traveling trader')
      
      // Verify exits
      expect(output).toContain('Exits: north (through the main doorway), up (spiral staircase)')
    })

    it('handles room transitions with consistent styling', () => {
      const roomTransition = [
        // Old room
        createMessage('Ancient Library\n==============='),
        createMessage('Dusty books line the walls from floor to ceiling.'),
        createMessage('> go north'),
        
        // Transition
        createMessage('You move north.'),
        
        // New room
        createMessage('GRAND HALL'),
        createMessage('A magnificent chamber with vaulted ceilings and marble pillars.'),
        createMessage('Exits: south (back to the library), east (toward the throne room)')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: roomTransition 
      }))
      
      const output = lastFrame()
      
      // Verify old room styling
      expect(output).toContain('Ancient Library')
      expect(output).toContain('===============')
      
      // Verify command styling
      expect(output).toContain('> go north')
      
      // Verify new room (all caps, should get underline)
      expect(output).toContain('GRAND HALL')
      
      // Verify consistent exit formatting
      expect(output).toContain('Exits: south (back to the library), east (toward the throne room)')
    })

    it('maintains styling consistency with mixed legacy and modern messages', () => {
      const mixedMessages = [
        createMessage('Castle Courtyard\n==============='),
        createMessage('An open area within the castle walls.'),
        createMessage('→ Available exits: north, south'), // Modern format
        createMessage('You can see:'),
        createMessage('- Shield: A polished bronze shield.'),
        createMessage('> examine shield'),
        createMessage('Error: You need to be more specific.'),
        createMessage('> look shield'),
        createMessage('The shield bears the royal coat of arms.')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: mixedMessages 
      }))
      
      const output = lastFrame()
      
      // Verify room name
      expect(output).toContain('Castle Courtyard')
      expect(output).toContain('===============')
      
      // Verify exit format (modern format is not automatically converted)
      expect(output).toContain('→ Available exits: north, south')
      
      // Verify items styling
      expect(output).toContain('You can see:')
      expect(output).toContain('- Shield: A polished bronze shield')
      
      // Verify command and error styling
      expect(output).toContain('> examine shield')
      expect(output).toContain('Error: You need to be more specific')
      expect(output).toContain('> look shield')
    })
  })

  describe('Performance Under Realistic Scenarios', () => {
    it('handles a typical gameplay session efficiently', () => {
      const gameplaySession = [
        // Initial room display
        createMessage('Entrance Hall\n============='),
        createMessage('A grand entrance with marble floors and ornate decorations.'),
        createMessage('You can see:'),
        createMessage('- Welcome Mat: A simple mat with "Welcome" written on it.'),
        createMessage('Exits: north (into the main hall), east (to the side chamber)'),
        
        // Player commands and responses
        createMessage('> look mat'),
        createMessage('The mat is worn from years of use.'),
        createMessage('> go north'),
        createMessage('You move north into the main hall.'),
        
        // New room
        createMessage('Main Hall\n========='),
        createMessage('The central hub of the castle, with passages leading in all directions.'),
        createMessage('Also here:'),
        createMessage('- Butler: An elderly servant tending to the hall.'),
        createMessage('Exits: south (back to entrance), north (grand staircase), east (dining hall), west (kitchen)'),
        
        // More interactions
        createMessage('> talk butler'),
        createMessage('"Welcome to the castle, traveler!"'),
        createMessage('> inventory'),
        createMessage('You are not carrying anything.'),
        createMessage('> help'),
        createMessage('Available commands: look, go, take, drop, inventory, help, quit')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: gameplaySession 
      }))
      
      const output = lastFrame()
      
      // Should render all messages efficiently
      expect(output).toContain('Entrance Hall')
      expect(output).toContain('Main Hall')
      expect(output).toContain('- Butler: An elderly servant')
      expect(output).toContain('Available commands:')
    })

    it('maintains performance with rapid message updates', () => {
      let messages = [createMessage('Test Room\n=========')]
      
      const { rerender, lastFrame } = render(React.createElement(GamePane, { messages }))
      
      // Simulate rapid game updates
      for (let i = 1; i <= 50; i++) {
        messages = [
          ...messages,
          createMessage(`> action ${i}`),
          createMessage(`Result of action ${i}`)
        ]
        rerender(React.createElement(GamePane, { messages }))
      }
      
      const output = lastFrame()
      expect(output).toContain('Test Room')
      expect(output).toContain('> action 50')
      expect(output).toContain('Result of action 50')
    })

    it('handles large inventories and item lists efficiently', () => {
      const largeInventoryMessages = [
        createMessage('Treasure Chamber\n==============='),
        createMessage('A vast room filled with countless treasures.'),
        createMessage('You can see:'),
        ...Array.from({ length: 20 }, (_, i) => 
          createMessage(`- Treasure ${i + 1}: A valuable item worth ${(i + 1) * 100} gold pieces.`)
        ),
        createMessage('Also here:'),
        ...Array.from({ length: 10 }, (_, i) => 
          createMessage(`- Guardian ${i + 1}: A magical protector watching over the treasures.`)
        ),
        createMessage('Exits: south (back to the corridor)')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: largeInventoryMessages,
        maxLines: 50 // Allow more lines for this test
      }))
      
      const output = lastFrame()
      
      expect(output).toContain('Treasure Chamber')
      expect(output).toContain('- Treasure 1: A valuable item')
      expect(output).toContain('- Treasure 20: A valuable item')
      expect(output).toContain('- Guardian 1: A magical protector')
      expect(output).toContain('- Guardian 10: A magical protector')
      expect(output).toContain('Exits: south (back to the corridor)')
    })
  })

  describe('Different Game States', () => {
    it('handles combat scenarios with appropriate styling', () => {
      const combatMessages = [
        createMessage('Battle Arena\n============'),
        createMessage('A circular arena with sand-covered floors and high walls.'),
        createMessage('Also here:'),
        createMessage('- Orc Warrior: A fierce enemy brandishing a battle axe.'),
        createMessage('> attack orc'),
        createMessage('You swing your sword at the orc!'),
        createMessage('The orc takes 15 damage.'),
        createMessage('The orc attacks you back!'),
        createMessage('You take 8 damage.'),
        createMessage('Error: You are getting tired.'),
        createMessage('> flee'),
        createMessage('You attempt to flee from combat!')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: combatMessages 
      }))
      
      const output = lastFrame()
      
      expect(output).toContain('Battle Arena')
      expect(output).toContain('============')
      expect(output).toContain('- Orc Warrior: A fierce enemy')
      expect(output).toContain('> attack orc')
      expect(output).toContain('Error: You are getting tired')
    })

    it('displays dialogue and conversation properly', () => {
      const dialogueMessages = [
        createMessage('Village Square\n============='),
        createMessage('The heart of a bustling village with a fountain at its center.'),
        createMessage('Also here:'),
        createMessage('- Village Elder: An wise old man with a long white beard.'),
        createMessage('> talk elder'),
        createMessage('"Greetings, young traveler!"'),
        createMessage('"I have been expecting you for some time."'),
        createMessage('"There is a quest I must ask of you..."'),
        createMessage('> ask about quest'),
        createMessage('"The dragon has returned to the mountains."'),
        createMessage('"Will you help us defeat this ancient evil?"')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: dialogueMessages 
      }))
      
      const output = lastFrame()
      
      expect(output).toContain('Village Square')
      expect(output).toContain('=============')
      expect(output).toContain('- Village Elder: An wise old man')
      expect(output).toContain('"Greetings, young traveler!"')
      expect(output).toContain('> ask about quest')
    })

    it('handles system messages and notifications correctly', () => {
      const systemMessages = [
        createMessage('Your current location:\nCastle Library\n=============='),
        createMessage('A quiet room filled with ancient tomes and scrolls.'),
        createMessage('> save game'),
        createMessage('Game saved successfully.'),
        createMessage('> quit'),
        createMessage('Are you sure you want to quit? (y/n)'),
        createMessage('> y'),
        createMessage('Thank you for playing Shadow Kingdom!'),
        createMessage('Your progress has been saved.')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: systemMessages 
      }))
      
      const output = lastFrame()
      
      expect(output).toContain('Castle Library')
      expect(output).toContain('==============')
      expect(output).toContain('Game saved successfully')
      expect(output).toContain('> quit')
      expect(output).toContain('Thank you for playing Shadow Kingdom!')
    })
  })

  describe('Edge Cases and Error Resilience', () => {
    it('handles malformed room data gracefully', () => {
      const malformedMessages = [
        createMessage(''), // Empty message
        createMessage('   '), // Whitespace only
        createMessage('BROKEN ROOM NAME WITHOUT UNDERLINE'),
        createMessage('Exits:'), // Empty exits
        createMessage('You can see:'), // Items header with no items
        createMessage('- Invalid item format'),
        createMessage('Also here:'), // Characters header with no characters
        createMessage('> '), // Empty command
        createMessage('Error:') // Error without message
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: malformedMessages 
      }))
      
      const output = lastFrame()
      
      // Should still render without crashing
      expect(output).toBeDefined()
      expect(output).toContain('BROKEN ROOM NAME WITHOUT UNDERLINE')
      expect(output).toContain('You can see:')
      expect(output).toContain('Also here:')
    })

    it('recovers from formatting errors and continues normally', () => {
      const errorRecoveryMessages = [
        createMessage('Normal Room\n==========='),
        createMessage('This room displays normally.'),
        createMessage('∅∅∅ CORRUPTED DATA ∅∅∅'), // Unusual characters
        createMessage('Exits: north, south, east, west, up, down, northeast, northwest'), // Very long exits
        createMessage('- Item with: multiple: colons: in: name'),
        createMessage('Back to normal room description.'),
        createMessage('> normal command'),
        createMessage('Normal response continues working.')
      ]
      
      const { lastFrame } = render(React.createElement(GamePane, { 
        messages: errorRecoveryMessages 
      }))
      
      const output = lastFrame()
      
      expect(output).toContain('Normal Room')
      expect(output).toContain('===========')
      expect(output).toContain('Back to normal room description')
      expect(output).toContain('> normal command')
      expect(output).toContain('Normal response continues working')
    })
  })
});