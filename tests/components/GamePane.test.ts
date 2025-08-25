import React from 'react'
import { render } from 'ink-testing-library'
import { GamePane } from '../../src/components/GamePane'

describe('GamePane', () => {
  it('renders messages as individual Box components', () => {
    const messages = ['First message', 'Second message', 'Third message']
    const { lastFrame } = render(React.createElement(GamePane, { messages }))
    
    const output = lastFrame()
    expect(output).toContain('First message')
    expect(output).toContain('Second message')
    expect(output).toContain('Third message')
  })

  it('limits messages when maxLines is set', () => {
    const messages = [
      'Message 1',
      'Message 2',
      'Message 3',
      'Message 4',
      'Message 5',
      'Message 6'
    ]
    
    // maxLines=5 means 3 visible lines (5 - 2 padding)
    const { lastFrame } = render(React.createElement(GamePane, { 
      messages, 
      maxLines: 5 
    }))
    
    const output = lastFrame()
    // Should only show last 3 messages
    expect(output).not.toContain('Message 1')
    expect(output).not.toContain('Message 2')
    expect(output).not.toContain('Message 3')
    expect(output).toContain('Message 4')
    expect(output).toContain('Message 5')
    expect(output).toContain('Message 6')
  })

  it('shows all messages when maxLines is not set', () => {
    const messages = Array.from({ length: 10 }, (_, i) => `Message ${i + 1}`)
    const { lastFrame } = render(React.createElement(GamePane, { messages }))
    
    const output = lastFrame()
    messages.forEach(msg => {
      expect(output).toContain(msg)
    })
  })

  it('handles empty message array', () => {
    const { lastFrame } = render(React.createElement(GamePane, { messages: [] }))
    const output = lastFrame()
    expect(output).toBeDefined()
  })

  it('preserves message order', () => {
    const messages = ['First', 'Second', 'Third']
    const { lastFrame } = render(React.createElement(GamePane, { messages }))
    
    const output = lastFrame()
    if (!output) {
      throw new Error('No output from GamePane')
    }
    
    const firstIndex = output.indexOf('First')
    const secondIndex = output.indexOf('Second')
    const thirdIndex = output.indexOf('Third')
    
    expect(firstIndex).toBeLessThan(secondIndex)
    expect(secondIndex).toBeLessThan(thirdIndex)
  })
})