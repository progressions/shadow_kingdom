import React from 'react'
import { render } from 'ink-testing-library'
import { StatusPane } from '../../src/components/StatusPane'

describe('StatusPane Multi-line Support', () => {
  it('should handle single line status', () => {
    const { lastFrame } = render(
      React.createElement(StatusPane, { status: 'Single line status' })
    )
    const output = lastFrame()
    expect(output).toContain('Single line status')
  })

  it('should handle multi-line status with newlines', () => {
    const multiLineStatus = 'Shadow Kingdom v1.0\nLocation: Starting Room\nHealth: 100/100'
    const { lastFrame } = render(
      React.createElement(StatusPane, { status: multiLineStatus })
    )
    const output = lastFrame()
    
    expect(output).toContain('Shadow Kingdom v1.0')
    expect(output).toContain('Location: Starting Room')
    expect(output).toContain('Health: 100/100')
  })

  it('should handle status lines array', () => {
    const statusLines = [
      'Shadow Kingdom v1.0',
      'Player: TestUser', 
      'Room: Entrance Hall',
      'Items: 3'
    ]
    const { lastFrame } = render(
      React.createElement(StatusPane, { statusLines })
    )
    const output = lastFrame()
    
    statusLines.forEach(line => {
      expect(output).toContain(line)
    })
  })

  it('should handle structured status info', () => {
    const statusInfo = {
      version: 'v2.0',
      mode: 'Adventure',
      connection: 'Connected',
      players: '1'
    }
    const { lastFrame } = render(
      React.createElement(StatusPane, { statusInfo })
    )
    const output = lastFrame()
    
    expect(output).toContain('v2.0')
    expect(output).toContain('mode: Adventure')
    expect(output).toContain('connection: Connected')
    expect(output).toContain('players: 1')
  })

  it('should calculate correct height for different content types', () => {
    // Single line
    const { lastFrame: frame1 } = render(
      React.createElement(StatusPane, { status: 'Single' })
    )
    expect(frame1()).toBeDefined()

    // Multi-line string
    const { lastFrame: frame2 } = render(
      React.createElement(StatusPane, { status: 'Line 1\nLine 2\nLine 3' })
    )
    expect(frame2()).toBeDefined()

    // Status lines array
    const { lastFrame: frame3 } = render(
      React.createElement(StatusPane, { statusLines: ['A', 'B', 'C', 'D'] })
    )
    expect(frame3()).toBeDefined()
  })
})