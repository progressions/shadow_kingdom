import React from 'react'
import { render } from 'ink-testing-library'
import { GamePane } from '../../src/components/GamePane'
import { createMessage } from '../../src/types/Message'

describe('GamePane', () => {
  it('renders messages as individual Box components', () => {
    const messages = [
      createMessage('First message'),
      createMessage('Second message'),
      createMessage('Third message')
    ]
    const { lastFrame } = render(React.createElement(GamePane, { messages }))
    
    const output = lastFrame()
    expect(output).toContain('First message')
    expect(output).toContain('Second message')
    expect(output).toContain('Third message')
  })

  it('limits messages when maxLines is set', () => {
    const messages = [
      createMessage('Message 1'),
      createMessage('Message 2'),
      createMessage('Message 3'),
      createMessage('Message 4'),
      createMessage('Message 5'),
      createMessage('Message 6')
    ]
    
    // maxLines=5 means 5 visible lines (no padding subtraction)
    const { lastFrame } = render(React.createElement(GamePane, { 
      messages, 
      maxLines: 5 
    }))
    
    const output = lastFrame()
    // Should only show last 5 messages
    expect(output).not.toContain('Message 1')
    expect(output).toContain('Message 2')
    expect(output).toContain('Message 3')
    expect(output).toContain('Message 4')
    expect(output).toContain('Message 5')
    expect(output).toContain('Message 6')
  })

  it('shows all messages when maxLines is not set', () => {
    const messages = Array.from({ length: 10 }, (_, i) => createMessage(`Message ${i + 1}`))
    const { lastFrame } = render(React.createElement(GamePane, { messages }))
    
    const output = lastFrame()
    messages.forEach(msg => {
      expect(output).toContain(msg.content)
    })
  })

  it('handles empty message array', () => {
    const { lastFrame } = render(React.createElement(GamePane, { messages: [] }))
    const output = lastFrame()
    expect(output).toBeDefined()
  })

  it('preserves message order', () => {
    const messages = ['First', 'Second', 'Third'].map(content => createMessage(content))
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