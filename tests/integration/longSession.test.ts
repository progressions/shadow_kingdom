/**
 * Long Session Integration Tests
 * Tests the application's ability to handle extended gaming sessions
 * with many messages, ensuring memory stays bounded and performance
 * remains acceptable.
 */

import { createMessage } from '../../src/types/Message'
import { 
  trimMessageBuffer, 
  addMessagesToBuffer,
  estimateBufferMemoryUsage,
  MAX_SCROLLBACK 
} from '../../src/utils/messageBuffer'

describe('Long Session Stability', () => {
  describe('100+ Command Session', () => {
    it('should handle 100 commands without memory issues', () => {
      let buffer: any[] = []
      
      // Simulate a long session with many commands
      for (let i = 0; i < 100; i++) {
        // Simulate a command and response
        const command = createMessage(`> command ${i}`)
        const response = createMessage(`Response to command ${i}`)
        
        buffer = addMessagesToBuffer(buffer, [command, response])
      }
      
      // After 100 commands (200 messages), buffer should not exceed limit
      expect(buffer.length).toBeLessThanOrEqual(MAX_SCROLLBACK)
      
      // Memory should stay bounded
      const usage = estimateBufferMemoryUsage(buffer)
      expect(usage.estimatedMB).toBeLessThan(0.2) // Under 200KB
    })
    
    it('should maintain message order during long session', () => {
      let buffer: any[] = []
      
      // Add many messages
      for (let i = 0; i < 300; i++) {
        buffer = addMessagesToBuffer(buffer, [createMessage(`Message ${i}`)])
      }
      
      // Should have exactly MAX_SCROLLBACK messages
      expect(buffer.length).toBe(300) // Since 300 < 500
      
      // Messages should be in order
      for (let i = 0; i < buffer.length - 1; i++) {
        const current = buffer[i].timestamp.getTime()
        const next = buffer[i + 1].timestamp.getTime()
        expect(next).toBeGreaterThanOrEqual(current)
      }
    })
  })
  
  describe('500+ Message Performance', () => {
    it('should handle 500 messages efficiently', () => {
      const startTime = Date.now()
      
      let buffer: any[] = []
      
      // Add exactly 500 messages
      for (let i = 0; i < 500; i++) {
        buffer = addMessagesToBuffer(buffer, [
          createMessage(`Test message ${i}`)
        ])
      }
      
      const endTime = Date.now()
      const elapsed = endTime - startTime
      
      expect(buffer.length).toBe(MAX_SCROLLBACK)
      expect(elapsed).toBeLessThan(100) // Should complete quickly
    })
    
    it('should handle 1000+ messages with trimming', () => {
      const startTime = Date.now()
      
      let buffer: any[] = []
      
      // Add 1000 messages (double the limit)
      for (let i = 0; i < 1000; i++) {
        buffer = addMessagesToBuffer(buffer, [
          createMessage(`Message ${i}`)
        ])
      }
      
      const endTime = Date.now()
      const elapsed = endTime - startTime
      
      // Should be trimmed to exactly MAX_SCROLLBACK
      expect(buffer.length).toBe(MAX_SCROLLBACK)
      
      // Should contain only the most recent 500 messages
      expect(buffer[0].content).toBe('Message 500')
      expect(buffer[499].content).toBe('Message 999')
      
      // Performance should still be good
      expect(elapsed).toBeLessThan(200)
    })
    
    it('should maintain performance during continuous addition', () => {
      let buffer: any[] = []
      const timings: number[] = []
      
      // Simulate continuous message addition over time
      for (let batch = 0; batch < 10; batch++) {
        const batchStart = Date.now()
        
        // Add 100 messages per batch
        for (let i = 0; i < 100; i++) {
          buffer = addMessagesToBuffer(buffer, [
            createMessage(`Batch ${batch} Message ${i}`)
          ])
        }
        
        const batchTime = Date.now() - batchStart
        timings.push(batchTime)
      }
      
      // Buffer should be at max capacity
      expect(buffer.length).toBe(MAX_SCROLLBACK)
      
      // Each batch should complete quickly
      timings.forEach(time => {
        expect(time).toBeLessThan(50)
      })
      
      // Performance should not degrade over time
      const firstBatchTime = timings[0]
      const lastBatchTime = timings[timings.length - 1]
      
      // Last batch should not be significantly slower than first
      // Allow for both being 0 (very fast) or similar times
      if (firstBatchTime > 0) {
        expect(lastBatchTime).toBeLessThan(firstBatchTime * 3)
      } else {
        expect(lastBatchTime).toBeLessThanOrEqual(10)
      }
    })
  })
  
  describe('Memory Usage Verification', () => {
    it('should keep memory usage bounded regardless of session length', () => {
      let buffer: any[] = []
      const memorySnapshots: number[] = []
      
      // Simulate a very long session
      for (let i = 0; i < 2000; i++) {
        buffer = addMessagesToBuffer(buffer, [
          createMessage(`Long session message ${i}`)
        ])
        
        // Take memory snapshots periodically
        if (i % 100 === 0) {
          const usage = estimateBufferMemoryUsage(buffer)
          memorySnapshots.push(usage.estimatedMB)
        }
      }
      
      // All snapshots should show bounded memory
      memorySnapshots.forEach(mb => {
        expect(mb).toBeLessThanOrEqual(0.1) // ~100KB max
      })
      
      // Memory should stabilize after reaching limit
      const lastFewSnapshots = memorySnapshots.slice(-5)
      const allSame = lastFewSnapshots.every(mb => 
        Math.abs(mb - lastFewSnapshots[0]) < 0.01
      )
      expect(allSame).toBe(true)
    })
    
    it('should handle rapid message bursts without memory spikes', () => {
      let buffer: any[] = []
      
      // Simulate rapid message burst (like verbose command output)
      const burstMessages = Array.from({ length: 200 }, (_, i) => 
        createMessage(`Burst message ${i}`)
      )
      
      const startMemory = estimateBufferMemoryUsage(buffer)
      buffer = addMessagesToBuffer(buffer, burstMessages)
      const endMemory = estimateBufferMemoryUsage(buffer)
      
      // Memory should increase but stay bounded
      expect(endMemory.estimatedMB).toBeLessThan(0.1)
      expect(buffer.length).toBe(200) // All messages fit in buffer
    })
    
    it('should recover from memory pressure gracefully', () => {
      // Start with a full buffer
      let buffer = Array.from({ length: MAX_SCROLLBACK }, (_, i) => 
        createMessage(`Initial ${i}`)
      )
      
      const initialMemory = estimateBufferMemoryUsage(buffer)
      
      // Add many more messages (simulating memory pressure)
      for (let i = 0; i < 500; i++) {
        buffer = addMessagesToBuffer(buffer, [
          createMessage(`Additional ${i}`)
        ])
      }
      
      const finalMemory = estimateBufferMemoryUsage(buffer)
      
      // Memory should not have increased
      expect(finalMemory.estimatedMB).toBeCloseTo(initialMemory.estimatedMB, 2)
      
      // Buffer should still be at limit
      expect(buffer.length).toBe(MAX_SCROLLBACK)
      
      // Should contain only the most recent messages
      expect(buffer[buffer.length - 1].content).toContain('Additional')
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle empty messages gracefully', () => {
      let buffer: any[] = []
      
      // Add some empty messages
      buffer = addMessagesToBuffer(buffer, [
        createMessage(''),
        createMessage(''),
        createMessage('Normal message'),
        createMessage('')
      ])
      
      expect(buffer.length).toBe(4)
      expect(buffer[2].content).toBe('Normal message')
    })
    
    it('should handle very long messages', () => {
      let buffer: any[] = []
      
      // Create a very long message (1KB+)
      const longContent = 'x'.repeat(1000)
      buffer = addMessagesToBuffer(buffer, [createMessage(longContent)])
      
      expect(buffer.length).toBe(1)
      expect(buffer[0].content.length).toBe(1000)
      
      // Even with long messages, buffer should respect count limit
      for (let i = 0; i < 600; i++) {
        buffer = addMessagesToBuffer(buffer, [
          createMessage(`Long msg ${i}: ${longContent}`)
        ])
      }
      
      expect(buffer.length).toBe(MAX_SCROLLBACK)
    })
  })
})