import {
  trimMessageBuffer,
  addMessagesToBuffer,
  getBufferStats,
  estimateBufferMemoryUsage,
  MAX_SCROLLBACK
} from '../../src/utils/messageBuffer'
import { createMessage } from '../../src/types/Message'

describe('Message Buffer Management', () => {
  describe('trimMessageBuffer', () => {
    it('should not trim when under limit', () => {
      const messages = Array.from({ length: 100 }, (_, i) => 
        createMessage(`Message ${i}`)
      )
      const trimmed = trimMessageBuffer(messages)
      expect(trimmed.length).toBe(100)
      expect(trimmed).toEqual(messages)
    })
    
    it('should trim to MAX_SCROLLBACK when over limit', () => {
      const messages = Array.from({ length: 600 }, (_, i) => 
        createMessage(`Message ${i}`)
      )
      const trimmed = trimMessageBuffer(messages)
      expect(trimmed.length).toBe(MAX_SCROLLBACK)
      // Should keep the most recent messages
      expect(trimmed[0].content).toBe('Message 100')
      expect(trimmed[499].content).toBe('Message 599')
    })
    
    it('should handle exactly MAX_SCROLLBACK messages', () => {
      const messages = Array.from({ length: MAX_SCROLLBACK }, (_, i) => 
        createMessage(`Message ${i}`)
      )
      const trimmed = trimMessageBuffer(messages)
      expect(trimmed.length).toBe(MAX_SCROLLBACK)
      expect(trimmed).toEqual(messages)
    })
  })
  
  describe('addMessagesToBuffer', () => {
    it('should add messages and auto-trim', () => {
      const buffer = Array.from({ length: 490 }, (_, i) => 
        createMessage(`Old ${i}`)
      )
      const newMessages = Array.from({ length: 20 }, (_, i) => 
        createMessage(`New ${i}`)
      )
      
      const result = addMessagesToBuffer(buffer, newMessages)
      expect(result.length).toBe(MAX_SCROLLBACK)
      // Should have trimmed 10 old messages from the beginning
      expect(result[0].content).toBe('Old 10')
      expect(result[479].content).toBe('Old 489')
      expect(result[480].content).toBe('New 0')
      expect(result[499].content).toBe('New 19')
    })
    
    it('should handle empty buffer', () => {
      const buffer: any[] = []
      const newMessages = [createMessage('Test')]
      
      const result = addMessagesToBuffer(buffer, newMessages)
      expect(result.length).toBe(1)
      expect(result[0].content).toBe('Test')
    })
  })
  
  describe('getBufferStats', () => {
    it('should calculate stats for empty buffer', () => {
      const stats = getBufferStats([])
      expect(stats.count).toBe(0)
      expect(stats.isFull).toBe(false)
      expect(stats.percentFull).toBe(0)
      expect(stats.oldestMessageAge).toBeNull()
    })
    
    it('should calculate stats for partial buffer', () => {
      const messages = Array.from({ length: 250 }, () => 
        createMessage('Test')
      )
      const stats = getBufferStats(messages)
      expect(stats.count).toBe(250)
      expect(stats.isFull).toBe(false)
      expect(stats.percentFull).toBe(50)
      expect(stats.oldestMessageAge).toBeGreaterThanOrEqual(0)
    })
    
    it('should detect full buffer', () => {
      const messages = Array.from({ length: MAX_SCROLLBACK }, () => 
        createMessage('Test')
      )
      const stats = getBufferStats(messages)
      expect(stats.count).toBe(MAX_SCROLLBACK)
      expect(stats.isFull).toBe(true)
      expect(stats.percentFull).toBe(100)
    })
  })
  
  describe('estimateBufferMemoryUsage', () => {
    it('should estimate memory for empty buffer', () => {
      const usage = estimateBufferMemoryUsage([])
      expect(usage.messageCount).toBe(0)
      expect(usage.estimatedBytes).toBe(0)
      expect(usage.estimatedMB).toBe(0)
    })
    
    it('should estimate memory for full buffer', () => {
      const messages = Array.from({ length: MAX_SCROLLBACK }, () => 
        createMessage('Test message with some content')
      )
      const usage = estimateBufferMemoryUsage(messages)
      expect(usage.messageCount).toBe(MAX_SCROLLBACK)
      expect(usage.estimatedBytes).toBe(MAX_SCROLLBACK * 200)
      expect(usage.estimatedMB).toBeCloseTo(0.0954, 2) // ~0.1MB for 500 messages
    })
    
    it('should show memory usage stays bounded', () => {
      // Even with 1000 messages attempted, memory should be bounded
      const messages = Array.from({ length: 1000 }, () => 
        createMessage('Test')
      )
      const trimmed = trimMessageBuffer(messages)
      const usage = estimateBufferMemoryUsage(trimmed)
      
      expect(usage.messageCount).toBe(MAX_SCROLLBACK)
      expect(usage.estimatedMB).toBeLessThan(0.2) // Should stay under 0.2MB
    })
  })
  
  describe('Performance Tests', () => {
    it('should handle rapid message addition efficiently', () => {
      const startTime = Date.now()
      let buffer: any[] = []
      
      // Simulate adding 1000 messages rapidly
      for (let i = 0; i < 1000; i++) {
        const newMsg = [createMessage(`Message ${i}`)]
        buffer = addMessagesToBuffer(buffer, newMsg)
      }
      
      const endTime = Date.now()
      const elapsed = endTime - startTime
      
      expect(buffer.length).toBe(MAX_SCROLLBACK)
      expect(elapsed).toBeLessThan(100) // Should complete in under 100ms
    })
    
    it('should maintain performance with full buffer operations', () => {
      // Create a full buffer
      let buffer = Array.from({ length: MAX_SCROLLBACK }, (_, i) => 
        createMessage(`Initial ${i}`)
      )
      
      const startTime = Date.now()
      
      // Add 100 more messages (forcing trimming each time)
      for (let i = 0; i < 100; i++) {
        buffer = addMessagesToBuffer(buffer, [createMessage(`New ${i}`)])
      }
      
      const endTime = Date.now()
      const elapsed = endTime - startTime
      
      expect(buffer.length).toBe(MAX_SCROLLBACK)
      expect(elapsed).toBeLessThan(50) // Should stay fast even with trimming
    })
  })
})