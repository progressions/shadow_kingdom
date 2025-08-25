export interface Message {
  id: string
  content: string
  timestamp: Date
}

export function createMessage(content: string, id?: string): Message {
  return {
    id: id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content,
    timestamp: new Date()
  }
}

export function messagesToStrings(messages: Message[]): string[] {
  return messages.map(m => m.content)
}