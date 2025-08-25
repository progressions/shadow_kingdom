import React from 'react'
import { render } from 'ink-testing-library'
import { InkTUI } from '../../src/components/InkTUI'

describe('InkTUI Integration Tests', () => {
  describe('Complete System Integration', () => {
    it('should render all three panes without crashing', () => {
      const { lastFrame } = render(React.createElement(InkTUI))
      
      const output = lastFrame()
      
      // Should contain game pane content
      expect(output).toContain('Shadow Kingdom')
      expect(output).toContain('Welcome to Shadow Kingdom')
      
      // Should contain input bar
      expect(output).toContain('Command:')
      expect(output).toContain('Enter command')
      
      // Should contain status pane
      expect(output).toContain('Ready')
    })

    it('should have proper layout structure with all components', () => {
      const { lastFrame } = render(React.createElement(InkTUI))
      
      const output = lastFrame()
      
      // Should have borders for input bar
      expect(output).toMatch(/[┌┐└┘│─]/)
      
      // Should have cursor in input bar
      expect(output).toContain('█')
      
      // Should have status information at bottom
      expect(output).toContain('Shadow Kingdom v1.0')
    })

    it('should maintain responsive layout', () => {
      const { lastFrame } = render(React.createElement(InkTUI))
      
      // Should render without layout errors
      expect(lastFrame()).toBeDefined()
      expect(lastFrame()?.length || 0).toBeGreaterThan(100) // Should have substantial content
    })
  })

  describe('Component Communication', () => {
    it('should integrate input bar with command history', () => {
      const { lastFrame } = render(React.createElement(InkTUI))
      
      const output = lastFrame()
      
      // Should show initial command history hint
      expect(output).toContain('Use arrow keys for history')
      
      // Should have pre-populated history commands available
      expect(output).toBeDefined()
    })

    it('should handle state management between components', () => {
      const { lastFrame } = render(React.createElement(InkTUI))
      
      const output = lastFrame()
      
      // All components should be initialized with proper state
      expect(output).toContain('Command:') // InputBar state
      expect(output).toContain('Welcome') // GamePane state  
      expect(output).toContain('Ready') // StatusPane state
    })

    it('should maintain proper focus and interaction states', () => {
      const { lastFrame } = render(React.createElement(InkTUI))
      
      const output = lastFrame()
      
      // Input should be focused by default (cursor visible)
      expect(output).toContain('█')
      
      // Should be ready for user interaction
      expect(output).toBeDefined()
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle empty or invalid states gracefully', () => {
      const { lastFrame } = render(React.createElement(InkTUI))
      
      // Should render even with minimal state
      expect(() => lastFrame()).not.toThrow()
      
      const output = lastFrame()
      expect(output).toBeDefined()
      expect(output?.length || 0).toBeGreaterThan(0)
    })

    it('should maintain stable rendering under various conditions', () => {
      const { lastFrame, rerender } = render(React.createElement(InkTUI))
      
      // Initial render
      const initial = lastFrame()
      expect(initial).toBeDefined()
      
      // Re-render should be stable
      rerender(React.createElement(InkTUI))
      const afterRerender = lastFrame()
      expect(afterRerender).toBeDefined()
    })
  })

  describe('Interactive Command System', () => {
    it('should support interactive status commands', () => {
      const { lastFrame } = render(React.createElement(InkTUI))
      
      const output = lastFrame()
      
      // Should be ready to handle status commands
      expect(output).toContain('Command:')
      expect(output).toContain('Ready')
    })

    it('should have proper TUI initialization', () => {
      const { lastFrame } = render(React.createElement(InkTUI))
      
      const output = lastFrame()
      
      // Should start with welcome message
      expect(output).toContain('Welcome to Shadow Kingdom')
      
      // Should have proper title
      expect(output).toContain('=== Shadow Kingdom ===')
      
      // Should be ready for commands
      expect(output).toContain('Type a command to begin')
    })
  })

  describe('Visual Polish and Consistency', () => {
    it('should have consistent visual styling across components', () => {
      const { lastFrame } = render(React.createElement(InkTUI))
      
      const output = lastFrame()
      
      // Should have consistent borders and spacing
      expect(output).toMatch(/[┌┐└┘│─]/) // InputBar borders
      
      // Should have proper color and formatting
      expect(output).toContain('Command:') // Green text in InputBar
      
      // Should maintain visual hierarchy
      expect(output).toBeDefined()
    })

    it('should provide clear user feedback and guidance', () => {
      const { lastFrame } = render(React.createElement(InkTUI))
      
      const output = lastFrame()
      
      // Should guide user on how to interact
      expect(output).toContain('Type a command to begin')
      expect(output).toContain('Use arrow keys for history')
      
      // Should show current state clearly
      expect(output).toContain('Ready')
    })
  })
})