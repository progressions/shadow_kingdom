import React from 'react'
import { render } from 'ink-testing-library'
import { GamePane } from '../../src/components/GamePane'
import { InkTUI } from '../../src/components/InkTUI'

describe('TUI Performance Tests', () => {
  describe('GamePane Performance', () => {
    it('should handle large message history efficiently', () => {
      const startTime = performance.now()
      
      // Create a large number of messages (simulate long gameplay)
      const largeMessageArray = Array.from({ length: 1000 }, (_, i) => `Message ${i + 1}`)
      
      const { lastFrame } = render(
        React.createElement(GamePane, {
          messages: largeMessageArray,
          maxLines: 20
        })
      )
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render efficiently (less than 100ms for 1000 messages)
      expect(renderTime).toBeLessThan(100)
      
      // Should still show content
      const output = lastFrame()
      expect(output).toBeDefined()
      expect(output).toContain('Shadow Kingdom')
    })

    it('should properly limit displayed messages for performance', () => {
      const hugeMessageArray = Array.from({ length: 5000 }, (_, i) => `Huge message ${i + 1}`)
      
      const { lastFrame } = render(
        React.createElement(GamePane, {
          messages: hugeMessageArray,
          maxLines: 10
        })
      )
      
      const output = lastFrame()
      expect(output).toBeDefined()
      
      // Should not contain early messages (they should be trimmed)
      expect(output).not.toContain('Huge message 1')
      expect(output).not.toContain('Huge message 100')
      
      // Should contain recent messages
      expect(output).toContain('Huge message 5000')
    })

    it('should maintain performance with mixed content types', () => {
      const mixedMessages = [
        ...Array.from({ length: 200 }, (_, i) => `> command ${i + 1}`),
        ...Array.from({ length: 300 }, (_, i) => `Response message ${i + 1}`),
        ...Array.from({ length: 100 }, (_, i) => `System message ${i + 1}`)
      ]
      
      const startTime = performance.now()
      
      const { lastFrame } = render(
        React.createElement(GamePane, {
          messages: mixedMessages,
          maxLines: 25
        })
      )
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      expect(renderTime).toBeLessThan(50) // Should be very fast
      expect(lastFrame()).toBeDefined()
    })
  })

  describe('Complete TUI Performance', () => {
    it('should initialize quickly', () => {
      const startTime = performance.now()
      
      const { lastFrame } = render(React.createElement(InkTUI))
      
      const endTime = performance.now()
      const initTime = endTime - startTime
      
      // Should initialize in under 100ms
      expect(initTime).toBeLessThan(100)
      
      // Should be fully functional
      const output = lastFrame()
      expect(output).toContain('Shadow Kingdom')
      expect(output).toContain('Command:')
      expect(output).toContain('Ready')
    })

    it('should maintain responsive performance during re-renders', () => {
      const { lastFrame, rerender } = render(React.createElement(InkTUI))
      
      // Initial render
      expect(lastFrame()).toBeDefined()
      
      // Multiple re-renders should be fast
      const startTime = performance.now()
      
      for (let i = 0; i < 10; i++) {
        rerender(React.createElement(InkTUI))
      }
      
      const endTime = performance.now()
      const rerenderTime = endTime - startTime
      
      // 10 re-renders should complete in under 100ms
      expect(rerenderTime).toBeLessThan(100)
      expect(lastFrame()).toBeDefined()
    })
  })

  describe('Memory Usage Validation', () => {
    it('should not accumulate excessive data structures', () => {
      // This test validates that our components properly limit data growth
      const { lastFrame } = render(React.createElement(InkTUI))
      
      const output = lastFrame()
      
      // Should render successfully without memory issues
      expect(output).toBeDefined()
      expect(typeof output).toBe('string')
      expect(output?.length || 0).toBeGreaterThan(0)
      expect(output?.length || 0).toBeLessThan(50000) // Reasonable output size
    })

    it('should handle stress testing gracefully', () => {
      // Rapid successive renders to test stability
      expect(() => {
        for (let i = 0; i < 50; i++) {
          const { lastFrame } = render(React.createElement(InkTUI))
          lastFrame() // Force render
        }
      }).not.toThrow()
    })
  })
})